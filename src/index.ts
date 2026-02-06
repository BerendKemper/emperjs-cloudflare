
import { router, requestHandler } from "./app/router";
import { Environment } from "./types/env";
import { handleSessionStatus } from "./routes/auth/session";
import { handleUsersList } from "./routes/users";
import { handleOidcCallback } from "./services/auth/oidc/callback";
import { oidcSchemes } from "./services/auth/oidc/providers";

/* ===========================
  Routes
  all routes run on CNAME api
=========================== */

router.get(`/auth/google/callback`, handleOidcCallback.bind(null, oidcSchemes.google));
router.get(`/auth/microsoft/callback`, handleOidcCallback.bind(null, oidcSchemes.microsoft));
router.get(`/auth/session`, handleSessionStatus);
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
