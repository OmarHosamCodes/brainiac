# Golden File Pattern — Refactor Progress Log

_Last updated: 2026-07-09 (session checkpoint during Phase 4 workspace split)_

---

## ✅ Phase 0 — Baseline & Tracking (Complete)

- Generated source inventory.
- Baselines: `bun run check` ✅ · `bun run check-types` ✅ · 163 tests pass ✅
- Decided to **delete** legacy compat re-exports instead of deprecating them.

---

## ✅ Phase 1 — Enforce Golden Boundaries (Complete)

Extended [`scripts/check-conventions.mjs`](../scripts/check-conventions.mjs) with four enforcement rules:

| Rule               | What it blocks                                                                                           |
| ------------------ | -------------------------------------------------------------------------------------------------------- |
| View imports       | `*-view.tsx` cannot import `@tanstack/react-query`, `@/lib/orpc`, `orpcClient`, or feature/global stores |
| Router imports     | API routers cannot import `@brainiac/db` or `drizzle-orm` directly                                       |
| Feature lib/stores | Feature files must live in `features/`, not `lib/` or `stores/` (with allowlist for legacy files)        |
| Generic utils      | New `utils.ts`, `helpers.ts`, or `data.ts` files inside feature folders are blocked                      |

---

## ✅ Phase 2 — Complete Agency Backend Alignment (Complete)

| Change                                                                                                            | Result      |
| ----------------------------------------------------------------------------------------------------------------- | ----------- |
| Deleted `live.ts` + `tenure-engine.ts` compat re-exports                                                          | ✅          |
| Wrapped admin time-entry calls inside `reports/service.ts`                                                        | ✅          |
| Split `shared/utils.ts` into 6 domain helpers (`date`, `avatar`, `lookup`, `report`, `task`, `journey`)           | ✅          |
| Updated all 6 service files (`billing`, `clients`, `projects`, `reports`, `resourcing`, `tasks`, `time-tracking`) | ✅          |
| `bun run check` · `check-types` · 163 tests                                                                       | ✅ all pass |

New helper files under `packages/api/src/routers/agency-ops/shared/`:

- `date-helpers.ts`
- `avatar-helpers.ts`
- `lookup-helpers.ts`
- `report-helpers.ts`
- `task-helpers.ts`
- `journey-helpers.ts`

---

## ✅ Phase 3 — Complete Agency Web Alignment (Complete)

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

## ⏳ Phase 4 — Workspace Under the Pattern (In progress)

- Move workspace UI/hooks/utilities into `features/workspace` and `packages/workspace/src`.
- Split `apps/web/src/stores/workspace.ts` into query options, mutation store, and local state.
- Refactor workspace API router into schemas, service, and thin router procedures.

Current Phase 4 progress:

- `packages/api/src/routers/workspace` now has a thin `router.ts` plus `schemas.ts` alongside `service.ts`.
- `apps/web/src/features/workspace/*` has started as feature-home re-exports for the main node/editor surfaces.
- `apps/web/src/features/workspace/hooks/use-workspace-query.ts` now owns the workspace query and sync workflow.
- `apps/web/src/stores/workspace.ts` is a compatibility shim that re-exports the feature store/query surface.
- `apps/web/src/components/workspace/*` public node/card/editor/status shells have been rehomed as feature exports, with the legacy component paths kept as compatibility wrappers.
- Workspace utility ownership moved into `apps/web/src/features/workspace/utils/` for node connections, tint/dashboard helpers, marketplace payload helpers, and canvas adapter wiring; legacy `lib/utils` paths now act as wrappers where still needed.
- `workspace-block-registry` now lives under `apps/web/src/features/workspace/utils/` with the legacy `lib/utils` import path preserved as a wrapper.
- Workspace node/card/editor/empty-state/orchestrator helpers now import the feature-owned workspace utilities directly instead of the `lib/utils` compatibility paths.
- `apps/web/src/features/workspace/utils/workspace-flow-adapter.ts` now points at the feature-owned connection helpers rather than the legacy `lib` path.
- `add-block-command-catalog` now lives under `apps/web/src/features/workspace/utils/`, with the command palette consuming the feature-owned implementation.
- `workspace-node-connections.test.ts` now lives under `apps/web/src/features/workspace/utils/` next to the connection helpers.
- Dashboard and node pages now import workspace shells from `apps/web/src/features/workspace/*` rather than the legacy `components/workspace/*` entry points.
- Marketplace payload helpers now import from `apps/web/src/features/workspace/utils/workspace-marketplace.ts` rather than the legacy `lib` path.

## ⏳ Phase 5 — Dashboard Agent Under the Pattern (Not started)

- Move agent-chat UI into `features/dashboard-agent`.
- Split `apps/web/src/stores/dashboard-agent-chat.ts`.
- Split agent API router.

## ⏳ Phases 6–11 — Team, Auth, Shell, Billing, Marketplace, Hardening (Not started)

---

## Current State

| Check                 | Status                               |
| --------------------- | ------------------------------------ |
| `bun run check`       | ✅ 0 errors, 4 pre-existing warnings |
| `bun run check-types` | ✅ last verified end of Phase 2      |
| `bun test`            | ✅ 176 pass, 0 fail                  |

---

## Resumption Checklist

When continuing this session:

1. **Phase 3 — Panes**: refactor the 5 pane components listed above.
2. **Phase 3 — Projects & Tasks**: refactor the 6 components listed above; ensure `agency-work-surface-delegated-view.tsx` is removed from `GOLDEN_VIEW_ALLOWLIST`.
3. Run `bun run check` + `bun run check-types` + `bun test` to confirm clean state.
4. **Begin Phase 4** — workspace pattern alignment.
