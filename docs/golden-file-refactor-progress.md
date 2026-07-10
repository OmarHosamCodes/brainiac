# Golden File Pattern — Refactor Progress Log

_Last updated: 2026-07-10 (completion validation reopened)_

---

## Validation Correction — Overall Refactor Reopened

The 2026-07-10 requirement-by-requirement audit disproved the earlier Phase 11 completion claim.
The relocations and tests below remain useful landed work, but green phase badges do not override
the current validation result in `docs/golden-file-master-implementation-plan.md`.

Highest-priority open gates:

1. Replace path-only source classification with a semantic, full-scope inventory and per-feature
   canonical requirement matrix.
2. Remove the five view exceptions and catch indirect orchestration in Billing, Team,
   Notifications, and other presentational files.
3. Close every unchecked Phase 8/9 audit item, including router Zod outputs and high-risk Team and
   Workspace authorization tests.
4. Repair the React/Vite Knip configuration and either resolve or explicitly own every finding;
   `bun run check:unused` currently fails.
5. Reconcile changed exemplar paths and resolved gaps back into `docs/golden-file-pattern.md`.

---

## ⚠️ Phase 0 — Baseline & Tracking (Reopened)

- Generated source inventory.
- Added reproducible inventory generation via `scripts/generate-golden-file-inventory.mjs`; current
  path inventory covers 646 TypeScript/TSX files. Semantic classification and expanded source
  scope remain open.
- Baselines: `bun run check` ✅ · `bun run check-types` ✅ · 163 tests pass ✅
- Decided to **delete** legacy compat re-exports instead of deprecating them.

---

## ⚠️ Phase 1 — Enforce Golden Boundaries (Reopened)

Extended [`scripts/check-conventions.mjs`](../scripts/check-conventions.mjs) with four enforcement rules:

| Rule               | What it blocks                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| View imports       | `*-view.tsx` cannot import `@tanstack/react-query`, `@/lib/orpc`, `orpcClient`, or feature/global stores |
| Router imports     | API routers cannot import `@orch/db` or `drizzle-orm` directly                                           |
| Feature lib/stores | Feature files must live in `features/`, not `lib/` or `stores/` (with allowlist for legacy files)        |
| Generic utils      | New `utils.ts`, `helpers.ts`, or `data.ts` files inside feature folders are blocked                      |

---

## ◐ Phase 2 — Complete Agency Backend Alignment (Targeted Gates Pass; Matrix Pending)

| Change                                                                                                            | Result      |
| ----------------------------------------------------------------------------------------------------------------- | ----------- |
| Deleted `live.ts` + `tenure-engine.ts` compat re-exports                                                          | ✅          |
| Wrapped admin time-entry calls inside `reports/service.ts`                                                        | ✅          |
| Split `shared/utils.ts` into 6 domain helpers (`date`, `avatar`, `lookup`, `report`, `task`, `journey`)           | ✅          |
| Updated all 7 service files (`billing`, `clients`, `projects`, `reports`, `resourcing`, `tasks`, `time-tracking`) | ✅          |
| `bun run check` · `check-types` · 163 tests                                                                       | ✅ all pass |

New helper files under `packages/api/src/routers/agency-ops/shared/`:

- `date-helpers.ts`
- `avatar-helpers.ts`
- `lookup-helpers.ts`
- `report-helpers.ts`
- `task-helpers.ts`
- `journey-helpers.ts`

---

## ⚠️ Phase 3 — Complete Agency Web Alignment (Reopened)

### Task 1 — Move shared lib files into `features/shared/` ✅ Complete

Files moved via `git mv` and all import references updated:

| Original path                                    | New path                                                     |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `apps/web/src/lib/agency-management-sections.ts` | `apps/web/src/features/shared/agency-management-sections.ts` |
| `apps/web/src/lib/agency-segments.ts`            | `apps/web/src/features/shared/agency-segments.ts`            |
| `apps/web/src/lib/agency-settings-sections.ts`   | `apps/web/src/features/shared/agency-settings-sections.ts`   |
| `apps/web/src/lib/queries/agency-optimistic.ts`  | `apps/web/src/features/shared/agency-optimistic.ts`          |
| `apps/web/src/lib/queries/agency-sync.ts`        | `apps/web/src/features/shared/agency-sync.ts`                |

Consumer files updated: `agency-management-surface.tsx`, `agency-queries.ts`, `agency-segment-boot.ts`, `agency-segment-filters.tsx`, `agency-subtitle-breadcrumb.tsx`, `agency-segment-bar.tsx`, `agency-segment-body.tsx`, `use-agency-boot-gate.ts`, `agency-work-surface-container.tsx`, `use-agency-work-surface.ts`, `agency-page.tsx`.

Allowlist entries removed from `scripts/check-conventions.mjs`. `bun run check` passes ✅

---

### Task 2 — Refactor mixed feature components into entry/container/hook/view

#### ✅ Billing — `agency-billing-surface` (complete)

| File                                                               | Role                                |
| ------------------------------------------------------------------ | ----------------------------------- |
| `features/billing/agency-billing-surface.tsx`                      | Entry — re-exports container        |
| `features/billing/containers/agency-billing-surface-container.tsx` | Container                           |
| `features/billing/hooks/use-agency-billing-surface.ts`             | Hook — all queries, state, handlers |
| `features/billing/agency-billing-surface-view.tsx`                 | View — presentational only          |

#### ✅ Reports — 4 components (complete)

| Component                               | Hook                                                 | Container                                                        | View                                             |
| --------------------------------------- | ---------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------ |
| `agency-reports-surface`                | `hooks/use-agency-reports-surface.ts`                | `containers/agency-reports-surface-container.tsx`                | `agency-reports-surface-view.tsx`                |
| `agency-saved-reports-list`             | `hooks/use-agency-saved-reports-list.ts`             | `containers/agency-saved-reports-list-container.tsx`             | `agency-saved-reports-list-view.tsx`             |
| `creator/agency-report-creator-surface` | `creator/hooks/use-agency-report-creator-surface.ts` | `creator/containers/agency-report-creator-surface-container.tsx` | `creator/agency-report-creator-surface-view.tsx` |
| `creator/agency-report-activity-menu`   | `creator/hooks/use-agency-report-activity-menu.ts`   | `creator/containers/agency-report-activity-menu-container.tsx`   | `creator/agency-report-activity-menu-view.tsx`   |

`bun run check` passes ✅

---

#### ✅ Panes

Refactored into hook + container + view:

- `apps/web/src/features/billing/agency-settings-rates-pane.tsx`
- `apps/web/src/features/dashboard/agency-dashboard-surface.tsx`
- `apps/web/src/features/resourcing/tenure/agency-settings-tenure-pane.tsx`
- `apps/web/src/features/settings/agency-settings-integrations-pane.tsx`
- `apps/web/src/features/time-tracking/agency-time-summary.tsx`

#### ✅ Projects & Tasks

Refactored into hook + container + view:

- `apps/web/src/features/projects/agency-project-manager.tsx`
- `apps/web/src/features/projects/agency-project-detail.tsx`
- `apps/web/src/features/projects/agency-project-create-dialog.tsx`
- `apps/web/src/features/projects/agency-projects-table.tsx`
- `apps/web/src/features/task-management/work-surface/agency-work-surface-delegated-view.tsx`
- `apps/web/src/features/task-management/work-surface/agency-work-surface-create-task-popover.tsx`

---

### Task 3 — Convert `node:assert` tests to `bun:test` ✅ Complete

| Test file                                                      | Status       |
| -------------------------------------------------------------- | ------------ |
| `apps/web/src/features/reports/agency-report-fields.test.ts`   | ✅ Converted |
| `apps/web/src/features/reports/agency-report-naming.test.ts`   | ✅ Converted |
| `apps/web/src/features/time-tracking/time-entry-draft.test.ts` | ✅ Converted |

All 176 tests pass ✅

---

## ⚠️ Phase 4 — Workspace Under the Pattern (Reopened)

| Change                                                                                                                                                                            | Status |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| API router split into `router.ts` + `schemas.ts` + `service.ts`                                                                                                                   | ✅     |
| `features/workspace/hooks/` owns query, node-page, node-sharing hooks                                                                                                             | ✅     |
| `features/workspace/utils/` owns all workspace utilities (connections, dashboard tint, marketplace, block registry, block presets, block creation, command catalog, flow adapter) | ✅     |
| `stores/workspace.ts` deleted — consumers updated to `features/workspace/workspace-local-state`                                                                                   | ✅     |
| `lib/workspace/*` deleted — shims removed, no remaining importers                                                                                                                 | ✅     |
| `lib/utils/workspace-*` (6 files) deleted — all moved into `features/workspace/utils/`                                                                                            | ✅     |
| Legacy `components/workspace/` tree removed and consumers retargeted to feature-owned paths                                                                                       | ✅     |
| All import paths updated — no `@/components/workspace` references remain                                                                                                          | ✅     |
| Allowlist entries cleaned up from `check-conventions.mjs`                                                                                                                         | ✅     |
| `bun run check` ✅ · `bun run check-types` ✅ · `bun test` 172 pass (1 pre-existing env failure)                                                                                  | ✅     |

`check-conventions.mjs` allowlist reduced from 18 entries to 5 view exceptions. Each remaining exception now has an explicit owner and removal target in `GOLDEN_VIEW_ALLOWLIST_METADATA`.

Follow-up workspace cleanup: canvas flow components, infinite-canvas wrappers, canvas helpers, and the dashboard workspace sidebar were moved into `features/workspace/canvas` and `features/workspace/dashboard`; no generic canvas/sidebar imports remain.

Follow-up convention cleanup: obsolete dashboard-agent, Team, billing, Marketplace, login, and canvas path exceptions were removed from `check-conventions.mjs` after their relocations.

- Removed the final obsolete workspace utility allowlist entries; generic `lib` no longer contains workspace/agency/team-specific utility paths identified by the audit.

## ◐ Phase 5 — Dashboard Agent Under the Pattern (Implementation Landed; Matrix Pending)

- Added `apps/web/src/features/dashboard-agent` as the public feature boundary.
- Dashboard and node pages now import `DashboardAgentChatPanel` from the feature boundary.
- Relocated the agent-chat presentational files, hook/store, UI helpers, and mention helpers into `features/dashboard-agent`.
- Updated all consumers; no imports remain from the old agent `components`, `stores`, or `lib/utils` paths.
- Promoted the API router to `packages/api/src/routers/agent/router.ts`, added `schemas.ts`, and updated the root router aggregator.
- Extracted persisted model search/favorites state into `hooks/use-dashboard-agent-model-preferences.ts`; the chat hook now composes that feature hook.
- Extracted session-gated queries, query-client access, and chat/rename/delete mutations into `hooks/use-dashboard-agent-data.ts`.
- Extracted tool-call formatting into `dashboard-agent-view-models.ts` and added focused `bun:test` coverage for legacy, running, error, and circular-payload cases.
- Extracted conversation draft, selection, pending-message, tool-preset, and rename/delete dialog state into `hooks/use-dashboard-agent-conversation-state.ts`.
- Moved the free-tier conversation-limit policy into `agent/service.ts` (`assertCanCreateDashboardConversation`); `agent/router.ts` is now limited to procedure wiring, context extraction, service calls, and output parsing.
- Added `agent/conversation-contracts.ts` and `conversation-contracts.test.ts` covering append-title, rename normalization, message preview, and delete-result contracts.
- Added local-Postgres service integration tests covering Dashboard Agent conversation create/list/read/rename/delete and append-turn message/usage persistence, with a deterministic mocked agent runtime.

## ⚠️ Phase 6 — Team, Auth, Shell, Billing, Marketplace, Hardening (Reopened)

### Team alignment

- Relocated `team-settings-modal.tsx` and `team.ts` into `apps/web/src/features/team`.
- Dashboard imports now use the feature-owned modal/store paths.
- Promoted the API router to `packages/api/src/routers/team/router.ts` and added `team/schemas.ts`.
- Moved team-limit billing policy into `assertCanCreateTeam` in the team service.
- Added the Team public entry plus `containers/team-settings-modal-container.tsx` and `views/team-settings-modal-view.tsx`.
- Extracted Team session, store-action selectors, and permission derivation into `hooks/use-team-settings-modal.ts`.
- Extracted Team local drafts, invite state, and delete/remove confirmations into `hooks/use-team-settings-modal-state.ts`.
- Moved Team query options and cache-key helpers from `apps/web/src/lib/queries/team.ts` into `features/team/team-queries.ts`.
- Extracted Team save/invite/role/remove/delete async orchestration into `hooks/use-team-settings-modal-actions.ts`; the view now binds feature handlers and renders the modal.
- Added a local-Postgres Team service integration test covering create/list/read/update/delete persistence and owner membership.

### Phase 6 Audit Notes

- Auth UI and protected-route composition now live under `apps/web/src/features/auth`; Better Auth client/server setup remains infrastructure.
- Moved Auth form schemas into `features/auth/auth-schemas.ts` and removed the stale generic schema-index export.
- Removed unused workspace-specific generic shims for node options, node form schemas, and the legacy block-command catalog re-export.
- App-shell components, store, and shell boot modules now live under `apps/web/src/features/app-shell`.
- Moved shell and dashboard-specific UI token modules from generic `lib/utils` into `features/app-shell/app-shell-ui.ts` and `features/dashboard/dashboard-ui.ts`.
- Moved navigation definitions into `features/app-shell/app-navigation.ts` and shared agency project palette helpers into `features/shared/project-palette.ts`.
- Moved agency rate formatting/parsing from generic `lib/utils` into `features/shared/format-rate.ts`.
- Remaining shared shell visuals (`brand-mark`, `logo-loader`, and page transition) were consolidated under `features/app-shell/components`; no `components/shell` imports remain.
- Subscription billing page now has a public feature entry, container, and view under `features/billing`; existing billing query/mutation behavior remains in `billing-queries.ts` and is shared by agency upsells.
- Marketplace page, cards, import modal, and subtitle breadcrumb now live under `apps/web/src/features/marketplace` with a public entry and container.
- Marketplace orchestration now lives in `hooks/use-marketplace-page.ts`, composing workspace state, debounced filters, infinite pagination, boot gating, and import selection.
- `views/marketplace-page-surface.tsx` is now props-only; the container binds `useMarketplacePage` to the view.
- Marketplace auth-gated infinite query and page flattening remain isolated in `hooks/use-marketplace-query.ts`.
- Added pure Marketplace query-contract helpers and tests for first-page and filtered pagination inputs.
- Removed the idle health-check query from `marketing-page-shell.tsx`; marketing shell output is now static presentation with theme infrastructure only.
- Extracted login session, OAuth error mapping, form controllers, mode state, and auth mutations into `features/auth/hooks/use-login-page.ts`; the page now owns presentation and delegates auth behavior to the hook.
- Classified legal pages and inert marketing artifacts as `static-presentation`; classified `landing-page.tsx` and `landing-pricing.tsx` as `golden-feature` because they contain session and billing behavior.

## ◐ Phase 7 — Server Operations and App Boundary (Implementation Landed; Inventory Pending)

- Classified and moved operational scripts under `apps/server/src/operations/{seeds,imports,backfills,maintenance}`.
- Updated server package commands and operation-to-`src/lib` imports.
- API-to-server import audit remains clean; direct DB access is now visibly isolated in operation folders and server infrastructure.

## ⚠️ Phase 8 — Persistence and API Contract Audit (Reopened)

- Added `docs/golden-file-persistence-audit.md` with schema ownership, current router-contract evidence, and explicit remaining migration/index/date/nullability gates.
- Persistence follow-up reconstructed the missing `meta/0021_snapshot.json` from the authoritative TypeScript schema and linked it to `0020_snapshot.json`.
- `bun run db:generate` now reports no schema changes and generates no follow-up migration; local Postgres introspection remains recorded as comparison evidence only.
- Persistence index review covers all 36 tables; 34 have secondary indexes and the two intentional no-secondary-index tables are documented.
- Added `docs/golden-file-date-nullability-audit.md` covering timestamp serialization, nullable lifecycle fields, range filters, and list/summary endpoint families.
- `bun run check:unused` remains non-green. The React/Vite configuration and every resulting
  finding need an owner or fix; the failure cannot be waived as a generic baseline.

## ⚠️ Phase 9 — Auth, Membership, and Naming Audit (Reopened)

- Added `docs/golden-file-auth-membership-audit.md` documenting current actor extraction, membership checks, router boundaries, and remaining error/naming/test review.
- Replaced the Team router's generic member-reload `Error` with service-owned typed `ORPCError` handling and added pure `deriveTeamPermissions` tests.
- Normalized report query errors in hooks with `getErrorMessage`; Reports views now render display-ready view-model strings instead of raw query exceptions.
- Moved Workspace node-limit billing enforcement into `assertCanSaveWorkspaceNodes` in the service and added a Notifications-local `schemas.ts` boundary.
- Promoted Notifications procedure wiring from `notifications/index.ts` to `notifications/router.ts`; the root API aggregator now uses explicit router modules consistently.
- Promoted subscription Billing procedure wiring from `billing/index.ts` to `billing/router.ts`; all product API router namespaces now use explicit router modules.
- Archived the superseded root `ExecPlan.md` as `docs/legacy-exec-plan.md` and updated the master plan reference.

## ◐ Phase 10 — Realtime and Cross-Feature Integration Audit (Validator Hardening Pending)

- Added `docs/golden-file-realtime-integration-registry.md` covering current live event producers, cache consumers, notification paths, and remaining contract tests.
- Added `notifications-queries.test.ts` and extracted `applyNotificationCreatedToCache`; notification live events now have focused producer-to-cache contract coverage for deduplication and unread semantics.
- Reconciled the realtime registry with existing task, timer, and task-message cache/store tests.
- Added a journey query-key predicate contract test, completing focused cache/store/predicate coverage for all registered realtime consumers.
- Added machine-readable realtime ownership metadata and `bun run check:realtime`, which verifies all five live event definitions are registered with producer, consumer, notification, and test metadata.
- Added `docs/golden-file-cross-feature-ownership-audit.md`; Reports' named time-entry admin wrappers are the only intentional cross-feature service boundary, while Billing and Resourcing remain domain-local.

## ⚠️ Phase 11 — Final Verification and Cleanup (Reopened)

- Added `docs/golden-file-final-verification.md` as the authoritative evidence register for structural, command, migration, test, and documentation gates.
- Added Bun test preload bootstrap in `bunfig.toml` and `scripts/test-setup.ts`; the current run
  passes 192 tests across 47 discovered files, one of which is generated `dist` output that must be
  excluded before this is source-only evidence.
- Added `bun run check:golden`, which verifies all 646 in-scope source files have current inventory rows.

---

## Current State

| Check                    | Status                                                        |
| ------------------------ | ------------------------------------------------------------- |
| Overall master-plan gate | ❌ reopened; requirement evidence is incomplete               |
| `bun run check`          | ✅ 0 errors, 3 warnings                                       |
| `bun run check-types`    | ✅ 8 Turbo tasks pass                                         |
| `bun test`               | ◐ 192 pass, 0 fail; generated `dist` test discovery remains   |
| `bun run check:golden`   | ◐ 646 paths covered; classifications are not validated        |
| `bun run check:realtime` | ◐ 5 event names covered; referenced evidence is not validated |
| `bun run db:generate`    | ✅ no schema changes                                          |
| `bun run check:unused`   | ❌ fails; Knip config/findings are unresolved                 |

---

## Resumption Checklist

When continuing this session:

1. Repair and expand the inventory/checker, then create the per-feature canonical matrix.
2. Remove direct and indirect orchestration from presentational views; delete all transitional
   view allowlist entries.
3. Finish the Phase 8 and Phase 9 audit checklists and missing authorization/UI-hook tests.
4. Fix Knip for the React/Vite workspace and resolve or explicitly own every remaining finding.
5. Re-run every Phase 11 gate, verify a source-only test suite, reconcile the canonical spec, and
   only then reconsider overall completion.
