---
title: Brainiac — Monorepo Root Config
category: projects
tags: [config, monorepo, turbo, bun, typescript]
summary: "Root-level build orchestration and workspace config: package.json, turbo.json, tsconfig.json, knip.json."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 1
---

# Brainiac — Monorepo Root Config

## Primary Entities

### `package.json` (root)

- **Type:** Workspace Config
- **Path:** `package.json`
- **Package manager:** `bun@1.3.10`
- **Workspaces:** `apps/*`, `packages/*`
- **Catalog (shared version pins):**
  - `zod ^4.1.13`, `typescript ^5`, `hono ^4.8.2`
  - `@orpc/server ^1.12.2`, `@orpc/client ^1.12.2`, `@orpc/openapi ^1.12.2`, `@orpc/zod ^1.12.2`
  - `better-auth 1.5.5`, `drizzle-orm ^0.45.1`, `dotenv ^17.2.2`
  - `@types/pg ^8.16.0`, `@types/bun ^1.3.4`
- **Key scripts:** `dev` (turbo), `build` (turbo `--concurrency=1`), `db:*` (delegated to `@brainiac/db`), `test:api:bruno`, `check` (oxlint + oxfmt)
- **Standalone:** No — orchestrates all workspace packages

---

### `turbo.json`

- **Type:** Build Orchestrator Config
- **Path:** `turbo.json`
- **UI:** `tui`
- **Global pass-through env vars:** `DATABASE_URL`, `DATABASE_PRIVATE_URL`, `POSTGRES_URL`, `PGDATABASE`, `PGHOST`, `PGPASSWORD`, `PGPORT`, `PGUSER`
- **Task graph:**
  - `build` → depends on `^build`, outputs `dist/**`, `.nuxt/**`, `.output/**`
  - `check-types` → depends on `^check-types`
  - `dev` / `dev:portless` → no-cache, persistent
  - `db:push`, `db:generate`, `db:migrate`, `db:seed`, `db:studio`, `db:start`, `db:stop`, `db:watch`, `db:down` → no-cache
  - `grant:lifetime-pro` → no-cache
- **Standalone:** No — reads workspace `package.json` scripts

---

### `tsconfig.json` (root)

- **Type:** TypeScript Config
- **Path:** `tsconfig.json`
- **Outgoing dependency:** extends `@brainiac/config/tsconfig.base.json`
- **Standalone:** No — delegates all options to `@brainiac/config`

---

### `knip.json`

- **Type:** Dead-code / unused-export Config
- **Path:** `knip.json`
- **Workspaces configured:** `apps/web`, `apps/server`, `packages/agent`, `packages/api`, `packages/auth`, `packages/db`, `packages/env`, `packages/workspace`
- **Notable:** `apps/web/app/components/workspace/node/context.ts` ignores `exports`/`types` issues
- **Standalone:** Yes (analysis-only, no runtime deps)

---

## Relationship Map

| Entity                 | Incoming (Dependents)             | Outgoing (Dependencies)               | Mechanism                |
| ---------------------- | --------------------------------- | ------------------------------------- | ------------------------ |
| `package.json` (root)  | CI, developer scripts             | All `apps/*` and `packages/*`         | Bun workspace resolution |
| `turbo.json`           | `turbo dev/build/check-types` CLI | All tasks in workspace packages       | Task graph pipeline DAG  |
| `tsconfig.json` (root) | Root-level type-check             | `@brainiac/config/tsconfig.base.json` | `extends` directive      |
| `knip.json`            | `bun run check:unused`            | All workspace `entry`/`project` globs | Knip static analysis     |
