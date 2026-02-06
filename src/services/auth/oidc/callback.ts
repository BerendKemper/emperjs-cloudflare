
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
  const redirectToReturn = (
    state: string | null,
    options?: { error?: string; errorDescription?: string; headers?: HeadersInit }
  ): Response => {
    const location = new URL(resolveReturnTo(state, env.FRONTEND_ORIGIN));
    if (options?.error) {
      location.searchParams.set(`authError`, options.error);
      if (options.errorDescription) {
        location.searchParams.set(`authErrorDescription`, options.errorDescription);
      }
    }

    return new Response(null, {
      status: 302,
      headers: {
        Location: location.toString(),
        ...(options?.headers ?? {}),
      },
    });
  };

  try {
    const code = req._url.searchParams.get(`code`);
    const state = req._url.searchParams.get(`state`);
    if (!code) {
      return redirectToReturn(state, {
        error: `missing_code`,
        errorDescription: `Missing code`,
      });
    }

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
      return redirectToReturn(state, {
        error: `token_exchange_failed`,
        errorDescription: `Failed to exchange code`,
      });
    }

    const tokens = await tokenRes.json() as VerifyObject;
    const idToken = tokens.id_token;
    if (!idToken) {
      return redirectToReturn(state, {
        error: `missing_id_token`,
        errorDescription: `Missing id_token`,
      });
    }

    const payload = await verifyOidcToken(idToken, scheme);

    const email = (payload.email || payload.preferred_username) as string | undefined;
    const emailVerified = payload.email_verified;
    const providerUserId = (payload.oid || payload.sub) as string | undefined;
    const displayName = (() => {
      if (typeof payload.name === `string` && payload.name.trim()) {
        return payload.name.trim();
      }
      const givenName = typeof payload.given_name === `string` ? payload.given_name.trim() : ``;
      const familyName = typeof payload.family_name === `string` ? payload.family_name.trim() : ``;
      const combined = `${givenName} ${familyName}`.trim();
      return combined || null;
    })();

    if (!email || !providerUserId) {
      return redirectToReturn(state, {
        error: `missing_identity`,
        errorDescription: `Missing email`,
      });
    }

    if (emailVerified === false) {
      return redirectToReturn(state, {
        error: `email_not_verified`,
        errorDescription: `Email not verified`,
      });
    }

    let user: { id: string; roles: string[] };
    try {
      user = await upsertUserFromOAuth(env, {
        email,
        displayName,
        provider: scheme.provider as OidcProvider,
        providerUserId,
      });
    } catch (error) {
      if (error instanceof OAuthConflictError) {
        return redirectToReturn(state, {
          error: `oauth_conflict`,
          errorDescription: error.message,
        });
      }
      throw error;
    }

    const token = await createSessionToken(
      { sub: user.id, roles: user.roles, provider: scheme.provider },
      env.SESSION_SECRET
    );

    return redirectToReturn(state, {
      headers: {
        "Set-Cookie": createSessionCookie(token),
      },
    });
  } catch {
    return redirectToReturn(req._url.searchParams.get(`state`), {
      error: `authentication_failed`,
      errorDescription: `Authentication failed`,
    });
  }
};
