
import { router, requestHandler } from "./app/router";
import { handleAuth } from "./routes/auth";
import {
  Request,
  ExecutionContext,
  Response
} from '@cloudflare/workers-types';

import { Environment } from "./types/env";
import { handleGoogleCallback } from "./routes/auth/google";

/* ===========================
  Routes
  all routes run on CNAME api
=========================== */

// router.get(`/auth`, handleAuth);
router.get(`/auth/google/callback`, handleGoogleCallback);
router.get(`/auth/microsoft/callback`, handleMicrosoftAuth);


/* ===========================
  ...
=========================== */

/** @param {Request} request @param {{DB:D1Database}} env @param {ExecutionContext} ctx */
export default {
  async fetch(
    request: Request,
    env: Environment,
    ctx: ExecutionContext
  ): Promise<Response> {
    return requestHandler(request, env, ctx);
  }
};
