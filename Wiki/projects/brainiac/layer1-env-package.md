---
title: "@brainiac/env — Environment Validation"
category: projects
tags: [config, env, zod, t3-env, primitives]
summary: "Validated environment variable schemas for server (Node) and web (Nuxt) runtimes using @t3-oss/env-core and @t3-oss/env-nuxt."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 1
---

# @brainiac/env — Environment Validation

## Primary Entity

- **Name:** `@brainiac/env`
- **Type:** Env Validation Package
- **Path:** `packages/env/`
- **Exports:**
  - `./server` → `src/server.ts` — server-side env
  - `./web` → `src/web.ts` — Nuxt client env

---

## `src/server.ts` — `env` (server)

- **Adapter:** `@t3-oss/env-core` → `createEnv()`
- **Side-effect on import:** `import "dotenv/config"` — loads `.env` before validation
- **`skipValidation: true`** (no hard throw at startup; defers to runtime)
- **`emptyStringAsUndefined: true`**

### Validated Variables

| Variable               | Zod Rule                                                             |
| ---------------------- | -------------------------------------------------------------------- |
| `DATABASE_URL`         | `z.string().min(1)`                                                  |
| `BETTER_AUTH_SECRET`   | `z.string().min(32)`                                                 |
| `BETTER_AUTH_URL`      | `z.url()`                                                            |
| `CORS_ORIGIN`          | `z.url()`                                                            |
| `OPENROUTER_API_KEY`   | `z.string().min(1)`                                                  |
| `NODE_ENV`             | `z.enum(["development","production","test"]).default("development")` |
| `POLAR_ACCESS_TOKEN`   | `z.string().min(1)`                                                  |
| `POLAR_WEBHOOK_SECRET` | `z.string().min(1)`                                                  |
| `POLAR_SERVER`         | `z.enum(["sandbox","production"]).default("sandbox")`                |
| `POLAR_PRODUCT_PRO`    | `z.string().min(1)`                                                  |

---

## `src/web.ts` — `env` (web/Nuxt)

- **Adapter:** `@t3-oss/env-nuxt` → `createEnv()`
- **Validated at build time when imported in `nuxt.config.ts`**
- **Runtime access pattern (Nuxt):** `useRuntimeConfig().public.serverUrl` (not this import)
- **`skipValidation: true`**, **`emptyStringAsUndefined: true`**

### Validated Variables

| Variable                 | Zod Rule  |
| ------------------------ | --------- |
| `NUXT_PUBLIC_SERVER_URL` | `z.url()` |

---

## Relationships

| Role                        | Entity                       | Mechanism                                                                                        |
| --------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------ |
| **Incoming (Dependents)**   | `packages/db/src/index.ts`   | `import { env } from "@brainiac/env/server"` → accesses `env.DATABASE_URL` to initialize Drizzle |
| **Incoming (Dependents)**   | `apps/server` (auth, routes) | `import { env } from "@brainiac/env/server"` → accesses auth secrets, CORS, Polar tokens         |
| **Incoming (Dependents)**   | `apps/web/nuxt.config.ts`    | `import { env } from "@brainiac/env/web"` → build-time validation of `NUXT_PUBLIC_SERVER_URL`    |
| **Outgoing (Dependencies)** | `@t3-oss/env-core`           | `createEnv()` call with server schema                                                            |
| **Outgoing (Dependencies)** | `@t3-oss/env-nuxt`           | `createEnv()` call with client schema                                                            |
| **Outgoing (Dependencies)** | `zod` (catalog)              | All schema validators                                                                            |
| **Outgoing (Dependencies)** | `dotenv` (catalog)           | `import "dotenv/config"` side-effect in server.ts                                                |

## Standalone Status

**Not standalone** — depends on `@t3-oss/env-core`, `@t3-oss/env-nuxt`, `zod`, `dotenv`.
