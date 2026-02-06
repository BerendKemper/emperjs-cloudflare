
import { Request } from "../../../app/router";
import { createSessionCookie, createSessionToken } from "../session";
import { OAuthConflictError } from "../../users/utils";
import { upsertUserFromOAuth } from "../../users/d1";
import { resolveReturnTo } from "../../../routes/auth/redirect";
import { VerifyObject } from "../jwt/types";
import { Environment } from "../../../types/env";
import { OidcProviderScheme, OidcProvider } from "./providers";
import { verifyOidcToken } from "./verify";

export async function handleOidcCallback(scheme: OidcProviderScheme, req: Request, env: Environment) {
  try {
    const code = req._url.searchParams.get(`code`);
    const state = req._url.searchParams.get(`state`);
    if (!code) return new Response(`Missing code`, { status: 400 });

    const tokenRes = await fetch(scheme.url, {
      method: `POST`,
      headers: { "Content-Type": `application/x-www-form-urlencoded` },
      body: new URLSearchParams({
        code,
        client_id: scheme.client_id,
        client_secret: scheme.client_secret,
        redirect_uri: `${req._url.origin}/${scheme.redirect_uri}`,
        grant_type: `authorization_code`,
      }),
    });

    if (!tokenRes.ok) {
      return new Response(`Failed to exchange code`, { status: 502 });
    }

    const tokens = await tokenRes.json() as VerifyObject;
    const idToken = tokens.id_token;
    if (!idToken) return new Response(`Missing id_token`, { status: 502 });

    const payload = await verifyOidcToken(idToken, scheme);

    const email = (payload.email || payload.preferred_username) as string | undefined;
    const emailVerified = payload.email_verified;
    const providerUserId = (payload.oid || payload.sub) as string | undefined;

    if (!email || !providerUserId) {
      return new Response(`Missing email`, { status: 400 });
    }

    if (emailVerified === false) {
      return new Response(`Email not verified`, { status: 403 });
    }

    let user: { id: string; roles: string[] };
    try {
      user = await upsertUserFromOAuth(env, {
        email,
        provider: scheme.provider as OidcProvider,
        providerUserId,
      });
    } catch (error) {
      if (error instanceof OAuthConflictError) {
        return new Response(error.message, { status: 409 });
      }
      throw error;
    }

    const token = await createSessionToken(
      { sub: user.id, roles: user.roles, provider: scheme.provider },
      env.SESSION_SECRET
    );

    return new Response(null, {
      status: 302,
      headers: {
        Location: resolveReturnTo(state, env.FRONTEND_ORIGIN),
        "Set-Cookie": createSessionCookie(token),
      },
    });
  } catch {
    return new Response(`Authentication failed`, { status: 500 });
  }
};
