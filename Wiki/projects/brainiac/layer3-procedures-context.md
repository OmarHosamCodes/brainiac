---
title: Layer 3 — ORPC Procedures & Context
tags: [layer3, api, orpc, middleware, auth, billing]
---

# Layer 3 — ORPC Procedures & Context

## 1. Context Factory

**Entity:** `createContext` — async factory function  
**Type:** Context Factory  
**File:** `packages/api/src/context.ts`

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/auth` | calls `auth.api.getSession({ headers })` to extract the BetterAuth session from the raw HTTP request headers |
| `hono` | receives `HonoContext` as the options argument; accesses `context.req.raw.headers` |

### Exported Types
- `CreateContextOptions` — `{ context: HonoContext }`
- `createContext` — `async (opts: CreateContextOptions) => { session }`
- `Context` — `Awaited<ReturnType<typeof createContext>>` — inferred type consumed by all ORPC procedures

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `apps/server/src/app.ts` | calls `createContext({ context })` inside the Hono `/*` middleware to build the per-request context before delegating to `handleAppRouterRequest` |
| `packages/api/src/billing-guard.ts` | imports `Context` type to type-annotate the ORPC `os.$context<Context>()` instance |
| `packages/api/src/procedures.ts` | imports `Context` type to type-annotate `os.$context<Context>()` |

### Standalone Status
Not standalone — depends on `@brainiac/auth` and `hono`.

---

## 2. ORPC Procedure Builders

**Entity:** `procedures.ts` — exports `o`, `publicProcedure`, `protectedProcedure`, `protectedProProcedure`  
**Type:** ORPC Middleware / Procedure Builders  
**File:** `packages/api/src/procedures.ts`

### Exports
| Export | Description |
|---|---|
| `o` | `os.$context<Context>()` — base ORPC instance typed to the app context |
| `publicProcedure` | `o.use(devErrorMiddleware)` — wraps all errors via `toProcedureError` |
| `protectedProcedure` | `publicProcedure.use(requireAuth)` — throws `UNAUTHORIZED` if `context.session?.user` is absent |
| `protectedProProcedure` | `protectedProcedure.use(requirePro)` — calls `getBillingStateForUser`; throws `FORBIDDEN` if `billing.tier !== "pro"` |

### Middleware Chain (innermost → outermost)
```
protectedProProcedure
  └─ protectedProcedure
       └─ publicProcedure (devErrorMiddleware)
            └─ raw o
```

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@orpc/server` (`ORPCError`, `os`) | constructs ORPC context instance; throws typed ORPC errors |
| `./context` (`Context`) | type-annotation for `os.$context<Context>()` |
| `./billing-guard` (`getBillingStateForUser`) | called inside `requirePro` middleware to fetch `BillingState` |
| `./dev-errors` (`toProcedureError`) | called inside `devErrorMiddleware` to convert any caught error to an `ORPCError` |

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `routers/system.ts` | imports `publicProcedure`, `protectedProcedure` |
| `routers/billing/index.ts` | imports `protectedProcedure` |
| `routers/agent.ts` | imports `protectedProcedure` |
| `routers/workspace/index.ts` | imports `protectedProcedure`, `protectedProProcedure` |
| `routers/team/index.ts` | imports `protectedProcedure` |
| `routers/agency-ops/index.ts` | imports `protectedProProcedure` |

### Standalone Status
Not standalone — depends on `@orpc/server`, `./context`, `./billing-guard`, `./dev-errors`.
