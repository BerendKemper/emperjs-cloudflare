



import { jwtVerify } from "jose"; // lightweight lib for Workers

const GOOGLE_JWKS_URL = `https://www.googleapis.com/oauth2/v3/certs`;
const MICROSOFT_JWKS_URL = `https://login.microsoftonline.com/common/discovery/v2.0/keys`;

export async function verifyJWT(token: string) {
  // For brevity: fetch JWKS and verify signature
  // In production, cache JWKS to avoid refetch on every request
  const JWKS = GOOGLE_JWKS_URL; // or MICROSOFT_JWKS_URL depending on provider

  const { payload } = await jwtVerify(token /* your JWKS key */);

  // Validate standard claims: iss, aud, exp
  return payload;
}




// src/services/jwt.ts
import * as jose from 'jose';

export async function signJWT(payload: object, secret: string) {
  const alg = `HS256`;
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(`2h`)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyJWT(token: string, secret: string) {
  return jose.jwtVerify(token, new TextEncoder().encode(secret));
}

