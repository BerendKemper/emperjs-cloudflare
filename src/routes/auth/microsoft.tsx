
import { jwtVerify } from "jose";

import { Handler } from "../../app/router";
import { Response, URLSearchParams, fetch } from "@cloudflare/workers-types";

export const handleMicrosoftAuth: Handler = async (req, env) => {
  const code = req._url.searchParams.get("code");
  if (!code) return new Response("Missing code", { status: 400 });

  const tokenRes = await fetch(
    "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID,
        client_secret: env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: "https://api.emperjs.com/auth/microsoft/callback",
        grant_type: "authorization_code",
      }),
    }
  );

  const tokens = await tokenRes.json();
  const idToken = tokens.id_token;

  const payload = await verifyMicrosoftJWT(idToken);

  const email = payload.email || payload.preferred_username;

  const role = await getUserRole(env, email);
  if (!role) return new Response("Forbidden", { status: 403 });

  return new Response("Authorized", { status: 200 });
};
