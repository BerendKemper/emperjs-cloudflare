
import {
  Request as CFRequest,
  Response,
  URL,
  ExecutionContext
} from '@cloudflare/workers-types';

import { Environment } from '../types/env';

/* ===========================
  Core Types
=========================== */

type HttpMethod = `GET` | `POST` | `PUT` | `DELETE`;
export type Handler = (request: Request, env: Environment, ctx: ExecutionContext) => Promise<Response>;
type Node = { [method in HttpMethod ]: Handler };
type Routes = { [pathname: string]: Node };
export interface Request extends CFRequest {
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
  const { pathname } = new URL(url);
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

export const requestHandler = async (request: CFRequest, env: Environment, ctx: ExecutionContext) => {
  const url = new URL(request.url);
  url.pathname = url.pathname.replace(/\/+$/, ``) || `/`;
  const node = routes[url.pathname];
  if (!node) return new Response(
    `Not Found: ${url.pathname}`,
    { status: 404 }
  );
  const handler = node[request.method as HttpMethod];
  if (!handler) return new Response(
    `Method ${request.method} not allowed for ${url.pathname}`,
    { status: 405, headers: { Allow: Object.keys(node).join(`, `) } }
  );
  (request as Request)._url = url;
  return handler(request as Request, env, ctx);
};
