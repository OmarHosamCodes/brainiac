# Task 3 report — Reduce notification polling without relying on lossless live delivery

## What I implemented

Notification list/count observers now opt into a shared `connectedReconcile` policy in `withAgencySyncQueryOptions`. Other live-gated queries still stop polling when connected.

| State | List | Count |
| --- | --- | --- |
| Confirmed live for this team | 30 s | 30 s |
| Connecting / reconnecting / error / no subscription | 8 s | 30 s |
| Hidden tab | no background interval | no background interval |

Mounted observers react via `useAgencyLiveConnectionState` + hook options (`observer.setOptions` on re-render). `query.setOptions` does **not** retarget observer timers in the installed TanStack Query (`@tanstack/react-query` 5.101.2 / query-core 5.95.2); that was proven with real `QueryObserver`s.

Reconnect reuses Task 2’s authenticated timer+notification reconcile: leaving `live` clears `reconciledKey`, so the next live transition is one coalesced refresh per key (not a second storm). Teardown notifies state listeners so Canvas shell consumers resume fallback without remounting.

Created/coalesced cache updates are idempotent by id/`updatedAt`. Count deltas come only from a known previous row. Missing or truncated lists schedule one coalesced authoritative count fetch. Unknown totals are never initialized as zero.

Failed seen/read/read-all mutations roll back the optimistic snapshot. App-update rail priority and existing inbox actions are unchanged.

Not changed: Railway memory, Better Auth `refetchOnWindowFocus`, loader `staleTime` (Task 4), chooser catalog (Task 5), Task 2 live identity.

## What I tested and test results

From `apps/web`:

```bash
bun test src/features/shared/agency-query-options.test.ts \
  src/features/notifications/notifications-queries.test.ts \
  src/features/shared/live/agency-live-connection.test.ts \
  src/features/shared/live/agency-live-handlers.test.ts
```

**GREEN:** 39 pass, 0 fail.

Coverage:

- Real mounted `QueryObserver`s with `jest` fake timers (not wall-clock 120 s)
- Live idle 120 s: no 8 s list loop; exactly 4 list + 4 count reconciliations after settlement
- WS loss (`connecting` / `reconnecting` / `error`) restores 8 s / 30 s on the same observer
- Hidden tab: `refetchIntervalInBackground: false` fires nothing
- Other liveGated queries still stop when connected
- Multiple consumers sharing a key; team switch isolation; Canvas teardown
- Duplicate delivery, seen → unseen, older events, missing/truncated list, unknown total
- Failed mark-read / mark-seen / mark-all-read rollback; app-update still wins the rail
- Reconnect: one coalesced notification list+count recovery; teardown notifies listeners
- Task 2 identity/session tests still pass

`bunx oxlint` and `bunx oxfmt --check` clean on touched files. Did not run root `bun run check`.

## TDD Evidence

### RED

```bash
cd apps/web && bun test src/features/shared/agency-query-options.test.ts \
  src/features/notifications/notifications-queries.test.ts \
  src/features/shared/live/agency-live-connection.test.ts
```

Representative failures (before production changes):

```
live idle for 120s schedules at most 4 list and 4 count reconciliations after settlement
  Expected: 1
  Received: 2
  (8 s warm list still firing while liveState === "live")

multiple consumers sharing a notification key use the same 30s live interval
  Expected: 1
  Received: 2

Canvas teardown (live → connecting) resumes 8s list fallback on the same observer
  Expected: 1 after 8 s while live
  Received: 2

notifications-queries.test.ts
  SyntaxError: Export named 'notificationMarkAllReadMutationOptions' not found

agency-live-connection.test.ts
  Export named 'setAgencyLiveConnectionStateForTest' not found
```

Characterization tests that already passed (installed TQ behavior):

- `query.setOptions` does **not** retarget mounted observer timers (fetch still at 8 s after `query.setOptions({ refetchInterval: 30_000 })`)
- `observer.setOptions` **does** retarget the timer (the reactive hook path)

### GREEN

Same command after implementation: **39 pass, 0 fail**.

The 120 s acceptance used fake timers / observer options, not a 120 s wall-clock run.

## Self-review

- `refreshAgencyLiveGatedPolling` still uses `query.setOptions` for other live-gated queries (pre-existing; those observers are not retargeted by it). Notifications do not rely on it.
- Burst tests now expect unread increments only while the list window is complete (`NOTIFICATION_LIST_LIMIT`); further events schedule a count fetch.
- “Read in a second tab” is covered by the 30 s connected reconcile plus reconnect recovery, not a multi-tab browser test.

## Commits

- `3837b2f4` — `fix(notifications): reconcile live polling without an 8s connected list loop`

## Important review fix — teardown must not orphan Canvas state listeners

`teardownTeamConnection` closed the socket and set `"connecting"`, then `teamConnections.delete(teamId)` even when `stateListeners.size > 0`. Canvas rail observers (`useAgencyLiveConnectionState` / `useSyncExternalStore`) stayed mounted; their listeners fired once (fallback resumed) and were then orphaned. A later Agency remount created a new connection that those listeners were not added to, so `getSnapshot()` could show `"live"` without a store notification. If the rail did not re-render, observers stayed on the 8s fallback.

Fix: tear down the socket/timer, set `"connecting"`, and delete only via `maybeRemoveIdleConnection`. Full reset (`teardownAllAgencyLiveConnections`) still force-deletes after teardown so tests/HMR do not leak connections.

Added test: teardown-as-Canvas, then the **same** `subscribeAgencyLiveConnectionStateForTest` listener sees `"live"` again after a new Agency `subscribeAgencyLive` — no remount / no second state subscribe.

### Tests

From `apps/web`:

```bash
bun test src/features/shared/agency-query-options.test.ts \
  src/features/notifications/notifications-queries.test.ts \
  src/features/shared/live/agency-live-connection.test.ts \
  src/features/shared/live/agency-live-handlers.test.ts
```

```
bun test v1.4.0 (34cbb9a40)

src/features/notifications/notifications-queries.test.ts:
(pass) applyNotificationCreatedToCache > prepends a new notification and increments unread count from known previous state
(pass) applyNotificationCreatedToCache > duplicate delivery of the same id/version does not drift counts
(pass) applyNotificationCreatedToCache > does not increment unread count for an already-seen new notification
(pass) applyNotificationCreatedToCache > seen → unseen coalescing increments unread from the known previous row
(pass) applyNotificationCreatedToCache > older events are ignored
(pass) applyNotificationCreatedToCache > missing list schedules a coalesced count fetch instead of inventing a zero total
(pass) applyNotificationCreatedToCache > truncated list with an unknown id schedules a count fetch instead of guessing
(pass) applyNotificationCreatedToCache > never initializes an unknown total as though zero were authoritative
(pass) notification mutation rollback > failed mark-read restores a dismissed notification
(pass) notification mutation rollback > failed mark-seen restores unseen badges
(pass) notification mutation rollback > failed mark-all-read restores unread cards
(pass) notification mutation rollback > app-update still wins the rail card after a failed dismissal rollback

src/features/shared/agency-query-options.test.ts:
(pass) notification connected-reconcile observers > query.setOptions does not retarget mounted observer timers in TanStack Query 5.101.2
(pass) notification connected-reconcile observers > observer.setOptions retargets the refetch timer (reactive hook path)
(pass) notification connected-reconcile observers > live idle for 120s schedules at most 4 list and 4 count reconciliations after settlement
(pass) notification connected-reconcile observers > connecting/reconnecting/error restore 8s list and 30s count without remounting
(pass) notification connected-reconcile observers > hidden tab does not fire background interval polling
(pass) notification connected-reconcile observers > other liveGated queries still stop polling when connected
(pass) notification connected-reconcile observers > multiple consumers sharing a notification key use the same 30s live interval
(pass) notification connected-reconcile observers > team switch keeps each team's interval isolated
(pass) notification connected-reconcile observers > Canvas teardown (live → connecting) resumes 8s list fallback on the same observer

src/features/shared/live/agency-live-connection.test.ts:
(pass) subscribeAgencyLive > closes socket when refCount reaches 0
(pass) subscribeAgencyLive > shares one connection when refCount is 2
(pass) subscribeAgencyLive > 100 timer and notification events with a settled viewer add zero session requests
(pass) subscribeAgencyLive > applies the first live event using subscribe-time identity without a session fetch
(pass) subscribeAgencyLive > discards in-flight handler work after logout
(pass) subscribeAgencyLive > reconciles after authenticated subscription startup once identity is available
(pass) subscribeAgencyLive > account switch does not tear down the team socket solely due to viewerUserId change
(pass) subscribeAgencyLive > in-place identity change does not briefly null then set
(pass) subscribeAgencyLive > reconnect performs one coalesced notification recovery and does not double-fetch with startup reconcile
(pass) subscribeAgencyLive > teardown notifies mounted state listeners so Canvas consumers resume fallback
(pass) subscribeAgencyLive > same Canvas state subscription goes live again after Agency remount without resubscribe

src/features/shared/live/agency-live-handlers.test.ts:
(pass) viewer timer live reconciliation > hydrates Zustand with the full timer and ignores older pub/sub events
(pass) live handler viewer identity > 100 timer and notification events with a settled viewer add zero session requests
(pass) live handler viewer identity > does not apply another user's timer to the viewer store
(pass) live handler viewer identity > does not apply another recipient's notification
(pass) live handler viewer identity > drops timer and notification events when identity is unavailable
(pass) live handler viewer identity > discards events whose teamId does not match the subscribed team
(pass) live handler viewer identity > sign-in as another user does not leak the previous viewer's live updates
(pass) live handler viewer identity > discards work when the identity is already superseded

 40 pass
 0 fail
 136 expect() calls
Ran 40 tests across 4 files. [85.00ms]
```

`bunx oxlint` and `bunx oxfmt --check` clean on the two touched live-connection files. Did not run root `bun run check`. Did not disable `refetchOnWindowFocus`. Did not expand into Task 4/5.
