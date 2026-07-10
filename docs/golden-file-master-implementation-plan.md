# Master Implementation Plan: Golden File Pattern Refactor

Original baseline generated against the 2026-07-09 worktree. Last validated against the live
worktree on 2026-07-10.

Source standard: `docs/golden-file-pattern.md`.

## Validation Result — 2026-07-10

**Status: not validated as complete.** The current implementation has substantial structural
progress, but the evidence does not prove the objective or the phase exit gates. Any later
completion claim must supersede this section with a fresh requirement-by-requirement audit.

Live command results:

| Command                  | Result                                                                 |
| ------------------------ | ---------------------------------------------------------------------- |
| `bun run check`          | Pass; 3 lint warnings                                                  |
| `bun run check-types`    | Pass; 8 Turbo tasks                                                    |
| `bun test`               | Pass; 192 tests across 47 discovered files, including generated `dist` |
| `bun run check:golden`   | Pass; proves path coverage for 646 TS/TSX files, not classification    |
| `bun run check:realtime` | Pass; proves 5 event names have nonempty registry metadata             |
| `bun run db:generate`    | Pass; no schema changes                                                |
| `bun run check:unused`   | **Fail**; Knip reports files, dependencies, exports, and config hints  |

Completion blockers found by the validation:

1. The source inventory is path-classified and its checker only compares path sets. It does not
   prove that a classification is correct or that a `golden-feature` file obeys the pattern.
2. Five view files remain exempt from golden checks and still import stores or store-owned
   modules. Other views, including Billing and Team, call orchestration hooks indirectly and are
   false negatives for the current checker.
3. Phase 8 has no per-feature, per-layer completion matrix, and
   `docs/golden-file-persistence-audit.md` explicitly says it is not a full-product completion
   claim.
4. `docs/golden-file-auth-membership-audit.md` leaves the generic-error, web-error, naming, and
   high-risk authorization-test reviews unchecked.
5. Workspace and subscription Billing routers still return some service results without Zod
   output parsing, despite the universal API-contract requirement.
6. Several router-facing Team, Workspace, Agent, and Notifications service functions do not use
   the required `actorUserId` plus one input-object signature.
7. `check:unused` has no owner/domain disposition, and `knip.json` still models the web workspace
   as Nuxt/Vue although the application is Vite/React.
8. The canonical exemplar still names paths and gaps changed by this refactor. The plan and
   `docs/golden-file-pattern.md` must be reconciled before either can prove the other.

Canonical coverage verdict:

| Area                                  | Verdict | Required proof before completion                                      |
| ------------------------------------- | ------- | --------------------------------------------------------------------- |
| Scope and per-file classification     | Fail    | Expanded inventory plus semantic classification validation            |
| Layer direction and boundary tooling  | Fail    | Zero view exceptions and indirect orchestration/container enforcement |
| Agency backend                        | Partial | Per-feature actor/input/output/service checklist                      |
| Agency web query, state, and UI       | Fail    | Props-only views and explicit query/store/cache evidence              |
| Non-agency product domains            | Fail    | Full matrices for Workspace, Agent, Team, Auth, Billing, and Shell    |
| Persistence and API contracts         | Fail    | Full-product matrix and Zod output proof for every router             |
| Auth, membership, errors, and naming  | Fail    | Close every unchecked Phase 9 review and authorization test gap       |
| Realtime and cross-feature ownership  | Partial | Validate referenced producers, consumers, paths, and tests            |
| Testing                               | Partial | Source-only full suite, UI/hook coverage, and CI execution            |
| Final cleanup and canonical alignment | Fail    | Green required gates, zero transitional allowlists, refreshed spec    |

Validation evidence is also recorded in `docs/golden-file-final-verification.md` and the truthful
resumption state in `docs/golden-file-refactor-progress.md`.

## Objective

Refactor 100% of the source codebase so every product feature follows the golden file pattern, or is explicitly classified as shared infrastructure, server operations, or static presentation with equivalent layer boundaries.

For this plan, "100%" covers source-controlled product implementation, tests, persistence
artifacts, runtime tooling, and build/runtime configuration. It includes, at minimum:

- `apps/web/src`
- `apps/server/src`
- `packages/api/src`
- `packages/auth/src`
- `packages/db/src`
- `packages/agent/src`
- `packages/workspace/src`
- `packages/env/src`
- `packages/config/src`
- `packages/db/src/migrations` SQL and metadata
- source-controlled JavaScript/MJS/TypeScript under `scripts`
- application/package build, test, database, and CI configuration

Generated output, installed dependencies, and vendored agent assets are out of scope:
`node_modules`, `dist`, `.turbo`, `.nuxt`, `.output`, and `.agents/skills`. Every excluded
source-controlled path must have an explicit rationale; the inventory may not silently omit it.

## Completion Standard

The refactor is complete only when each source file has one of these statuses:

- `golden-feature`: belongs to a feature that follows the full layer flow from persistence through UI and tests.
- `shared-infrastructure`: exports framework, UI, query, auth, env, or utility primitives and is not feature-specific.
- `server-operation`: is a seed, import, backfill, cleanup, startup, or scheduled job with deliberate direct DB access and no feature runtime leakage.
- `static-presentation`: marketing/legal/static content with no server mutations and no feature business rules.

Every `golden-feature` file must obey this direction:

```text
Database schema and migrations
  -> API service and data access
  -> API router and Zod wire contracts
  -> oRPC client and TanStack Query hooks
  -> client mutation/state store
  -> feature hooks and view models
  -> containers
  -> presentational views
```

No file is allowed to be "uncategorized" at the end.

## Current-State Snapshot

The repo already has meaningful progress toward the pattern:

- `apps/web/src/components/agency` has been removed.
- Agency feature UI mostly lives under `apps/web/src/features/{billing,clients,dashboard,notifications,projects,reports,resourcing,settings,shared,task-management,time-tracking}`.
- Agency API routers are split under `packages/api/src/routers/agency-ops/*`.
- `packages/api/src/routers/agency-ops/index.ts` is a thin namespace aggregator.
- Shared UI primitives are already under `apps/web/src/ui`.
- Most pure helper tests use `bun:test`.

Former known paths have largely moved, but the 2026-07-10 validation found that path movement is
ahead of architectural proof. Mixed views, weak inventory classification, incomplete audit
artifacts, and the red Knip gate remain open. The phase sections below describe the intended work;
phase status and resumption state live in `docs/golden-file-refactor-progress.md`.

## Domain Ownership Map

### Agency Domains

| Domain          | API home                                                    | Web home                                | Validation status                                                                  |
| --------------- | ----------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Clients         | `packages/api/src/routers/agency-ops/clients`               | `apps/web/src/features/clients`         | Structure present; full canonical layer matrix missing.                            |
| Projects        | `packages/api/src/routers/agency-ops/projects`              | `apps/web/src/features/projects`        | Structure present; view error normalization and full matrix remain unproved.       |
| Task management | `packages/api/src/routers/agency-ops/tasks`                 | `apps/web/src/features/task-management` | **Not golden:** store-backed and stateful views remain.                            |
| Time tracking   | `packages/api/src/routers/agency-ops/time-tracking`         | `apps/web/src/features/time-tracking`   | **Not golden:** state/theme-backed views remain.                                   |
| Reports         | `packages/api/src/routers/agency-ops/reports`               | `apps/web/src/features/reports`         | Cross-feature boundary exists; raw-error and router-view evidence remains partial. |
| Billing         | `packages/api/src/routers/agency-ops/billing`               | `apps/web/src/features/billing`         | **Not golden:** subscription Billing view calls orchestration hooks directly.      |
| Resourcing      | `packages/api/src/routers/agency-ops/resourcing`            | `apps/web/src/features/resourcing`      | Structure present; full canonical layer matrix missing.                            |
| Notifications   | `packages/api/src/routers/notifications` plus agency fanout | `apps/web/src/features/notifications`   | **Not golden:** monolithic query/store/router UI orchestration remains.            |
| Settings        | Agency routers by domain                                    | `apps/web/src/features/settings`        | Structure present; full canonical layer matrix missing.                            |
| Shared agency   | `packages/api/src/routers/agency-ops/shared`                | `apps/web/src/features/shared`          | **Not golden:** an allowlisted view and mixed segment orchestration remain.        |

### Non-Agency Product Domains — 2026-07-09 Baseline

The locations below are the dated migration baseline, not the validated current tree. The target
folders now largely exist, but each domain still needs the canonical evidence matrix before it can
be marked golden.

| Domain                    | 2026-07-09 baseline locations                                                                                                                                                                      | Target home                                                                                                                                                              |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace nodes and board | `apps/web/src/components/workspace`, `apps/web/src/lib/workspace`, `apps/web/src/stores/workspace`, `packages/api/src/routers/workspace`, `packages/workspace/src`                                 | `apps/web/src/features/workspace`, `packages/api/src/routers/workspace/{router,service,schemas}`, pure block logic in `packages/workspace/src` or feature-local helpers. |
| Workspace canvas          | `apps/web/src/components/canvas`, `apps/web/src/components/infinite-canvas.tsx`, `apps/web/src/lib/canvas`                                                                                         | `apps/web/src/features/workspace-canvas` unless merged into `features/workspace/canvas`.                                                                                 |
| Dashboard agent chat      | `apps/web/src/components/dashboard/agent-chat`, `apps/web/src/stores/dashboard-agent-chat`, `packages/api/src/routers/agent.ts`, `packages/api/src/routers/agent/service.ts`, `packages/agent/src` | `apps/web/src/features/dashboard-agent`, `packages/api/src/routers/agent/{router,service,schemas}`.                                                                      |
| Team management           | `apps/web/src/components/team`, `apps/web/src/stores/team`, `packages/api/src/routers/team`                                                                                                        | `apps/web/src/features/team`, `packages/api/src/routers/team/{router,service,schemas}`.                                                                                  |
| Subscription billing      | `apps/web/src/pages/billing-page.tsx`, `apps/web/src/features/billing/billing-queries.ts`, `packages/api/src/routers/billing`                                                                      | Keep in `features/billing` but separate subscription billing from agency ops billing with named hooks and view models.                                                   |
| Marketplace               | `apps/web/src/pages/marketplace-page.tsx`, `apps/web/src/components/marketplace-*`, workspace API service methods                                                                                  | `apps/web/src/features/marketplace`, API route either `workspace.marketplace` or dedicated `marketplace` router with explicit ownership.                                 |
| Auth                      | `apps/web/src/pages/login-page.tsx`, `apps/web/src/components/auth`, `apps/web/src/lib/auth-client.ts`, `packages/auth/src`                                                                        | `apps/web/src/features/auth` for UI/hooks; `packages/auth` remains auth infrastructure.                                                                                  |
| App shell                 | `apps/web/src/components/app-shell*`, `apps/web/src/stores/app-shell`, `apps/web/src/lib/shell`                                                                                                    | `apps/web/src/features/app-shell` or `apps/web/src/shell` classified as shared infrastructure.                                                                           |
| Marketing and legal       | `apps/web/src/components/marketing`, `apps/web/src/pages/landing-page.tsx`, legal pages                                                                                                            | `static-presentation`; only split if query or mutation orchestration appears.                                                                                            |

### Infrastructure and Operations

| Area                                                  | Target classification                               |
| ----------------------------------------------------- | --------------------------------------------------- |
| `packages/db/src/schema/*` and migrations             | Persistence layer source of truth.                  |
| `packages/env/src/*`                                  | Shared infrastructure.                              |
| `packages/config/src/*`                               | Shared infrastructure.                              |
| `packages/auth/src/index.ts`                          | Auth infrastructure; no feature business rules.     |
| `apps/server/src/app.ts`, websocket handlers, startup | Server app layer.                                   |
| `apps/server/src/operations/*`                        | Server operations with documented direct DB access. |

## Implementation Phases

### Phase 0 - Baseline and Tracking

Goal: create objective evidence before moving more code.

Tasks:

1. Add a source inventory artifact that records every in-scope source artifact with its domain,
   canonical layer, classification, owner, rationale, and evidence. Path location alone must not
   determine `golden-feature` status.
2. Add a canonical requirement matrix per domain and feature. Every row is `pass`, `fail`, or a
   justified `N/A`, with a current file, command, or test as evidence.
3. Record baseline outputs for:
   - `bun run check-types`
   - `bun run check`
   - `bun run check:unused`
4. Decide whether compatibility re-exports count as public API. If yes, document their deprecation path; if no, remove them during the relevant phase.

Exit gate:

- The inventory has no unknown directories or silently omitted source-controlled extensions.
- Classification validation rejects semantically invalid rows; it does more than compare paths.
- Every feature has a complete canonical requirement matrix with no unsupported `pass` status.
- Failing baseline commands, if any, are recorded with owner/domain and are not hidden by later refactors.

### Phase 1 - Enforce Golden Boundaries

Goal: make the target architecture machine-checkable enough that regressions are hard.

Tasks:

1. Extend `scripts/check-conventions.mjs` or add `scripts/check-golden-file-pattern.mjs`.
2. Add rules for:
   - `*-view.tsx` files cannot import `@tanstack/react-query`, `@/lib/orpc`, `orpcClient`, feature stores, or global stores except typed view-model types.
   - `containers/*` files only bind props to hooks and views.
   - `hooks/use-*` files may compose queries, stores, effects, handlers, and view models.
   - Feature stores may call `orpcClient`; views may not.
   - Routers may not import `@brainiac/db`, Drizzle query helpers, or feature stores.
   - Feature-specific files may not live under `apps/web/src/lib` or `apps/web/src/stores`.
   - New generic `utils.ts` files inside feature folders are blocked unless allowlisted.
3. Add allowlists only for permanent infrastructure, generated code, and server-operation
   classifications. Transitional architectural violations must name an issue, owner, and removal
   phase and cannot survive Phase 11.
4. Add `bun run check:golden` or include the new script in `bun run check`.

Exit gate:

- The checker passes on the current transitional gaps.
- Each transitional entry names its issue, owner, and target phase.
- The checker covers direct and indirect view orchestration, container shape, hook/view-model
  boundaries, router output parsing, and feature-specific ownership outside `features/`.

### Phase 2 - Complete Agency Backend Alignment

Goal: finish the backend split originally started by the archived [`legacy-exec-plan.md`](legacy-exec-plan.md).

Tasks:

1. Keep `packages/api/src/routers/agency-ops/index.ts` as a thin aggregator only.
2. Move or deliberately preserve compatibility imports:
   - `@brainiac/api/routers/agency-ops/live`
   - `@brainiac/api/routers/agency-ops/tenure-engine`
3. Replace direct reports-router imports from `../time-tracking/service` with one deliberate boundary:
   - preferred: `reports/service.ts` owns report operations and calls a named time-entry admin service helper.
   - acceptable: `time-tracking/admin-service.ts` exports reporting-only functions with stricter permissions and tests.
4. Split `packages/api/src/routers/agency-ops/shared/utils.ts` into named helpers:
   - task record mapping and assignment helpers
   - project/client lookup helpers
   - journey status helpers
   - report filter helpers
   - date parsing helpers
5. Review every agency service export:
   - public service functions take `actorUserId` first and an input object second.
   - internal helpers are private unless a real cross-domain consumer needs them.
6. Keep router handlers thin: input validation, actor extraction, service call, output parse.
7. Add missing Zod output parsing where any router returns unparsed service output.

Exit gate:

- `rg "from .*\\.\\./.*service" packages/api/src/routers/agency-ops -g 'router.ts'` returns only documented cross-feature exceptions or nothing.
- `rg "from ['\\\"]@brainiac/db|from ['\\\"]drizzle-orm" packages/api/src/routers -g 'router.ts' -g 'index.ts'` returns no feature router violations.
- `bun run check-types` passes.

### Phase 3 - Complete Agency Web Alignment

Goal: make every agency feature match the golden web stack.

Tasks:

1. Move remaining agency shared files:
   - `apps/web/src/lib/agency-management-sections.ts` -> `apps/web/src/features/shared/agency-management-sections.ts`
   - `apps/web/src/lib/agency-segments.ts` -> `apps/web/src/features/shared/agency-segments.ts`
   - `apps/web/src/lib/agency-settings-sections.ts` -> `apps/web/src/features/shared/agency-settings-sections.ts`
   - `apps/web/src/lib/queries/agency-optimistic.ts` -> `apps/web/src/features/shared/agency-optimistic.ts`
   - `apps/web/src/lib/queries/agency-sync.ts` -> `apps/web/src/features/shared/agency-sync.ts`
2. Split mixed feature components into public entry, container, hook, view:
   - `features/billing/agency-billing-surface.tsx`
   - `features/billing/agency-settings-rates-pane.tsx`
   - `features/dashboard/agency-dashboard-surface.tsx`
   - `features/projects/agency-project-manager.tsx`
   - `features/projects/agency-project-detail.tsx`
   - `features/projects/agency-project-create-dialog.tsx`
   - `features/projects/agency-projects-table.tsx`
   - `features/reports/agency-reports-surface.tsx`
   - `features/reports/agency-saved-reports-list.tsx`
   - `features/reports/creator/agency-report-creator-surface.tsx`
   - `features/reports/creator/agency-report-activity-menu.tsx`
   - `features/resourcing/tenure/agency-settings-tenure-pane.tsx`
   - `features/settings/agency-settings-integrations-pane.tsx`
   - `features/time-tracking/agency-time-summary.tsx`
   - `features/task-management/work-surface/agency-work-surface-create-task-popover.tsx`
   - `features/task-management/work-surface/agency-work-surface-delegated-view.tsx`
3. Ensure each split follows:
   - public entry exports container as product-facing component.
   - container calls one hook and renders one view.
   - hook returns a typed view model.
   - view receives props only and renders markup.
4. Move feature-specific query helpers out of `features/shared/agency-queries.ts` unless they are used by multiple domains or live boot behavior.
5. Keep shared query/cache/live files only for cross-domain agency state.
6. Convert direct `node:assert` tests to `bun:test`.

Exit gate:

- `rg "@tanstack/react-query|@/lib/orpc|orpcClient|use[A-Za-z0-9]+Store" apps/web/src/features -g '*view.tsx' -g '*-view.tsx'` returns no unapproved view violations.
- `rg "@/lib/agency|@/lib/queries/agency|@/stores/agency" apps/web/src` returns no imports.
- `bun run check` and `bun run check-types` pass.

### Phase 4 - Bring Workspace Under the Pattern

Goal: refactor workspace nodes, board, marketplace-owned workspace reads, and canvas into golden layers.

Tasks:

1. Create `apps/web/src/features/workspace`.
2. Move workspace UI from `apps/web/src/components/workspace` into:
   - `features/workspace/workspace-node-card.tsx`
   - `features/workspace/editor/*`
   - `features/workspace/node/*`
   - `features/workspace/blocks/*`
3. Split `apps/web/src/stores/workspace.ts` into:
   - server cache hooks/query options
   - mutation store
   - local editor state store, if still needed
4. Move `apps/web/src/lib/workspace/use-node-page.ts` and `use-node-sharing.ts` into feature hooks.
5. Move workspace-specific utility files from `apps/web/src/lib/utils` into the workspace feature or `packages/workspace/src`:
   - block creation
   - block registry
   - block presets
   - workspace node formatting and dashboard helpers
   - node connection helpers and tests
6. Keep `packages/workspace/src` as pure domain logic with no React, TanStack Query, Zustand, or browser globals.
7. Split `packages/api/src/routers/workspace/index.ts` into router, schemas, and service files with thin router handlers.
8. Convert marketplace operations inside workspace service into an explicit subdomain or router namespace.

Exit gate:

- Pages import workspace public feature components, not `components/workspace/*`.
- Workspace views do not call stores, query hooks, or oRPC directly.
- `packages/workspace/src` remains pure and has colocated tests for non-trivial rules.

### Phase 5 - Bring Dashboard Agent Under the Pattern

Goal: align dashboard agent chat UI, store, API, and model/tool logic.

Tasks:

1. Create `apps/web/src/features/dashboard-agent`.
2. Move `apps/web/src/components/dashboard/agent-chat/*` and `dashboard-agent-chat-panel.tsx`.
3. Split `apps/web/src/stores/dashboard-agent-chat.ts` into:
   - query hooks
   - mutation store
   - view state store, only where needed
4. Move agent-specific UI helpers from `apps/web/src/lib/utils/dashboard-agent-*` into the feature.
5. Split `packages/api/src/routers/agent.ts` into `agent/router.ts`, `agent/service.ts`, and `agent/schemas.ts`.
6. Keep `packages/agent/src` pure with no web or server app imports.
7. Add tests for conversation append, rename/delete, and tool-call view model behavior.

Exit gate:

- Dashboard pages render a public feature component.
- Presentational agent views receive typed view-model props only.
- API router contains no business workflow beyond procedure wiring.

### Phase 6 - Bring Team, Auth, Shell, Billing, and Marketplace Under the Pattern

Goal: remove remaining feature behavior from generic `components`, `lib`, and `stores`.

Tasks:

1. Team:
   - create `apps/web/src/features/team`.
   - move `team-settings-modal.tsx` and `stores/team.ts`.
   - split `packages/api/src/routers/team` into schemas/router/service with actor-first service inputs.
2. Auth:
   - create `apps/web/src/features/auth`.
   - move login UI and protected-route composition.
   - keep Better Auth setup in `packages/auth` as infrastructure.
3. App shell:
   - classify shell as `shared-infrastructure` or create `features/app-shell`.
   - move `app-shell*`, `stores/app-shell.ts`, and `lib/shell/*` together.
   - keep shell route composition free of feature mutations.
4. Subscription billing:
   - separate product subscription billing from agency ops billing in naming and hooks.
   - ensure billing page has container/hook/view split.
5. Marketplace:
   - create `apps/web/src/features/marketplace`.
   - move page queries into hooks and mutation orchestration into stores or feature hooks.
   - keep marketplace cards and modals presentational.
6. Marketing/legal:
   - classify as `static-presentation`.
   - remove health-check query from `marketing-page-shell.tsx` or move it into a shell/status hook if it is product behavior.

Marketplace implementation note: the page now uses `features/marketplace/hooks/use-marketplace-page.ts` for orchestration and a props-only `views/marketplace-page-surface.tsx`.

Exit gate:

- `apps/web/src/components` contains only approved shared primitives, app infrastructure, or is empty.
- `apps/web/src/stores` contains only approved infrastructure stores or is empty.
- Product features are imported from `apps/web/src/features/*`.

### Phase 7 - Server Operations and App Boundary

Goal: keep server app concerns out of features while preserving operational scripts.

Tasks:

1. Keep Hono, request handling, websocket setup, auth context, CORS, and startup in `apps/server/src/app.ts` and `apps/server/src/lib`.
2. Move operational scripts into explicit folders if needed:
   - `apps/server/src/operations/seeds`
   - `apps/server/src/operations/imports`
   - `apps/server/src/operations/backfills`
   - `apps/server/src/operations/maintenance`
3. Add comments or docs explaining that direct DB access is allowed in server operations, not feature runtime code.
4. Ensure operations call feature services only when they need to preserve business workflows; otherwise they can write DB directly with idempotent checks.
5. Keep notification digest and push delivery behind service-style functions with tests for pure scheduling/copy logic.

Exit gate:

- Feature services can run in tests without starting Hono.
- No API service imports `apps/server`.
- Operational scripts are excluded from golden feature checks or explicitly classified.

### Phase 8 - Persistence and API Contract Audit

Goal: verify persistence and wire contracts match the golden rules.

Tasks:

1. For each DB schema file, map tables to owning feature domains.
2. For every table used by a list/filter/summary endpoint, verify supporting indexes.
3. Confirm schema changes have migrations and metadata under `packages/db/src/migrations`.
4. Move reusable API schemas to feature `schemas.ts` files or `agency-ops/shared/schemas.ts` only when genuinely shared.
5. Confirm dates cross API boundaries as ISO strings.
6. Confirm nullable fields are represented as nullable, not optional.
7. Confirm every product router validates input at the boundary and parses every output through
   Zod, including Workspace, Billing, Team, Agent, Notifications, and System routes.
8. Complete the canonical requirement matrix with direct evidence for persistence ownership,
   referential behavior, indexes, soft-delete filters, wire serialization, and route export
   ownership.

Exit gate:

- Each feature checklist has persistence, API schema, router, service, web query/state, UI, live
  sync, and tests marked `pass` or justified `N/A`, with direct evidence.
- `bun run db:generate` produces no unintended schema drift after committed migrations, and a
  subsequent worktree diff proves that the generator wrote nothing.

### Phase 9 - Error Handling, Auth, Membership, and Naming Audit

Goal: make failures, authorization, and names consistent across all layers.

Tasks:

1. Audit server error handling:
   - services throw `ORPCError` with specific codes for user-actionable failures.
   - `packages/api/src/dev-errors.ts` and `packages/api/src/procedures.ts` remain the only generic unexpected-error translation points.
   - routers do not wrap service errors with feature-specific ad hoc handling.
2. Audit web error handling:
   - hooks and stores normalize unknown errors through `get-error-message.ts` and `orpc-error.ts`.
   - views receive display-ready error strings or typed error state through view models.
   - views never inspect raw exception objects.
3. Audit auth and membership:
   - procedure middleware owns authentication and subscription tier checks.
   - services own resource membership and role checks.
   - client-sent `teamId`, `userId`, or role values are never trusted for authorization.
   - role requirements use least privilege: viewer, editor, owner.
4. Audit naming:
   - DB tables use `agencyOps<Resource>` in TypeScript and `agency_ops_resource` in SQL.
   - API schemas use `agency<Resource>Schema`.
   - routers use `<feature>Router`.
   - service functions are verb-first.
   - containers, hooks, view models, views, stores, and tests use the names from `docs/golden-file-pattern.md`.
5. Add naming and error-handling checks to the golden checker where simple static checks are reliable.
6. Add focused authorization tests for the highest-risk mutation paths in every product domain,
   including Team and Workspace.

Exit gate:

- Feature services expose no generic `Error` throws for user-actionable failures.
- Views display errors from view models, not exceptions.
- Auth, subscription, membership, and role checks are assigned to the correct layer.
- Naming deviations are either fixed or documented as stable public API compatibility.

### Phase 10 - Realtime, Notifications, and Cross-Feature Reads

Goal: make cross-domain integration deliberate and traceable.

Tasks:

1. Define an integration registry for agency events:
   - event type
   - producer service
   - consumer cache handler
   - notification fanout, if any
   - tests
2. Keep live events typed and validated before publish.
3. Keep notification fanout after durable writes.
4. Move cache patching/refetch behavior to query-cache modules owned by the affected domain or shared only when cross-domain.
5. Document every cross-feature read/write:
   - reports reading time entries
   - billing reading clients, rates, time entries, invoices
   - resourcing reading time entries and members
   - notifications consuming tasks, timers, journey events
6. Add tests for the riskiest cross-feature contracts.

Exit gate:

- Every event and cross-feature service path has one owner and one documented consumer path.
- Live handlers patch or refetch the smallest reliable cache surface.

### Phase 11 - Final Verification and Cleanup

Goal: prove the whole codebase meets the target, then remove scaffolding.

Tasks:

1. Remove temporary allowlist entries from the golden checker.
2. Remove old compatibility imports if no public API requires them.
3. Run:
   - `bun run check`
   - `bun run check-types`
   - `bun run check:golden`
   - `bun run check:realtime`
   - `bun run check:unused`
   - `bun test` with generated output excluded from discovery
   - targeted `bun test` commands for moved domains
   - any required migration checks
4. Inspect route and oRPC type compatibility for moved routers.
5. Update `README.md`, `DEVELOPMENT.md`, or `CONTRIBUTING.md` with the golden feature workflow.
6. Archive the superseded plan as [`legacy-exec-plan.md`](legacy-exec-plan.md). ✅
7. Reconcile every exemplar path and “Current Golden Exemplar Gap” in
   `docs/golden-file-pattern.md` with the implemented architecture.

Exit gate:

- No unknown or silently out-of-scope source artifacts remain in the inventory.
- No transitional architectural allowlist entry remains. Permanent classification exclusions are
  documented separately and cannot suppress a golden-feature violation.
- `bun run check` and `bun run check-types` pass unconditionally.
- Every other required verification command passes. A command may be removed from the program
  only through an explicit scope decision recorded in this plan, not a generic “pre-existing”
  waiver.
- The PR or final change summary lists affected layers and test coverage by domain.

## Per-Feature Definition of Done

Each feature is done when:

- Every applicable item in the canonical Layer Ownership Checklist is `pass`, and every `N/A`
  has a feature-specific rationale and evidence.
- Persistence is owned by the feature schema/migrations or explicitly has no persistence.
- API contract schemas exist and parse router output.
- Router is thin and imports no DB/query modules.
- Service owns authorization, business validation, transactions, mapping, live events, and notifications.
- Public service functions accept `actorUserId` first and one input object second.
- Query keys come from oRPC utilities.
- Mutation orchestration lives in feature stores or hooks, not views.
- Errors are normalized outside views and displayed from the view model.
- Auth, subscription, membership, and role checks happen in the correct layer.
- Names match the golden naming conventions or are documented compatibility exceptions.
- Public entry component exports a container.
- Container is tiny.
- Hook returns a typed view model.
- View is presentational.
- Pure helpers are dependency-light and tested.
- Page only composes route context and feature surfaces.
- Empty, loading, error, disabled, pending, optimistic, rollback, and success states are represented where applicable.
- Tests cover pure rules, risky service behavior, and complex view state.
- `bun run check` and `bun run check-types` pass, and the feature's unit, service/API, and UI/hook
  test commands pass where the canonical testing minimum applies.

## Request Flow Audit

Before closing a feature, trace every user action through the full path:

1. User command.
2. Presentational view.
3. Feature hook handler.
4. Store or query mutation.
5. oRPC endpoint.
6. Router validation.
7. Service authorization and business rules.
8. Tables read or written.
9. API record mapping.
10. Live event or notification fanout.
11. Query cache patch, invalidation, or refetch.
12. Optimistic UI state.
13. Failure rollback.
14. Tests covering the behavior.

## Recommended Execution Order

1. Phase 0 and Phase 1 first, so the rest of the work is measurable.
2. Phase 2 and Phase 3 next, because agency is already closest to the target and provides the working reference.
3. Phase 4 and Phase 5 next, because workspace and dashboard agent are the largest non-agency feature clusters.
4. Phase 6 for remaining product surfaces.
5. Phase 7 through Phase 11 as cross-cutting hardening and final proof.

Do not mix large domain moves with behavior changes unless the behavior change is required to preserve the golden boundary. Prefer mechanical moves plus import updates, then focused extraction of hooks/stores/views, then tests.
