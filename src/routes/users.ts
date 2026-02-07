import { Handler } from "../app/router";
import type { JWTPayload } from "jose";
import { verifyOidcFromJwtToken } from "../services/auth/oidc/verify";
import { verifySessionFromRequest } from "../services/auth/session";
import { getUserByEmail, getUserById, listUsers, updateUserDisplayName } from "../services/users/d1";

const extractEmail = (payload: JWTPayload) => {
  if (typeof payload.email === `string`) return payload.email;
  if (typeof payload.preferred_username === `string`) return payload.preferred_username;
  return null;
};

export const handleUsersList: Handler = async (request, env) => {
  const authHeader = request.headers.get(`Authorization`);
  if (!authHeader?.startsWith(`Bearer `)) {
    return new Response(`Missing token`, { status: 401 });
  }

  const token = authHeader.replace(`Bearer `, ``);
  let payload: JWTPayload;

  try {
    payload = await verifyOidcFromJwtToken(token);
  } catch {
    return new Response(`Invalid token`, { status: 401 });
  }

  const email = extractEmail(payload);
  const emailVerified = payload.email_verified;
  if (!email || emailVerified === false) {
    return new Response(`Forbidden`, { status: 403 });
  }

  const user = await getUserByEmail(env, email);
  if (!user || user.is_active !== 1 || !user.roles.includes(`admin`)) {
    return new Response(`Forbidden`, { status: 403 });
  }

  const users = await listUsers(env);
  return new Response(JSON.stringify({ users }), {
    status: 200,
    headers: { "Content-Type": `application/json` },
  });
};

const MAX_DISPLAY_NAME_LENGTH = 80;

export const handleUpdateDisplayName: Handler = async (request, env) => {
  const session = await verifySessionFromRequest(request, env.SESSION_SECRET);
  if (!session) {
    return new Response(`Unauthorized`, { status: 401 });
  }

  const user = await getUserById(env, session.userId);
  if (!user || user.is_active !== 1) {
    return new Response(`Forbidden`, { status: 403 });
  }

  let payload: { displayName?: string | null };
  try {
    payload = await request.json();
  } catch {
    return new Response(`Invalid JSON`, { status: 400 });
  }

  if (!payload || typeof payload !== `object`) {
    return new Response(`Invalid payload`, { status: 400 });
  }

  if (!Object.prototype.hasOwnProperty.call(payload, `displayName`)) {
    return new Response(`Missing displayName`, { status: 400 });
  }

  const { displayName } = payload;
  if (displayName === null) {
    await updateUserDisplayName(env, session.userId, null);
  } else if (typeof displayName === `string`) {
    const trimmed = displayName.trim();
    if (!trimmed) {
      return new Response(`Display name cannot be empty`, { status: 400 });
    }
    if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
      return new Response(`Display name too long`, { status: 400 });
    }
    await updateUserDisplayName(env, session.userId, trimmed);
  } else {
    return new Response(`Invalid displayName`, { status: 400 });
  }

  return new Response(
    JSON.stringify({ displayName: displayName === null ? null : displayName.trim() }),
    { status: 200, headers: { "Content-Type": `application/json` } }
  );
};
