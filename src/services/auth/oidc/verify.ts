
import { decodeJwt, jwtVerify, JWTPayload } from "jose";
import { OidcProviderScheme, oidcSchemes } from "./providers";

export async function verifyOidcToken(token: string, scheme: OidcProviderScheme): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, scheme.jwks, scheme.jwtVerifyOptions);
  return payload;
}

export async function verifyOidcFromJwtToken(token: string) {
  const { iss } = decodeJwt(token);
  if (iss?.includes(`accounts.google.com`)) {
    return verifyOidcToken(token, oidcSchemes.google);
  }
  if (iss?.includes(`login.microsoftonline.com`)) {
    return verifyOidcToken(token, oidcSchemes.microsoft);
  }
  throw new Error(`Unsupported token issuer`);
}
