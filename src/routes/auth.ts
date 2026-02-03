
import type { Handler } from "../app/router";
import { verifyOidcToken } from "../services/auth/oidc";

export const handleAuth: Handler = async (request, env, ctx) => {
  const authHeader = request.headers.get(`Authorization`);

  if (!authHeader?.startsWith(`Bearer `)) {
    return new Response(`Missing token`, { status: 401 });
  }

  const token = authHeader.split(` `)[1];

  const payload = await verifyOidcToken(token, env);

  // Example: check if email is in D1 admin list
  const email = payload.email;
  const adminEmails = [`dad@example.com`]; // or fetch from D1
  if (!adminEmails.includes(email)) {
    return new Response(`Forbidden`, { status: 403 });
  }

  return new Response(JSON.stringify({ message: `Authorized` }), {
    status: 200,
    headers: { "Content-Type": `application/json` },
  });
};
