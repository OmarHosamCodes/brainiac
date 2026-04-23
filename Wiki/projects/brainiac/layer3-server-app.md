---
title: Layer 3 — Server App & Request Handlers
tags: [layer3, server, hono, orpc, handlers, cors, auth]
---

# Layer 3 — Server App & Request Handlers

## 1. Server Entry Point (app.ts)

**Entity:** `createApp` / default export (Hono app)  
**Type:** HTTP Server Application  
**File:** `apps/server/src/app.ts`  
**Port:** `7000`

### Route Table
| Method | Path | Handler |
|---|---|---|
| `GET`, `POST` | `/api/auth/*` | delegates raw request to `auth.handler(context.req.raw)` from `@brainiac/auth` |
| `GET` | `/billing/success` | redirects to `${env.CORS_ORIGIN}/billing/success` with original query string (302) |
| `GET`, `POST` | `/*` (middleware) | calls `createContext({ context })` then `handleAppRouterRequest(request, requestContext)`; falls through to `next()` if response is `null` |
| `GET` | `/` | returns `"OK"` (health check) |

### Middleware Stack (applied order)
1. `app.onError` — catches Hono-level errors; in dev mode + `/rpc/*` path returns `getRpcDebugResponse` JSON; otherwise `500 Internal Server Error`
2. `hono/logger` — request logging
3. `hono/cors` — CORS: `origin: env.CORS_ORIGIN`, methods `[GET, POST, OPTIONS]`, headers `[Content-Type, Authorization]`, `credentials: true`

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/api/context` (`createContext`) | called per-request inside `/*` middleware to build session context from request headers |
| `@brainiac/auth` (`auth`) | `auth.handler(context.req.raw)` serves all BetterAuth routes under `/api/auth/*` |
| `@brainiac/env/server` (`env`) | reads `env.CORS_ORIGIN`, `env.NODE_ENV` |
| `hono` | web framework; `Hono`, `cors`, `logger` |
| `./lib/handlers` (`handleAppRouterRequest`) | dispatches RPC and OpenAPI requests |

### Incoming Dependents
Standalone entry point — consumed by the Bun runtime as `export default { port: 7000, fetch: app.fetch }`.

### Standalone Status
Not standalone — depends on `@brainiac/api/context`, `@brainiac/auth`, `@brainiac/env/server`, Hono, and `./lib/handlers`.

---

## 2. Request Handler (handlers.ts)

**Entity:** `handleAppRouterRequest`  
**Type:** Request Dispatcher  
**File:** `apps/server/src/lib/handlers.ts`

### Handler Chain
```
handleAppRouterRequest(request, context)
  1. rpcHandler.handle(request, { prefix: "/rpc", context })
     → if matched → return rpcResult.response
  2. apiHandler.handle(request, { prefix: "/api-reference", context })
     → if matched → return apiResult.response
  3. return null  (falls through to Hono next())
```

### Instantiated Handlers (module-level singletons)
| Handler | Type | Route Prefix | Description |
|---|---|---|---|
| `rpcHandler` | `RPCHandler(appRouter)` from `@orpc/server/fetch` | `/rpc` | Serves JSON-RPC 2.0 requests for all ORPC procedures |
| `apiHandler` | `OpenAPIHandler(appRouter, { plugins: [OpenAPIReferencePlugin] })` from `@orpc/openapi/fetch` | `/api-reference` | Serves REST + OpenAPI reference docs; schema conversion via `ZodToJsonSchemaConverter` |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/api/context` (`Context`) | type-annotates the `context` parameter |
| `@brainiac/api/routers/index` (`appRouter`) | passed to both `RPCHandler` and `OpenAPIHandler` as the router tree |
| `@orpc/server/fetch` (`RPCHandler`) | instantiated at module load; handles `/rpc/*` requests |
| `@orpc/openapi/fetch` (`OpenAPIHandler`) | instantiated at module load; handles `/api-reference/*` requests |
| `@orpc/openapi/plugins` (`OpenAPIReferencePlugin`) | plugin for OpenAPI reference UI |
| `@orpc/zod/zod4` (`ZodToJsonSchemaConverter`) | converts Zod schemas to JSON Schema for OpenAPI spec generation |

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `apps/server/src/app.ts` | calls `handleAppRouterRequest(context.req.raw, requestContext)` inside `/*` Hono middleware |

### Standalone Status
Not standalone — depends on `appRouter`, ORPC handlers, and OpenAPI plugins.
