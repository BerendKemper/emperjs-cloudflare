import { createRemoteJWKSet, decodeJwt, jwtVerify, JWTPayload } from "jose";

import { Environment } from "../../types/env";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);
const MICROSOFT_JWKS = createRemoteJWKSet(
  new URL("https://login.microsoftonline.com/common/discovery/v2.0/keys")
);

export async function verifyGoogleIdToken(
  token: string,
  clientId: string
): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, GOOGLE_JWKS, {
    audience: clientId,
    issuer: ["https://accounts.google.com", "accounts.google.com"],
  });
  return payload;
}

export async function verifyMicrosoftIdToken(
  token: string,
  clientId: string
): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, MICROSOFT_JWKS, {
    audience: clientId,
  });
  return payload;
}

export async function verifyOidcToken(
  token: string,
  env: Environment
): Promise<JWTPayload> {
  const { iss } = decodeJwt(token);
  if (iss?.includes("accounts.google.com")) {
    return verifyGoogleIdToken(token, env.GOOGLE_CLIENT_ID);
  }
  if (iss?.includes("login.microsoftonline.com")) {
    return verifyMicrosoftIdToken(token, env.MICROSOFT_CLIENT_ID);
  }
  throw new Error("Unsupported token issuer");
}
