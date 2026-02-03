import { URLSearchParams, Response, fetch } from "@cloudflare/workers-types";
import { Handler } from "../../app/router";
import { verifyGoogleIdToken } from "../../services/auth/oidc";
import { upsertUserFromOAuth } from "../../services/users";
import { VerifyObject } from "./types";

export const handleGoogleCallback: Handler = async (req, env) => {
  const code = req._url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  const redirectUri = `${req._url.origin}/auth/google/callback`;
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: env.GOOGLE_CLIENT_ID,
      client_secret: env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!tokenRes.ok) {
    return new Response("Failed to exchange code", { status: 502 });
  }

  const tokens = await tokenRes.json() as VerifyObject;
  const idToken = tokens.id_token;
  if (!idToken) return new Response("Missing id_token", { status: 502 });

  const payload = await verifyGoogleIdToken(idToken, env.GOOGLE_CLIENT_ID);

  const email = payload.email as string | undefined;
  const emailVerified = payload.email_verified;
  const providerUserId = payload.sub as string | undefined;

  if (!email || !providerUserId) {
    return new Response("Missing email", { status: 400 });
  }

  if (!emailVerified) {
    return new Response("Email not verified", { status: 403 });
  }

  const user = await upsertUserFromOAuth(env, {
    email,
    provider: "google",
    providerUserId,
  });

  return new Response(
    JSON.stringify({ status: "ok", userId: user.id, roles: user.roles }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
};
