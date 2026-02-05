
import { Environment } from "../types/env";

export type OAuthProvider = `google` | `microsoft`;

export interface OAuthProfile {
  email: string;
  provider: OAuthProvider;
  providerUserId: string;
  roles?: string[];
}

export interface UserRecord {
  id: string;
  email: string;
  provider: OAuthProvider;
  provider_user_id: string;
  roles: string[];
  is_active: number;
  created_at: number;
  updated_at: number;
}

export class OAuthConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = `OAuthConflictError`;
  }
}

const parseRoles = (roles: string | null | undefined): string[] => {
  if (!roles) return [];
  try {
    const parsed = JSON.parse(roles);
    return Array.isArray(parsed) ? parsed.filter(role => typeof role === `string`) : [];
  } catch {
    return [];
  }
};

export async function upsertUserFromOAuth(
  env: Environment,
  profile: OAuthProfile
) {
  const now = Date.now();
  const existing = await env.USERS.prepare(
    `SELECT id, roles FROM users WHERE provider = ? AND provider_user_id = ?`
  )
    .bind(profile.provider, profile.providerUserId)
    .first<{ id: string; roles: string }>();

  if (!existing) {
    const byEmail = await env.USERS.prepare(
      `SELECT id, provider, provider_user_id, roles FROM users WHERE email = ? LIMIT 1`
    )
      .bind(profile.email)
      .first<{
        id: string;
        provider: OAuthProvider;
        provider_user_id: string;
        roles: string;
      }>();

    if (byEmail) {
      if (byEmail.provider !== profile.provider) {
        throw new OAuthConflictError(
          `Email already linked to a different provider`
        );
      }

      if (byEmail.provider_user_id !== profile.providerUserId) {
        throw new OAuthConflictError(
          `Email already linked to a different provider account`
        );
      }

      await env.USERS.prepare(
        `UPDATE users SET updated_at = ? WHERE id = ?`
      )
        .bind(now, byEmail.id)
        .run();

      return { id: byEmail.id, roles: parseRoles(byEmail.roles) };
    }

    const id = crypto.randomUUID();
    const userRoles = profile.roles ?? [`user`];
    const roles = JSON.stringify(userRoles);
    await env.USERS.prepare(
      `INSERT INTO users (id, email, provider, provider_user_id, roles, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(
        id,
        profile.email,
        profile.provider,
        profile.providerUserId,
        roles,
        now,
        now
      )
      .run();
    return { id, roles: userRoles };
  }

  await env.USERS.prepare(
    `UPDATE users SET email = ?, updated_at = ? WHERE id = ?`
  )
    .bind(profile.email, now, existing.id)
    .run();

  return { id: existing.id, roles: parseRoles(existing.roles) };
}

export async function getUserByEmail(env: Environment, email: string) {
  const user = await env.USERS.prepare(
    `SELECT id, email, provider, provider_user_id, roles, is_active, created_at, updated_at
     FROM users WHERE email = ? LIMIT 1`
  )
    .bind(email)
    .first<{
      id: string;
      email: string;
      provider: OAuthProvider;
      provider_user_id: string;
      roles: string;
      is_active: number;
      created_at: number;
      updated_at: number;
    }>();

  if (!user) return null;

  return {
    ...user,
    roles: parseRoles(user.roles),
  } satisfies UserRecord;
}

export async function listUsers(env: Environment): Promise<UserRecord[]> {
  const results = await env.USERS.prepare(
    `SELECT id, email, provider, provider_user_id, roles, is_active, created_at, updated_at
     FROM users ORDER BY created_at DESC`
  ).all<{
    id: string;
    email: string;
    provider: OAuthProvider;
    provider_user_id: string;
    roles: string;
    is_active: number;
    created_at: number;
    updated_at: number;
  }>();

  return results.results.map(user => ({
    ...user,
    roles: parseRoles(user.roles),
  }));
}
