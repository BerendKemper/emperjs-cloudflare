import { Handler } from "../../app/router";
import {
  createSessionCookie,
  createSessionToken,
  verifySessionFromRequest,
} from "../../services/auth/session";
import { getUserById } from "../../services/users/d1";

const normalizeRoles = (roles: string[]) =>
  [...new Set(roles)].sort();

export const handleSessionStatus: Handler = async (req, env) => {
  const session = await verifySessionFromRequest(req, env.SESSION_SECRET);

  if (!session) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { "Content-Type": `application/json` } }
    );
  }

  const user = await getUserById(env, session.userId);
  const roles = user?.roles?.length ? user.roles : session.roles;
  const responseHeaders: HeadersInit = { "Content-Type": `application/json` };
  const normalizedSessionRoles = normalizeRoles(session.roles);
  const normalizedUserRoles = normalizeRoles(roles);

  if (
    normalizedSessionRoles.length !== normalizedUserRoles.length ||
    normalizedSessionRoles.some((role, index) => role !== normalizedUserRoles[index])
  ) {
    const token = await createSessionToken(
      { sub: session.userId, roles, provider: session.provider },
      env.SESSION_SECRET
    );
    responseHeaders["Set-Cookie"] = createSessionCookie(token);
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      userId: session.userId,
      roles,
      provider: session.provider,
      displayName: user?.display_name ?? null,
    }),
    { status: 200, headers: responseHeaders }
  );
};
