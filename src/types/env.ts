// src/types/env.ts
import type { D1Database } from '@cloudflare/workers-types';

import { env as cfEnv } from "cloudflare:workers";
export const env = cfEnv as unknown as Environment;

export interface Environment {
  USERS: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  MICROSOFT_CLIENT_ID: string;
  MICROSOFT_CLIENT_SECRET: string;
  SESSION_SECRET: string;
  FRONTEND_ORIGIN?: string;
}
