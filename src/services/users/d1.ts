
import { Environment } from "../../types/env";
import { AuthProvider, AuthProfile, UserRecord } from "./types";
import { normalizeEmail, OAuthConflictError, isUniqueConstraintError } from "./utils";

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
  profile: AuthProfile
) {
  const normalizedEmail = normalizeEmail(profile.email);
  const now = Date.now();
  const existing = await env.USERS.prepare(
    `SELECT id, roles FROM users WHERE provider = ? AND provider_user_id = ?`
  )
    .bind(profile.provider, profile.providerUserId)
    .first<{ id: string; roles: string }>();

  if (!existing) {
    const byEmail = await env.USERS.prepare(
      `SELECT id, provider, provider_user_id, roles
       FROM users
       WHERE lower(email) = lower(?)
       LIMIT 1`
    )
      .bind(normalizedEmail)
      .first<{
        id: string;
        provider: AuthProvider;
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
    try {
      await env.USERS.prepare(
        `INSERT INTO users (id, email, provider, provider_user_id, roles, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
        .bind(
          id,
          normalizedEmail,
          profile.provider,
          profile.providerUserId,
          roles,
          now,
          now
        )
        .run();
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        const existingByProvider = await env.USERS.prepare(
          `SELECT id, roles
           FROM users
           WHERE provider = ? AND provider_user_id = ?
           LIMIT 1`
        )
          .bind(profile.provider, profile.providerUserId)
          .first<{ id: string; roles: string }>();

        if (existingByProvider) {
          return { id: existingByProvider.id, roles: parseRoles(existingByProvider.roles) };
        }

        const existingByEmail = await env.USERS.prepare(
          `SELECT id, provider, provider_user_id, roles
           FROM users
           WHERE lower(email) = lower(?)
           LIMIT 1`
        )
          .bind(normalizedEmail)
          .first<{
            id: string;
            provider: AuthProvider;
            provider_user_id: string;
            roles: string;
          }>();

        if (
          existingByEmail &&
          existingByEmail.provider === profile.provider &&
          existingByEmail.provider_user_id === profile.providerUserId
        ) {
          return { id: existingByEmail.id, roles: parseRoles(existingByEmail.roles) };
        }

        throw new OAuthConflictError(`Email already linked to another account`);
      }
      throw error;
    }

    return { id, roles: userRoles };
  }

  try {
    await env.USERS.prepare(
      `UPDATE users SET email = ?, updated_at = ? WHERE id = ?`
    )
      .bind(normalizedEmail, now, existing.id)
      .run();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new OAuthConflictError(`Email already linked to another account`);
    }
    throw error;
  }

  return { id: existing.id, roles: parseRoles(existing.roles) };
}

export async function getUserByEmail(env: Environment, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const user = await env.USERS.prepare(
    `SELECT id, email, provider, provider_user_id, roles, is_active, created_at, updated_at
     FROM users WHERE lower(email) = lower(?) LIMIT 1`
  )
    .bind(normalizedEmail)
    .first<{
      id: string;
      email: string;
      provider: AuthProvider;
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
    provider: AuthProvider;
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
