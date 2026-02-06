import { Handler } from "../app/router";
import type { JWTPayload } from "jose";
import { verifyOidcFromJwtToken } from "../services/auth/oidc/verify";
import { getUserByEmail, listUsers } from "../services/users/d1";

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
