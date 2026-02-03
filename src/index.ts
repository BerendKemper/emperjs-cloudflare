
import { router, requestHandler } from "./app/router";
import { Environment } from "./types/env";
import { handleGoogleCallback } from "./routes/auth/google";
import { handleMicrosoftCallback } from "./routes/auth/microsoft";
import { handleUsersList } from "./routes/users";

/* ===========================
  Routes
  all routes run on CNAME api
=========================== */

router.get(`/auth/google/callback`, handleGoogleCallback);
router.get(`/auth/microsoft/callback`, handleMicrosoftCallback);
router.get(`/users`, handleUsersList);


/* ===========================
  ...
=========================== */

export default {
  async fetch(
    request: Request,
    env: Environment,
    ctx: ExecutionContext
  ): Promise<Response> {
    return requestHandler(request, env, ctx);
  }
};
