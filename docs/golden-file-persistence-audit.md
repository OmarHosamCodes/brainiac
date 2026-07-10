# Persistence and API Contract Audit

Audited 2026-07-10 against the current worktree. This is a living Phase 8 checklist, not a claim that the full product audit is complete.

## Schema Ownership

| Source                                    | Owning area            | Current evidence                                                                  |
| ----------------------------------------- | ---------------------- | --------------------------------------------------------------------------------- |
| `packages/db/src/schema/auth.ts`          | Auth infrastructure    | Better Auth tables and account/session persistence                                |
| `packages/db/src/schema/team.ts`          | Team feature           | Team and membership tables consumed by `packages/api/src/routers/team/service.ts` |
| `packages/db/src/schema/workspace.ts`     | Workspace feature      | Workspace nodes, marketplace, and sharing persistence                             |
| `packages/db/src/schema/agency-ops.ts`    | Agency feature domains | Agency clients, projects, tasks, time, reports, billing, and resourcing tables    |
| `packages/db/src/schema/notifications.ts` | Notifications feature  | Notification and preference persistence                                           |

## Contract Gates

- [x] API routers under `packages/api/src/routers` have no direct `@orch/db` or `drizzle-orm` imports.
- [x] Dashboard-agent and Team routers parse their outputs through Zod schemas.
- [x] Dashboard-agent and Team schemas have explicit router-local boundary modules.
- [x] Every table has a supporting index review recorded. The reconstructed `0021` snapshot contains 36 tables; 34 have secondary indexes. The two intentional exceptions are `user` (primary key plus unique email) and `dashboard_workspace` (primary key plus user foreign key and one-row-per-user ownership).
- [x] Every schema change has a migration drift review. `0021_agency_client_rate_category.sql` now has a matching schema snapshot and `bun run db:generate` reports no drift.
- [x] All list/filter/summary endpoint families have an explicit date/nullability audit in `docs/golden-file-date-nullability-audit.md`.
- [x] `bun run db:generate` completes and its output is compared with committed migrations. The missing `meta/0021_snapshot.json` was reconstructed from the authoritative TypeScript schema with `prevId` linked to `0020_snapshot.json`; Drizzle now reports `No schema changes, nothing to migrate` and generates no follow-up migration.
- [x] Local Postgres introspection confirms the current database has 36 tables, including the post-0021 tables. Its generated snapshot was used as comparison evidence only; the committed `0021` snapshot is generated from the TypeScript schema to preserve migration-history ownership.

## Baseline Caveats

`bun run check:unused` currently reports pre-existing unused files/dependencies/exports and Knip configuration hints. The operation entry paths are now represented in `knip.json`; the remaining failures are broader baseline cleanup rather than missing operation entries.
