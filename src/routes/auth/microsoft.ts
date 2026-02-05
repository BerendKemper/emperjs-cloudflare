import { Handler } from "../../app/router";
import { verifyMicrosoftIdToken } from "../../services/auth/oidc";
import { createSessionCookie, createSessionToken } from "../../services/auth/session";
import { OAuthConflictError, upsertUserFromOAuth } from "../../services/users";
import { resolveReturnTo } from "./redirect";
import { VerifyObject } from "./types";

export const handleMicrosoftCallback: Handler = async (req, env) => {
  const code = req._url.searchParams.get(`code`);
  const state = req._url.searchParams.get(`state`);
  if (!code) return new Response(`Missing code`, { status: 400 });

  const redirectUri = `${req._url.origin}/auth/microsoft/callback`;
  const tokenRes = await fetch(
    `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
    {
      method: `POST`,
      headers: { "Content-Type": `application/x-www-form-urlencoded` },
      body: new URLSearchParams({
        client_id: env.MICROSOFT_CLIENT_ID,
        client_secret: env.MICROSOFT_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
        grant_type: `authorization_code`,
      }),
    }
  );

  if (!tokenRes.ok) {
    return new Response(`Failed to exchange code`, { status: 502 });
  }

  const tokens = await tokenRes.json() as VerifyObject;
  const idToken = tokens.id_token;
  if (!idToken) return new Response(`Missing id_token`, { status: 502 });

  const payload = await verifyMicrosoftIdToken(
    idToken,
    env.MICROSOFT_CLIENT_ID
  );

  const email = (payload.email || payload.preferred_username) as
    | string
    | undefined;
  const providerUserId = (payload.oid || payload.sub) as string | undefined;

  if (!email || !providerUserId) {
    return new Response(`Missing email`, { status: 400 });
  }

  let user: { id: string; roles: string[] };
  try {
    user = await upsertUserFromOAuth(env, {
      email,
      provider: `microsoft`,
      providerUserId,
    });
  } catch (error) {
    if (error instanceof OAuthConflictError) {
      return new Response(error.message, { status: 409 });
    }
    throw error;
  }

  const token = await createSessionToken(
    { sub: user.id, roles: user.roles, provider: `microsoft` },
    env.SESSION_SECRET
  );

  return new Response(null, {
    status: 302,
    headers: {
      Location: resolveReturnTo(state, env.FRONTEND_ORIGIN),
      "Set-Cookie": createSessionCookie(token),
    },
  });
};
