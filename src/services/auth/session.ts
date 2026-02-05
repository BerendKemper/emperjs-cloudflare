import { jwtVerify, SignJWT } from "jose";

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const encodeSecret = (value: string): Uint8Array =>
  new TextEncoder().encode(value);

export interface SessionPayload {
  sub: string;
  roles: string[];
  provider: string;
}

export interface VerifiedSession {
  userId: string;
  roles: string[];
  provider: string;
}

export async function createSessionToken(
  payload: SessionPayload,
  secret: string
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ roles: payload.roles, provider: payload.provider })
    .setProtectedHeader({ alg: `HS256`, typ: `JWT` })
    .setSubject(payload.sub)
    .setIssuedAt(now)
    .setExpirationTime(now + SESSION_TTL_SECONDS)
    .sign(encodeSecret(secret));
}

export function createSessionCookie(token: string): string {
  return [
    `session=${token}`,
    `HttpOnly`,
    `Secure`,
    `Path=/`,
    `SameSite=Lax`,
    `Max-Age=${SESSION_TTL_SECONDS}`
  ].join(`; `);
}

const parseCookieHeader = (header: string | null): Record<string, string> => {
  if (!header) return {};
  return header
    .split(`;`)
    .map(part => part.trim())
    .filter(Boolean)
    .reduce<Record<string, string>>((acc, part) => {
      const idx = part.indexOf(`=`);
      if (idx <= 0) return acc;
      const key = part.slice(0, idx);
      const value = part.slice(idx + 1);
      acc[key] = value;
      return acc;
    }, {});
};

export async function verifySessionFromRequest(
  request: Request,
  secret: string
): Promise<VerifiedSession | null> {
  const cookies = parseCookieHeader(request.headers.get(`Cookie`));
  const token = cookies.session;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      algorithms: [`HS256`],
    });

    const userId = payload.sub;
    const roles = Array.isArray(payload.roles)
      ? payload.roles.filter(role => typeof role === `string`)
      : [];
    const provider =
      typeof payload.provider === `string` ? payload.provider : `unknown`;

    if (!userId) return null;

    return {
      userId,
      roles,
      provider,
    };
  } catch {
    return null;
  }
}
