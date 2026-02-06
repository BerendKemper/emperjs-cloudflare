import { Handler } from "../../app/router";
import { verifySessionFromRequest } from "../../services/auth/session";
import { getUserById } from "../../services/users/d1";

export const handleSessionStatus: Handler = async (req, env) => {
  const session = await verifySessionFromRequest(req, env.SESSION_SECRET);

  if (!session) {
    return new Response(
      JSON.stringify({ authenticated: false }),
      { status: 200, headers: { "Content-Type": `application/json` } }
    );
  }

  return new Response(
    JSON.stringify({
      authenticated: true,
      userId: session.userId,
      roles: session.roles,
      provider: session.provider,
      displayName: (await getUserById(env, session.userId))?.display_name ?? null,
    }),
    { status: 200, headers: { "Content-Type": `application/json` } }
  );
};
