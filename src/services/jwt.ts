import { SignJWT, jwtVerify } from "jose";

export async function signJWT(payload: object, secret: string) {
  const alg = `HS256`;
  return new SignJWT(payload)
    .setProtectedHeader({ alg })
    .setIssuedAt()
    .setExpirationTime(`2h`)
    .sign(new TextEncoder().encode(secret));
}

export async function verifyJWT(token: string, secret: string) {
  return jwtVerify(token, new TextEncoder().encode(secret));
}
