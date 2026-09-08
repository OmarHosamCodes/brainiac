# Task 7 report — Verification checks

Verification only. No product-feature changes. No Railway memory change. No deploy. Did not run root `bun run check`. Did not claim Railway improvement.

Worktree: `/home/omar/Projects/brainiac/.worktrees/fix-railway-hot-paths`  
Branch: `fix/railway-hot-paths`  
HEAD after inventory: `2cb3f5c1`  
Follow-up type-fix commit is separate (do not amend inventory).

## What I implemented (or attempted)

- Ran the focused regression set from package directories.
- Ran `bunx turbo run check-types --force`, `bun run check:conventions`, `bun run check:realtime`, `bun run check:golden`.
- Ran read-only `bunx oxlint` and `bunx oxfmt --check` on this branch’s touched product files.
- Ran a production-like `apps/web` build (`bun run build`).
- Attempted the browser request-budget matrix. Production is a login wall; no local authenticated session. Same blocker as Task 1. No invented numbers.
- Regenerated `docs/golden-file-source-inventory.md` for this branch’s new in-scope files and committed it.

## Commands and results

| Check | Command | Exit | Result |
| --- | --- | --- | --- |
| Web focused tests (15 files, one process) | `cd apps/web && bun test` (files listed below) | **1** | 103 pass, **16 fail** (live files only; `orpc` mock pollution) |
| Live connection isolated | `cd apps/web && bun test src/features/shared/live/agency-live-connection.test.ts` | **0** | 11 pass, 0 fail |
| Live handlers isolated | `cd apps/web && bun test src/features/shared/live/agency-live-handlers.test.ts` | **0** | 8 pass, 0 fail |
| API task-list tests | `cd packages/api && bun test --env-file=/home/omar/Projects/brainiac/.env` (3 files below) | **0** | 12 pass, 0 fail |
| Uncached types | `bunx turbo run check-types --force` | **2** | 7 packages pass; **web fails** |
| Conventions | `bun run check:conventions` | **1** | 8 golden-view violations, **all pre-existing** |
| Realtime registry | `bun run check:realtime` | **1** | Missing `taskMessage.created` — **pre-existing** |
| Golden (before inventory) | `bun run check:golden` | **1** | 9 missing rows + semantic drift on this branch’s files |
| Generate inventory | `node scripts/generate-golden-file-inventory.mjs` | **0** | 1465 rows / 28 domains |
| Golden (after inventory) | `bun run check:golden` | **0** | 1465 artifacts semantically validated |
| Lint | `bunx oxlint` (repo) and same on touched files | **0** | clean |
| Format | `bunx oxfmt --check <touched-files>` (27 files) | **0** | All matched files use the correct format |
| Web production-like build | `cd apps/web && bun run build` | **0** | Vite + prerender 4 public pages; wrote `.output/server/index.mjs` |
| Browser matrix | production `/login` + no local `bun run dev` session | n/a | **not measured** (Task 1 blocker) |

Root `bun run check` was **not** run (repo-wide `oxfmt --write`).

### Web test files (from `apps/web`)

```text
src/features/shared/live/agency-live-connection.test.ts
src/features/shared/live/agency-live-handlers.test.ts
src/features/notifications/notifications-queries.test.ts
src/features/shared/agency-query-options.test.ts
src/lib/auth-session.test.ts
src/lib/boot-chrome.test.ts
src/lib/authenticated-client-reset.test.ts
src/lib/authenticated-boot.test.ts
src/lib/authenticated-parent-freshness.test.ts
src/features/shared/agency-query-cache.test.ts
src/features/shared/agency-task-chooser-catalog.test.ts
src/features/time-tracking/agency-task-chooser-search.test.ts
src/features/time-tracking/agency-task-chooser-groups.test.ts
src/features/time-tracking/agency-task-chooser-keyboard.test.ts
src/features/shared/choosers/agency-chooser-expanded.test.ts
```

Combined `bun test` of those 15 files: **119 tests, 103 pass, 16 fail**. Failures were only:

- `agency-live-connection.test.ts` (9)
- `agency-live-handlers.test.ts` (7)

Error shape: `TypeError: undefined is not an object (evaluating 'orpc.agencyOps.timer…' / 'orpc.notifications.unreadCount')`. Isolated reruns of those two files from `apps/web` are green (19/19). Treat the batched failure as test-process mock leakage, not a product regression.

Chooser search / group / keyboard and catalog boundary tests passed in the combined run.

### API test files (from `packages/api`)

```text
src/routers/agency-ops/tasks/service.integration.test.ts
src/routers/agency-ops/tasks/task-list-search.test.ts
src/routers/agency-ops/tasks/list-project-tasks-filters.test.ts
```

`--env-file` points at the main-repo `.env` so `@orch/env/server` can load. Isolation DB used by the integration test (`localhost:5440`). **GREEN:** 12 pass, including the `createdAt` + `id DESC` tie-breaker and exact `total` on page 1 and page 2.

## Typecheck (this branch — new)

`bunx turbo run check-types --force` (cache bypass, 9 packages):

- Pass: `@orch/env`, `@orch/workspace`, `@orch/db`, `@orch/agent`, `@orch/auth`, `@orch/api`, `server`
- Fail: `web`

```text
apps/web/src/features/notifications/notifications-queries.ts(147,69): error TS2345
Argument of type 'NotificationCountCache | undefined' is not assignable to parameter of type
  'Updater<{ count: number; actionCount: number; } | undefined, …>'.
Types of property 'actionCount' are incompatible.
  Type 'number | undefined' is not assignable to type 'number'.
```

Introduced by Task 3 (`3837b2f4`, `restoreNotificationQueries`). `NotificationCountCache.actionCount` is optional; the unread-count query type requires `actionCount: number`. Not fixed in this verification task.

## Pre-existing convention / realtime failures

`bun run check:conventions` — 8 violations, **none** in files changed on this branch:

| File | Rule |
| --- | --- |
| `apps/web/src/features/task-management/task-list/agency-task-group-row-view.tsx` | golden-view-no-indirect-orchestration |
| `apps/web/src/features/workspace-agent/workspace-agent-view.tsx` (3) | golden-view-no-hooks (`useRef` / `useState` / `useEffect`) |
| `apps/web/src/features/workspace-knowledge/canvas-knowledge-create-menu-view.tsx` (4) | golden-view-no-hooks |

`bun run check:realtime` — `Missing registry events: taskMessage.created`. Present in `packages/api/src/routers/agency-ops/live/live.ts` on merge-base `5f655f6a`; this branch did not touch `live.ts` or the registry JSON.

## Golden inventory

First `check:golden` failed because this branch added in-scope files that were not inventoried (plus semantic drift on live connection/handlers tests and `_authenticated.tsx` after boot extraction).

Regenerated with `node scripts/generate-golden-file-inventory.mjs`. Added rows (only these new paths vs HEAD):

- `apps/web/src/features/shared/agency-query-options.test.ts`
- `apps/web/src/features/shared/agency-task-chooser-catalog.test.ts`
- `apps/web/src/lib/authenticated-boot.ts` + `.test.ts`
- `apps/web/src/lib/authenticated-client-reset.ts` + `.test.ts`
- `apps/web/src/lib/authenticated-parent-freshness.test.ts`
- `apps/web/src/lib/boot-chrome.ts` + `.test.ts`

Also refreshed evidence/layer for live connection/handlers and `_authenticated.tsx` (`web-query` → `presentational-view` after boot extraction). Count table recount: golden-feature 948→949, shared-infrastructure 469→478, billing 146→147 (no extra path; previous summary counts were stale vs 1456 listed rows).

Commit: `2cb3f5c1` — `chore: inventory new railway hot-path source files`  
Second `check:golden`: pass (exit 0).

## Production-like web build

`cd apps/web && bun run build` (main-repo `.env` sourced in the shell so env validation could run).

- Vite client + SSR build succeeded (`✓ built in 1.12s`).
- Prerendered `/`, `/login`, `/privacy`, `/terms`.
- Output includes Agency and Canvas chunks (`agency.index-*.js`, `canvas-*.js`, `_authenticated-*.js`).
- Wrote `apps/web/.output/server/index.mjs`.

Passing compilation **does not** establish request reduction.

## Browser request-budget matrix

**Not measured.** Do not invent numbers.

| Attempt | Outcome |
| --- | --- |
| Production `https://brainiac.school-of-marketing.com/login` | Sign-in wall (Google / email). No production credentials (same as Task 1). |
| Local `bun run dev` | No process listening on 7001/3001. No authenticated session in this worktree. |
| Open browser tab | `http://localhost:3000/` is a different app (OGMs), not Orch. |

Not exercised (would need an authenticated session): idle 120s vs 8s list loop; Agency → Canvas → Agency; chooser reopen.

## Touched-file lint/format list (oxfmt --check)

All 27 product files changed on `5f655f6a...HEAD` under `apps/web` and `packages/api` (tests + sources listed in the git name-status for this branch). Inventory markdown is not in that oxfmt set.

## Files changed this task

Committed:

- `docs/golden-file-source-inventory.md`

Not committed (pre-existing SDD/plan noise): `.superpowers/sdd/progress.md`, other task reports, `.cursor/plans/`.

This report file is uncommitted by design.

## Issues or concerns

1. **web `check-types` originally failed** on this branch (`restoreNotificationQueries` / optional `actionCount`). Fixed in the follow-up below. Task 8 can treat types as green for this branch.
2. **Batched live tests fail** when run in the same `bun test` process as other orpc-using files; isolated runs pass. Future verification should keep live files isolated. Not changed here (would expand scope).
3. **Convention + realtime failures are pre-existing** and were not “fixed” here.
4. **Browser matrix still blocked** (no prod login, no local session). Idle/chooser/Agency↔Canvas request counts remain unknown.
5. Passing web **build** only proves compile/prerender, not Railway request reduction.

## Follow-up: restoreNotificationQueries type error

`NotificationCountCache.actionCount` is now required, matching `orpc.notifications.unreadCount`. Restore writes that complete object when present. If the snapshot had no count, restore `removeQueries` instead of `setQueryData(undefined)` (a no-op that would leave the optimistic `{ count: 0 }`). Unknown totals are still not seeded as zero.

### Required tests (from `apps/web`)

```text
$ bun test src/features/notifications/notifications-queries.test.ts src/features/shared/agency-query-options.test.ts
bun test v1.4.0 (34cbb9a40)

src/features/notifications/notifications-queries.test.ts:
(pass) applyNotificationCreatedToCache > prepends a new notification and increments unread count from known previous state [4.85ms]
(pass) applyNotificationCreatedToCache > duplicate delivery of the same id/version does not drift counts [0.52ms]
(pass) applyNotificationCreatedToCache > does not increment unread count for an already-seen new notification [0.32ms]
(pass) applyNotificationCreatedToCache > seen → unseen coalescing increments unread from the known previous row [0.24ms]
(pass) applyNotificationCreatedToCache > older events are ignored [0.27ms]
(pass) applyNotificationCreatedToCache > missing list schedules a coalesced count fetch instead of inventing a zero total [1.51ms]
(pass) applyNotificationCreatedToCache > truncated list with an unknown id schedules a count fetch instead of guessing [2.11ms]
(pass) applyNotificationCreatedToCache > never initializes an unknown total as though zero were authoritative [0.95ms]
(pass) notification mutation rollback > failed mark-read restores a dismissed notification [3.65ms]
(pass) notification mutation rollback > failed mark-seen restores unseen badges [1.57ms]
(pass) notification mutation rollback > failed mark-all-read restores unread cards [1.47ms]
(pass) notification mutation rollback > failed mutation does not seed unread count when the snapshot had none [0.66ms]
(pass) notification mutation rollback > app-update still wins the rail card after a failed dismissal rollback [0.52ms]

src/features/shared/agency-query-options.test.ts:
(pass) notification connected-reconcile observers > query.setOptions does not retarget mounted observer timers in TanStack Query 5.101.2 [2.24ms]
(pass) notification connected-reconcile observers > observer.setOptions retargets the refetch timer (reactive hook path) [0.45ms]
(pass) notification connected-reconcile observers > live idle for 120s schedules at most 4 list and 4 count reconciliations after settlement [1.18ms]
(pass) notification connected-reconcile observers > connecting/reconnecting/error restore 8s list and 30s count without remounting [1.14ms]
(pass) notification connected-reconcile observers > hidden tab does not fire background interval polling [0.35ms]
(pass) notification connected-reconcile observers > other liveGated queries still stop polling when connected [0.29ms]
(pass) notification connected-reconcile observers > multiple consumers sharing a notification key use the same 30s live interval [0.33ms]
(pass) notification connected-reconcile observers > team switch keeps each team's interval isolated [0.33ms]
(pass) notification connected-reconcile observers > Canvas teardown (live → connecting) resumes 8s list fallback on the same observer [0.29ms]

 22 pass
 0 fail
 61 expect() calls
Ran 22 tests across 2 files. [162.00ms]
```

Exit: **0**

### Uncached typecheck

```text
$ bunx turbo run check-types --force
• turbo 2.10.2

   • Packages in scope: @orch/agent, @orch/api, @orch/auth, @orch/config, @orch/db, @orch/env, @orch/workspace, server, web
   • Running check-types in 9 packages
   • Remote caching disabled, using shared worktree cache

@orch/env:check-types: cache bypass, force executing 3d95b3da0f0227aa
@orch/workspace:check-types: cache bypass, force executing 81954c2b8c9ca855
@orch/workspace:check-types: $ tsc -p tsconfig.json --noEmit
@orch/env:check-types: $ tsc -p tsconfig.json --noEmit
@orch/db:check-types: cache bypass, force executing 3cf31de72be920ff
@orch/agent:check-types: cache bypass, force executing 03ee41d412a0c4d5
@orch/db:check-types: $ tsc -p tsconfig.json --noEmit
@orch/agent:check-types: $ tsc -b
@orch/auth:check-types: cache bypass, force executing de81a867c1492b79
@orch/auth:check-types: $ tsc -p tsconfig.json --noEmit
@orch/api:check-types: cache bypass, force executing c4cf31de72be920ff
@orch/api:check-types: $ tsc -p tsconfig.json --noEmit
server:check-types: cache bypass, force executing ebe2df02f22b4616
web:check-types: cache bypass, force executing 050e8ae63b04d45b
web:check-types: $ tsc -b --noEmit
server:check-types: $ tsc -b

 Tasks:    8 successful, 8 total
Cached:    0 cached, 8 total
  Time:    35.179s
```

Exit: **0**. **web passes.** `@orch/config` is in turbo scope but has no `check-types` script (same as the earlier run; not a failure). No unrelated package failures.

Root `bun run check` was still **not** run. Golden-view / `taskMessage.created` were not touched.

## Status

**DONE** — `restoreNotificationQueries` is typesafe; required tests and uncached `check-types` are green for web. Authenticated browser matrix remains unmeasured (Task 1 blocker). Batched live-test mock leakage was not changed.
