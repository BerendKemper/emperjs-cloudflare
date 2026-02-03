
import {
  Response,
  ExecutionContext
} from '@cloudflare/workers-types';

import { Request } from '../app/router';
import { Environment } from '../types/env';

import { verifyJWT } from '../services/jwt';

export async function requireAdmin(request: Request, env: Environment, ctx: ExecutionContext) {
  const token = request.headers.get(`Authorization`)?.replace(`Bearer `, ``);
  if (!token) return new Response(`Unauthorized`, { status: 401 });

  try {
    const payload = await verifyJWT(token, env.JWT_SECRET);
    if (payload.role !== `admin`) return new Response(`Forbidden`, { status: 403 });
  } catch {
    return new Response(`Unauthorized`, { status: 401 });
  }
}


