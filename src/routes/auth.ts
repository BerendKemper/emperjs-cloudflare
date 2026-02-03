
import type { Handler, Request } from "../app/router";
import { Response } from "@cloudflare/workers-types";
import { verifyJWT } from "../services/jwt";

export const handleAuth: Handler = async (request, env, ctx) => {
  const authHeader = request.headers.get(`Authorization`);

  if (!authHeader?.startsWith(`Bearer `)) {
    return new Response(`Missing token`, { status: 401 });
  }

  const token = authHeader.split(` `)[1];

  // Verify JWT token from Google or Microsoft
  const payload = await verifyJWT(token);

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