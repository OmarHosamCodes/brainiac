---
title: "@brainiac/db — Database Package (Drizzle + PostgreSQL)"
category: projects
tags: [db, drizzle, postgres, schema, primitives]
summary: "Drizzle ORM database package: connection instance, all schema tables, and migration config for PostgreSQL."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 1
---

# @brainiac/db — Database Package (Drizzle + PostgreSQL)

## Primary Entity

- **Name:** `@brainiac/db`
- **Type:** Database Package
- **Path:** `packages/db/`
- **Exports:**
  - `.` → `src/index.ts` — `db` instance
  - `./*` → `src/*.ts` — direct file access (e.g. `@brainiac/db/schema`)

---

## `src/index.ts` — `db` (Drizzle instance)

- **Driver:** `drizzle-orm/node-postgres`
- **Connection:** reads `env.DATABASE_URL` from `@brainiac/env/server`
- **Schema:** all tables imported via `import * as schema from "./schema"` (barrel re-export)
- **Exported symbol:** `db` — the single shared Drizzle client for the whole server

### Relationships

| Role | Entity | Mechanism |
|---|---|---|
| **Incoming (Dependents)** | `apps/server` routers/procedures | `import { db } from "@brainiac/db"` → executes Drizzle queries |
| **Outgoing (Dependencies)** | `@brainiac/env/server` | reads `env.DATABASE_URL` for pg connection string |
| **Outgoing (Dependencies)** | `./schema` (barrel) | imports all table definitions into Drizzle schema map |

---

## `drizzle.config.ts` — Migration Config

- **Schema dir:** `./src/schema`
- **Migrations out:** `./src/migrations`
- **Dialect:** `postgresql`
- **Credential resolution order:** `process.env.DATABASE_URL` → `DATABASE_PRIVATE_URL` → `POSTGRES_URL`
- **Env loading:** loads dotenv from `apps/server/.env`, `apps/server/.env.local`, `packages/db/.env`, `packages/db/.env.local` (in order, no override)

---

## Schema Tables

### `src/schema/auth.ts` — Auth Schema

| Table | Primary Key | Foreign Keys | Indexes |
|---|---|---|---|
| `user` | `id` (text) | — | — |
| `session` | `id` (text) | `userId → user.id CASCADE` | `session_userId_idx` |
| `account` | `id` (text) | `userId → user.id CASCADE` | `account_userId_idx` |
| `verification` | `id` (text) | — | `verification_identifier_idx` |

**Notable fields on `user`:** `lifetimePro` (boolean, default false)

**Drizzle relations defined:**
- `userRelations` → `user` has many `session`, many `account`
- `sessionRelations` → `session` belongs to `user`
- `accountRelations` → `account` belongs to `user`

**Incoming dependents:** `workspace.ts`, `team.ts`, `agency-ops.ts` all import `user` to declare FK references.

---

### `src/schema/workspace.ts` — Workspace Schema

**Imported types from `@brainiac/workspace`:** `WorkspaceNode`, `WorkspaceMarketplacePayload`

| Table | Primary Key | Foreign Keys | Notable Fields |
|---|---|---|---|
| `dashboard_workspace` | `userId` (text, PK + FK) | `userId → user.id CASCADE` | `nodes: jsonb<WorkspaceNodeRecord[]>` |
| `workspace_marketplace_item` | `id` (text) | `createdByUserId → user.id SET NULL` | `kind`, `payload: jsonb<WorkspaceMarketplacePayloadRecord>` |
| `dashboard_conversation` | `id` (text) | `userId → user.id CASCADE` | `model`, `toolPreset`, `usageSummary: jsonb`, `archivedAt`, `lastMessageAt` |
| `dashboard_conversation_message` | `id` (text) | `conversationId → dashboard_conversation.id CASCADE`, `userId → user.id CASCADE` | `role`, `content`, `contextNodeTitles: jsonb<string[]>`, `toolsCalled: jsonb<string[]>`, `model` |

**Indexes:**
- `workspace_marketplace_kind_idx`, `workspace_marketplace_created_at_idx`
- `dashboard_conversation_user_updated_idx`, `dashboard_conversation_user_last_message_idx`
- `dashboard_conversation_message_conversation_created_idx`, `dashboard_conversation_message_user_created_idx`

**Type aliases exported:**
- `WorkspaceNodeRecord` = `WorkspaceNode`
- `WorkspaceMarketplacePayloadRecord` = `WorkspaceMarketplacePayload`
- `DashboardConversationUsageSummaryRecord` (with `latest` + `totals` sub-shapes)

---

### `src/schema/team.ts` — Team Schema

| Table | Primary Key | Foreign Keys | Indexes |
|---|---|---|---|
| `workspace_team` | `id` (text) | `createdByUserId → user.id CASCADE` | `workspace_team_created_by_user_idx` |
| `workspace_team_member` | `id` (text) | `teamId → workspace_team.id CASCADE`, `userId → user.id CASCADE` | `workspace_team_member_team_user_unique` (unique), `_user_idx`, `_team_idx` |

**Type exported:** `WorkspaceTeamRole = "owner" | "editor" | "viewer"`

**`workspace_team_member.role`** defaults to `"viewer"`, typed as `WorkspaceTeamRole`.

---

### `src/schema/agency-ops.ts` — Agency Operations Schema

**Imports:** `user` from `./auth`, `workspaceTeam` from `./team`

| Table | PK | Key FKs | Special |
|---|---|---|---|
| `agency_ops_client` | `id` | `teamId → workspace_team CASCADE`, `createdByUserId → user CASCADE` | — |
| `agency_ops_project` | `id` | `teamId → workspace_team CASCADE`, `clientId → agency_ops_client RESTRICT` | clientId uses `RESTRICT` on delete |
| `agency_ops_tag` | `id` | `teamId → workspace_team CASCADE`, `createdByUserId → user CASCADE` | — |
| `agency_ops_time_entry` | `id` | `teamId`, `projectId → agency_ops_project CASCADE`, `userId → user CASCADE` | `source` (timer/manual), `linkUrl`, `deletedAt` (soft-delete), `durationSeconds` |
| `agency_ops_time_entry_tag` | composite `(timeEntryId, tagId)` | `timeEntryId → agency_ops_time_entry CASCADE`, `tagId → agency_ops_tag CASCADE` | join table |
| `agency_ops_active_timer` | `id` | `teamId`, `projectId → agency_ops_project CASCADE`, `userId → user CASCADE` | `uniqueIndex` on `userId` (one active timer per user) |
| `agency_ops_active_timer_tag` | composite `(activeTimerId, tagId)` | `activeTimerId → agency_ops_active_timer CASCADE`, `tagId → agency_ops_tag CASCADE` | join table |

**Type exported:** `AgencyOpsTimeEntrySource = "timer" | "manual"`

**Critical constraint:** `agency_ops_active_timer_user_unique` — one active timer per user globally.

---

### `src/schema/index.ts` — Schema Barrel

Re-exports all of: `agency-ops`, `auth`, `team`, `workspace`.

---

## Full Relationship Map

| Entity | Incoming (Dependents) | Outgoing (Dependencies) | Mechanism |
|---|---|---|---|
| `db` (index.ts) | `apps/server` all procedures | `@brainiac/env/server`, `./schema` | `drizzle(env.DATABASE_URL, { schema })` |
| `schema/auth.ts` | `schema/workspace.ts`, `schema/team.ts`, `schema/agency-ops.ts` | `drizzle-orm` | FK `.references(() => user.id)` |
| `schema/workspace.ts` | `apps/server` workspace procedures | `schema/auth.ts`, `@brainiac/workspace` types | `jsonb.$type<WorkspaceNodeRecord[]>()` |
| `schema/team.ts` | `schema/agency-ops.ts`, server procedures | `schema/auth.ts` | FK `.references(() => user.id)` |
| `schema/agency-ops.ts` | server agency procedures | `schema/auth.ts`, `schema/team.ts` | FK `.references(() => workspaceTeam.id)` |

## Standalone Status

**Not standalone** — depends on `@brainiac/env/server` (for `DATABASE_URL`), `@brainiac/workspace` (for `WorkspaceNode` types), `drizzle-orm`, `pg`.
