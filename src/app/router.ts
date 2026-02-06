
import { Environment } from '../types/env';

/* ===========================
  Core Types
=========================== */

type HttpMethod = `GET` | `POST` | `PUT` | `DELETE`;
export type Handler = (request: Request, env: Environment, ctx: ExecutionContext) => Promise<Response>;
type Node = { [method in HttpMethod ]: Handler };
type Routes = { [pathname: string]: Node };
type BaseRequest = globalThis.Request;

export interface Request extends BaseRequest {
  _url: URL
}

/* ===========================
  Route Node
=========================== */

const routes: Routes = Object.create(null);

/* ===========================
  Registration
=========================== */

function registerRoute(
  method: HttpMethod,
  url: string,
  handler: Handler
): void {
  const { pathname } = new URL(url, `https://worker.local`);
  const node = routes[pathname] ??= Object.create(null);
  if (node[method]) throw new Error(`Route already registered: ${method} ${pathname}`);
  node[method] = handler;
}

export const router = {
  get: registerRoute.bind(null, `GET`),
  post: registerRoute.bind(null, `POST`),
  put: registerRoute.bind(null, `PUT`),
  delete: registerRoute.bind(null, `DELETE`),
};

/* ===========================
  Runtime Request Handler
=========================== */

export const requestHandler = async (
  request: BaseRequest,
  env: Environment,
  ctx: ExecutionContext
) => {
  const origin = request.headers.get(`Origin`);
  const allowedOrigin = env.FRONTEND_ORIGIN ?? origin ?? null;
  const corsHeaders = allowedOrigin
    ? {
        "Access-Control-Allow-Origin": allowedOrigin,
        "Access-Control-Allow-Credentials": `true`,
        "Access-Control-Allow-Methods": `GET,POST,PUT,DELETE,OPTIONS`,
        "Access-Control-Allow-Headers":
          request.headers.get(`Access-Control-Request-Headers`) ??
          `Content-Type,Authorization`,
        Vary: `Origin`,
      }
    : null;

  if (request.method === `OPTIONS`) {
    const response = new Response(null, {
      status: 204,
      headers: corsHeaders ?? undefined,
    });
    return response;
  }
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/\/+$/, ``) || `/`;
  const node = routes[url.pathname];
  if (!node) {
    const response = new Response(
      `Not Found: ${url.pathname}`,
      { status: 404 }
    );
    if (corsHeaders) {
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
    }
    return response;
  }
  const handler = node[request.method as HttpMethod];
  if (!handler) {
    const response = new Response(
      `Method ${request.method} not allowed for ${url.pathname}`,
      { status: 405, headers: { Allow: Object.keys(node).join(`, `) } }
    );
    if (corsHeaders) {
      for (const [key, value] of Object.entries(corsHeaders)) {
        response.headers.set(key, value);
      }
    }
    return response;
  }
  (request as Request)._url = url;
  const response = await handler(request as Request, env, ctx);
  if (corsHeaders) {
    for (const [key, value] of Object.entries(corsHeaders)) {
      response.headers.set(key, value);
    }
  }
  return response;
};
