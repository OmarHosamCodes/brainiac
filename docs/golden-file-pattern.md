# Golden File Pattern

This document establishes the golden feature pattern for Brainiac. Use it when adding, expanding, or reviewing a feature that spans persistence, API contracts, business logic, live sync, client state, and UI.

The exemplar feature is **Agency Time Tracking** because it is moderately complex and touches every important layer without being too broad:

- Data model: `agencyOpsTimeEntry` and `agencyOpsActiveTimer`
- API surface: `agencyOps.timer`, `agencyOps.timeEntries`, and `agencyOps.summary`
- Business rules: timer start/stop, manual entries, edit/delete, summaries, permissions
- Cross-feature consumers: reports, billing, resourcing, projects, notifications
- Realtime behavior: `timer.updated` live events
- Web state: TanStack Query cache, Zustand mutation stores, optimistic overlays
- UI: exported feature components, containers, hooks, view models, presentational views
- Tests: pure domain tests and API helper tests

## Golden Principle

Each layer has one job, and data moves in one direction:

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

No layer should reach around the layer below it. UI code does not call Drizzle. Routers do not contain business workflows. Presentational views do not call oRPC. Pure domain helpers do not import React, Zustand, TanStack Query, Drizzle, or environment modules.

## Exemplar File Map

### Persistence Layer

```text
packages/db/src/schema/agency-ops.ts
packages/db/src/migrations/0001_bright_stellaris.sql
packages/db/src/migrations/0006_agency_task_threads.sql
packages/db/src/migrations/0016_project_journey.sql
packages/db/src/migrations/meta/*
```

`packages/db/src/schema/agency-ops.ts` owns persisted shape, foreign keys, indexes, soft-delete columns, enum-like string types, and Drizzle table exports.

For time tracking, the golden persisted contract is:

- `agencyOpsTimeEntry`: immutable-ish completed work logs with `teamId`, `projectId`, optional `taskId`, optional `journeyStepId`, `userId`, `source`, `description`, `startedAt`, `endedAt`, `durationSeconds`, timestamps, and `deletedAt`.
- `agencyOpsActiveTimer`: exactly one active timer per user via `agency_ops_active_timer_user_unique`.
- Indexes match query access patterns: team/date, team/project, team/task, team/user, user/date, journey step, and soft-delete scans.

Rules:

- Add or change columns in Drizzle schema first, then generate a migration.
- Encode referential behavior deliberately: cascade for owning team/project rows, `set null` for optional task or journey links that can disappear.
- Add indexes with the service query patterns in mind. Every list, filter, and summary endpoint should have a matching path through the indexes.
- Keep database defaults boring: timestamps, soft deletes, and safe string defaults are fine; business defaults belong in service code when they depend on actor, permissions, or request context.
- Export DB types from schema files only when the type describes persisted values, not API response objects.

### API Schema Layer

```text
packages/api/src/routers/agency-ops/shared/schemas.ts
```

`shared/schemas.ts` owns the wire contract shared by multiple agency routers. Time tracking exports:

- `agencyTimeEntrySourceSchema`
- `agencyTimeEntrySchema`
- `agencyActiveTimerSchema`
- `timeSummarySchema`
- shared request helpers such as `teamScopedInputSchema` and `reportsInputSchema`

Rules:

- Router output must parse through Zod before returning.
- API response schemas use serializable values. Dates cross the wire as ISO strings.
- Prefer reusable schemas only for contracts used by multiple routers or multiple client surfaces. Keep endpoint-only input schemas in the router.
- Keep API schema names aligned to resource names: `agencyTimeEntrySchema`, not `timeTrackingRowSchema`.
- If a field is nullable in the response, represent it as nullable in the schema, not optional. Optional means the server may omit it.

### API Router Layer

```text
packages/api/src/routers/agency-ops/time-tracking/router.ts
packages/api/src/routers/agency-ops/index.ts
packages/api/src/routers/index.ts
```

The router owns oRPC procedure shape and nothing more. It wires auth/pro subscription requirements, validates input, calls service functions, parses output, and exposes a stable route tree.

Golden time tracking route tree:

```text
agencyOps.timer.getActive
agencyOps.timer.listActiveMembers
agencyOps.timer.start
agencyOps.timer.stop
agencyOps.timer.updateStart
agencyOps.timeEntries.listMine
agencyOps.timeEntries.createManual
agencyOps.timeEntries.updateMine
agencyOps.timeEntries.deleteMine
agencyOps.summary.list
```

Rules:

- Use `protectedProProcedure` for agency pro features unless the feature is intentionally public or non-pro.
- Define endpoint-specific input inline with Zod when it is not shared elsewhere.
- Keep handlers thin: `parse(await service(actorUserId, input))`.
- The actor comes from `context.session.user.id`; clients never send actor identity for authorization.
- Do not issue Drizzle queries in routers.
- Do not update caches, emit live events, or send notifications from routers. Those belong in services after the data mutation succeeds.
- Export the feature router through the nearest aggregate router, as time tracking does in `agency-ops/index.ts`.

### Service and Data Access Layer

```text
packages/api/src/routers/agency-ops/time-tracking/service.ts
packages/api/src/routers/agency-ops/time-tracking/resolve-agency-timer-stop-binding.ts
packages/api/src/routers/agency-ops/shared/membership.ts
packages/api/src/routers/agency-ops/shared/utils.ts
```

Brainiac currently keeps feature-local data access inside the service file. That is the golden pattern unless a service grows enough that private repository helpers make it materially clearer.

The service owns:

- Membership checks via `requireTeamMembership`.
- Permission level selection: viewer/editor/owner.
- Request-level business validation.
- Date parsing and range validation.
- Drizzle reads and writes.
- Transactions.
- Mapping database rows to API records.
- Soft-delete filtering.
- Cross-table consistency updates.
- Live event publication.
- Notification fanout.
- Shared helper calls.

Time tracking examples:

- `startAgencyTimer` resolves project/task ownership, rolls over an existing active timer, inserts an active timer, updates task status, publishes `timer.updated`, and notifies activity.
- `stopAgencyTimer` validates the active timer, resolves task binding, inserts a completed time entry transactionally, deletes the active timer, publishes live state, and sends the stopped notification.
- `listMyAgencyTimeEntries` applies actor/team filters, excludes soft-deleted entries, paginates, and computes the current week summary in the viewer's timezone.
- `createManualAgencyTimeEntry`, `updateMyAgencyTimeEntry`, and `deleteMyAgencyTimeEntry` enforce ownership by actor and team.
- `listAllAgencyTimeEntries` and `updateAnyAgencyTimeEntry` are admin/reporting paths that require elevated membership.

Rules:

- Every exported service function accepts `actorUserId` first and an input object second.
- Authorization happens before returning protected data and before mutating data.
- Team scoping is mandatory for every agency query and mutation.
- Soft-deleted rows are filtered with `isNull(deletedAt)` unless the endpoint explicitly needs deleted records.
- Validate date ranges in service code even if the router validates string format.
- Use transactions for multi-step writes that must stay consistent.
- Generate IDs in the service with `createWorkspaceId`.
- Return mapped API records, never raw Drizzle rows.
- Keep row mappers close to the queries they support.
- Throw `ORPCError` with specific codes for user-actionable failures.
- Pure decision logic should be extracted into a dependency-light helper and tested, as with `resolve-agency-timer-stop-binding.ts`.

### Cross-Feature Integration Layer

```text
packages/api/src/routers/agency-ops/reports/router.ts
packages/api/src/routers/agency-ops/reports/service.ts
packages/api/src/routers/agency-ops/billing/service.ts
packages/api/src/routers/agency-ops/resourcing/service.ts
packages/api/src/routers/agency-ops/projects/service.ts
packages/api/src/routers/notifications/fanout.ts
packages/api/src/routers/agency-ops/live/live.ts
```

Some feature data becomes a platform primitive. Time entries are consumed by reports, billing, resourcing, project journeys, and notifications.

Rules:

- The source feature owns canonical mutations for its table.
- Other features may read canonical tables when the read model belongs to their domain.
- Other features should not duplicate write rules. If they need to write the canonical table, expose a deliberately named service path with stricter permissions, as reports does with `updateAnyAgencyTimeEntry`.
- Emit live events from the service that changed the canonical state.
- Keep live event payloads schema-validated.
- Notification fanout should happen after durable writes succeed.

### Realtime Layer

```text
packages/api/src/routers/agency-ops/live/live.ts
packages/api/src/routers/agency-ops/live/router.ts
apps/web/src/features/shared/live/agency-live-handlers.ts
apps/web/src/features/shared/live/agency-live-connection.ts
apps/web/src/features/shared/live/agency-live-connected.ts
```

The backend publishes typed team-scoped events. The frontend patches or refetches the smallest affected cache surface.

For time tracking:

- Server publishes `timer.updated` through `publishAgencyTimerUpdated`.
- Web handles it in `handleAgencyLiveEvent`.
- If the event belongs to the current viewer, the active timer cache is patched.
- If it belongs to another user, the active members cache is patched.

Rules:

- Live events include `type`, `teamId`, affected IDs, and `updatedAt`.
- Validate events before publishing.
- Prefer targeted cache patching for small state changes.
- Prefer refetch for derived or broad state where patching would duplicate server logic.
- Polling is a fallback. Query options should be live-gated when a live connection is active.

### Web API Client and Query Layer

```text
apps/web/src/lib/orpc.ts
apps/web/src/features/shared/agency-queries.ts
apps/web/src/features/shared/agency-query-options.ts
apps/web/src/features/shared/agency-query-cache.ts
apps/web/src/lib/queries/agency-optimistic.ts
apps/web/src/lib/query-client.ts
```

The query layer owns server cache keys, oRPC TanStack query options, polling/live sync policy, query registration, and shared optimistic merge behavior.

Time tracking hooks:

- `useAgencyActiveTimerQuery`
- `useAgencyTimeEntriesQuery`
- `useAgencyActiveMembersQuery`
- `useAgencyPresenceMembers`

Rules:

- Build query keys through `orpc.*.queryOptions` or `orpc.*.queryKey`. Do not hand-roll cache keys.
- Add shared query hooks in `agency-queries.ts` only when multiple feature surfaces use the data or the query participates in shared boot/live behavior.
- Keep endpoint-specific fetching in the feature hook when no shared cache behavior is needed.
- Use `withAgencySyncQueryOptions` for agency data that participates in live/poll sync.
- Register active queries when mutation stores or live handlers need to patch/refetch them.
- Add query-key predicates in `agency-query-cache.ts` for every cache surface that can be patched or refetched.
- Keep optimistic overlays in `apps/web/src/features/shared/stores/agency-optimistic.ts` and merge them through `apps/web/src/lib/queries/agency-optimistic.ts`.

### Web Mutation and Client State Layer

```text
apps/web/src/features/time-tracking/stores/agency-time-tracking.ts
apps/web/src/features/time-tracking/stores/agency-time-entries-log.ts
apps/web/src/features/time-tracking/stores/agency-timer.ts
apps/web/src/features/shared/stores/agency-optimistic.ts
apps/web/src/features/shared/stores/agency-ops.ts
```

Zustand stores own client-side mutations, pending flags, optimistic cache snapshots, toast/error behavior, and local UI state that must survive component boundaries.

Time tracking store responsibilities:

- Track pending timer start/stop/update counts.
- Maintain per-team timer drafts.
- Register active timer and log query keys.
- Call `orpcClient.agencyOps.*` mutations.
- Patch active timer and task caches optimistically.
- Refetch active timer and time entry lists after mutations.
- Revert snapshots on failures.
- Highlight newly created or duplicated entries.

Rules:

- Keep server mutations out of views.
- Store mutation methods should accept command payloads, not DOM events.
- Snapshot affected caches before optimistic writes.
- Roll back snapshots on failure.
- Clear pending state in `finally`.
- Use feature stores for feature-specific mutation orchestration.
- Use shared stores only when multiple features need the same overlay or registration.
- Local-only view state can live in hooks or small feature stores; choose the smaller scope.

### Web Feature Layer

```text
apps/web/src/features/time-tracking/agency-time-tracker.tsx
apps/web/src/features/time-tracking/agency-mini-timer.tsx
apps/web/src/features/time-tracking/entries/agency-time-entries-log.tsx
apps/web/src/features/time-tracking/containers/*
apps/web/src/features/time-tracking/hooks/*
apps/web/src/features/time-tracking/*-view.tsx
apps/web/src/features/time-tracking/entries/*-view.tsx
apps/web/src/features/time-tracking/choosers/*-view.tsx
```

The feature folder exposes stable public components and keeps implementation detail behind containers, hooks, and views.

Golden component split:

```text
agency-time-tracker.tsx
  -> exports AgencyTimeTrackerContainer as AgencyTimeTracker

containers/agency-time-tracker-container.tsx
  -> calls useAgencyTimeTracker()
  -> renders <AgencyTimeTrackerView view={view} />

hooks/use-agency-time-tracker.ts
  -> composes queries, stores, effects, derived labels, permissions, handlers
  -> returns AgencyTimeTrackerViewModel

agency-time-tracker-view.tsx
  -> presentational component
  -> receives view model props
  -> renders UI and calls provided handlers
```

Rules:

- Feature entry files should re-export containers under product-facing names.
- Containers should be tiny. They bind props to hooks and pass view models to views.
- Hooks own composition: queries, stores, effects, memoized derived data, event handlers, and view models.
- Views own markup only. They should not call oRPC, query hooks, stores, auth, or router APIs.
- View props should be explicit and typed. Prefer a named `ViewModel` type for complex surfaces.
- Split repeated view sections into presentational subviews.
- Keep domain logic outside JSX when it can be tested as a pure function.
- Use shared UI primitives from `apps/web/src/ui` and shared agency styling helpers from `features/shared/agency-ui` when available.

### Pure Domain Helper Layer

```text
apps/web/src/features/time-tracking/timer-validation.ts
apps/web/src/features/time-tracking/time-entry-draft.ts
apps/web/src/features/time-tracking/group-time-entries.ts
apps/web/src/features/time-tracking/format-agency-day-label.ts
packages/api/src/routers/agency-ops/time-tracking/resolve-agency-timer-stop-binding.ts
```

Pure helpers make behavior testable and keep hooks/services readable.

Rules:

- Pure helpers should accept plain objects and return plain objects, primitives, or discriminated results.
- No React, Zustand, TanStack Query, Drizzle, oRPC client, or browser globals unless the helper is explicitly browser-only.
- Prefer typed result unions over throwing for UI-level validation helpers.
- Service-level helpers may throw only when they are part of a service workflow; otherwise return explicit error variants.
- Co-locate tests beside helpers.

### Page and Route Integration Layer

```text
apps/web/src/pages/agency-page.tsx
apps/web/src/authenticated-routes.tsx
apps/web/src/components/app-shell*.tsx
```

Pages compose feature surfaces and provide route-level context. They should not contain feature business rules.

Rules:

- Pages select the active team, layout shell, tabs, and high-level feature composition.
- Pages pass IDs and route state into features.
- Pages do not perform feature mutations directly.
- If page state becomes feature behavior, move it into a feature hook or store.

### Server App Layer

```text
apps/server/src/app.ts
apps/server/src/index.ts
packages/api/src/index.ts
packages/api/src/context.ts
```

The server app hosts the API package. Feature code should not leak Hono app concerns into services.

Rules:

- API services receive actor/session state through procedure context, not global request state.
- Server boot concerns stay in `apps/server`.
- Feature services should be runnable in tests without starting Hono.

### Auth, Billing, and Membership Layer

```text
packages/api/src/procedures.ts
packages/api/src/billing-guard.ts
packages/api/src/routers/agency-ops/shared/membership.ts
packages/auth/src/index.ts
```

Rules:

- Procedure middleware enforces authentication and subscription tier.
- Services enforce resource-specific membership and role.
- Never trust `teamId`, `userId`, or role sent from the client.
- Use the least role that supports the operation:
  - `viewer`: read data, personal timer mutations, personal time entries.
  - `editor`: team-level reporting reads or operational updates.
  - `owner`: administrative edits that affect other users or billing-sensitive data.

### Error Handling Layer

```text
packages/api/src/dev-errors.ts
packages/api/src/procedures.ts
apps/web/src/lib/utils/get-error-message.ts
apps/web/src/lib/utils/orpc-error.ts
```

Rules:

- Services throw `ORPCError` with clear codes and user-actionable messages.
- Router middleware converts unexpected errors consistently.
- Web stores/hooks normalize errors for toast messages and inline error states.
- Views display errors from view models, not raw exception objects.

### Testing Layer

```text
packages/api/src/routers/agency-ops/time-tracking/resolve-agency-timer-stop-binding.test.ts
apps/web/src/features/time-tracking/timer-validation.test.ts
apps/web/src/features/time-tracking/time-entry-draft.test.ts
apps/web/src/features/time-tracking/group-time-entries.ts
apps/web/src/features/time-tracking/task-tracking-state.test.ts
```

Golden testing strategy:

- Test pure helpers exhaustively.
- Test cross-layer edge cases at the lowest practical layer.
- Add service tests when authorization, transactions, or query filters become risky.
- Add UI tests when user workflows, keyboard behavior, accessibility, or rendering state can regress.
- Prefer `bun:test` for local unit tests.

For time tracking, the important behavior under test is:

- Timer start/stop eligibility.
- Task/project resolution for stopping timers.
- Manual entry draft parsing, duration editing, and overnight entries.
- Time entry grouping and recency buckets.
- Task tracking and state transitions.

New feature minimum:

- One pure helper test for non-trivial rules.
- One API/service test or route-level test if the feature writes data or enforces non-obvious permissions.
- One UI/hook test if view state can diverge from server state.

## New Feature Template

Use this structure for a new agency feature named `feature-name`.

```text
packages/db/src/schema/agency-ops.ts
packages/db/src/migrations/NNNN_feature_name.sql

packages/api/src/routers/agency-ops/shared/schemas.ts
packages/api/src/routers/agency-ops/feature-name/router.ts
packages/api/src/routers/agency-ops/feature-name/service.ts
packages/api/src/routers/agency-ops/feature-name/*.test.ts
packages/api/src/routers/agency-ops/index.ts

apps/web/src/features/feature-name/feature-name.tsx
apps/web/src/features/feature-name/containers/feature-name-container.tsx
apps/web/src/features/feature-name/hooks/use-feature-name.ts
apps/web/src/features/feature-name/feature-name-view.tsx
apps/web/src/features/feature-name/stores/feature-name.ts
apps/web/src/features/feature-name/*.test.ts

apps/web/src/features/shared/agency-queries.ts
apps/web/src/features/shared/agency-query-cache.ts
apps/web/src/features/shared/live/agency-live-handlers.ts
```

Add shared query/cache/live files only when the feature participates in shared boot, live sync, optimistic overlays, or cross-feature reads.

## Request Flow Checklist

For each user action, trace the whole path before coding:

1. What user command starts it?
2. Which view renders the command?
3. Which hook creates the handler?
4. Which store or query mutation executes it?
5. Which oRPC endpoint is called?
6. Which router validates the input?
7. Which service function authorizes and applies business rules?
8. Which tables are read or written?
9. Which records are returned?
10. Which live events or notifications are emitted?
11. Which query caches are patched, invalidated, or refetched?
12. Which UI state changes optimistically?
13. What rolls back on failure?
14. Which tests cover the behavior?

## Layer Ownership Checklist

Use this checklist in PRs.

### Database

- Table names, columns, foreign keys, indexes, and soft-delete behavior are explicit.
- Migration is generated and committed with metadata.
- Query patterns have supporting indexes.
- Persisted enum strings are typed.

### API Contract

- Input validation exists at the router boundary.
- Output is parsed through Zod.
- Dates are ISO strings across the wire.
- Nullable versus optional fields are intentional.
- Route names match product language and resource ownership.

### Service and Data Access

- `actorUserId` is first argument.
- Team membership is checked before protected reads/writes.
- Role requirement is least-privilege and explicit.
- Service validates invariants the client cannot be trusted to enforce.
- Multi-step writes are transactional.
- Soft-deleted rows are excluded.
- Row mappers return API records, not database rows.
- Live events and notifications fire after successful writes.
- Cross-feature writes are deliberate and named.

### Web Query

- Query keys come from oRPC utilities.
- Query options use the correct sync tier.
- Live-gated queries disable polling when connected.
- Cache predicates exist for patched/refetched data.
- Optimistic merge behavior is centralized when shared.

### Web State

- Mutations are not run directly from views.
- Pending flags are represented.
- Optimistic changes snapshot affected caches.
- Failure paths roll back and surface a useful message.
- Store payloads are commands, not UI events.

### UI

- Entry component exports a container as the public feature component.
- Container is thin.
- Hook returns a typed view model.
- View is presentational.
- Repeated UI sections are split into subviews.
- Empty, loading, error, disabled, and success states are represented.
- Text and controls fit existing app-shell and agency UI conventions.

### Tests

- Pure rules have unit tests.
- Permission or transaction-heavy service behavior has API/service tests.
- Complex view state has hook/component tests.
- Regression tests are colocated with the logic they protect.

## Naming Conventions

Use names that reveal layer and ownership:

- DB tables: `agencyOps<Resource>` in TypeScript, `agency_ops_resource` in SQL.
- API schemas: `agency<Resource>Schema`.
- API routers: `<feature>Router`.
- API services: verb-first exported functions, for example `startAgencyTimer`.
- Feature public components: `AgencyTimeTracker`.
- Containers: `AgencyTimeTrackerContainer`.
- Hooks: `useAgencyTimeTracker`.
- View models: `AgencyTimeTrackerViewModel`.
- Views: `AgencyTimeTrackerView`.
- Stores: `useAgencyTimeTrackingStore`.
- Tests: colocated `*.test.ts` or `*.test.tsx`.

Avoid generic names such as `data.ts`, `helpers.ts`, or `utils.ts` inside new feature folders unless the file is truly small and local. Prefer a domain name like `timer-validation.ts` or `group-time-entries.ts`.

## Current Golden Exemplar Gaps To Avoid Repeating

The existing time tracking feature is the pattern, but it also exposes a few improvements for future work:

- `service.ts` is large. Keep the single-file service pattern initially, but split private read/write helpers once a file becomes hard to scan.
- `time-entry-draft.test.ts` uses direct `node:assert` with top-level execution instead of `bun:test`. New tests should prefer `bun:test`.
- Some API read models for time entries are repeated in multiple select blocks. New services should extract a private select/map helper when repetition becomes meaningful.
- Shared `agency-queries.ts` is broad. New feature-specific queries should stay in the feature folder unless they need shared boot/live/optimistic behavior.

These are not reasons to bypass the architecture. They are cleanup targets when touching the area.

## Definition Of Done

A feature following this pattern is done when:

- Persistence, API, service, web query/state, UI, live sync, and tests have been considered explicitly.
- `bun run check` passes.
- `bun run check-types` passes.
- Any migration needed by schema changes is committed.
- The PR description lists affected layers and test coverage.
