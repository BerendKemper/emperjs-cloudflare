
import { env } from "../../../types/env";
import { createRemoteJWKSet, JWTVerifyOptions } from "jose";

export interface OidcProviderScheme {
  provider: string;
  url: string;
  redirect_uri: string;
  client_id: string;
  client_secret: string;
  jwks: ReturnType<typeof createRemoteJWKSet>;
  jwtVerifyOptions: JWTVerifyOptions
}

export const oidcSchemes = {
  google: {
    provider: `google`,
    url: `https://oauth2.googleapis.com/token`,
    redirect_uri: `auth/google/callback`,
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    jwks: createRemoteJWKSet(new URL(`https://www.googleapis.com/oauth2/v3/certs`)),
    jwtVerifyOptions: {
      audience: env.GOOGLE_CLIENT_ID,
      issuer: [`https://accounts.google.com`, `accounts.google.com`],
    }
  },
  microsoft: {
    provider: `microsoft`,
    url: `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
    redirect_uri: `auth/microsoft/callback`,
    client_id: env.MICROSOFT_CLIENT_ID,
    client_secret: env.MICROSOFT_CLIENT_SECRET,
    jwks: createRemoteJWKSet(new URL(`https://login.microsoftonline.com/common/discovery/v2.0/keys`)),
    jwtVerifyOptions: {
      audience: env.MICROSOFT_CLIENT_ID
    }
  }
} as const satisfies Record<string, OidcProviderScheme>;

type Schemes = typeof oidcSchemes;
export type OidcProvider = Schemes[keyof Schemes][`provider`];
