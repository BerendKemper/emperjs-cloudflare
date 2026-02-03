

import { jwtVerify } from "jose";

import { Handler } from "../../app/router";
import { Response, URLSearchParams, fetch } from "@cloudflare/workers-types";

export async function verifyGoogleJWT(idToken: string, clientId: string) {
  // Fetch Google JWKS (public keys)
  const res = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  const jwks = await res.json();

  // jose supports JWKS import
  const { payload } = await jwtVerify(idToken, await importJWK(jwks.keys[0], 'RS256'), {
    audience: clientId,
  });

  return payload;
}

export const handleGoogleCallback: Handler = async (req, env) => {
  const code = req._url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: "https://api.emperjs.com/auth/google/callback",
      grant_type: "authorization_code",
    }),
  });

  const tokens = await tokenRes.json();
  const idToken = tokens.id_token;

  // Verify token
  const payload = await verifyGoogleJWT(idToken);

  // Example payload fields
  const email = payload.email;
  const emailVerified = payload.email_verified;

  if (!emailVerified) {
    return new Response("Email not verified", { status: 403 });
  }

  // 🔐 authorization (your logic)
  const role = await getUserRole(env, email);
  if (!role) return new Response("Forbidden", { status: 403 });

  // Issue your own session (cookie / JWT)
  return new Response("Authorized", { status: 200 });
};
