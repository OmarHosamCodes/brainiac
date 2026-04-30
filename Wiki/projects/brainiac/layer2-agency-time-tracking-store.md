---
title: "useAgencyTimeTrackingStore — Pinia Agency Time Tracking State"
category: projects
tags: [store, pinia, agency-ops, timer, time-tracking, optimistic-ui, vue-query, state]
summary: "Pinia store for agency time tracking: per-team tracker drafts, timer start/stop/restart with full optimistic UI, entry deletion, and a query registry for cross-query cache patching."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 2
---

# useAgencyTimeTrackingStore — Pinia Agency Time Tracking State

## Primary Entity

- **Name:** `useAgencyTimeTrackingStore`
- **Type:** Pinia Store (Setup Store)
- **File:** `apps/web/app/stores/agency-time-tracking.ts`
- **Store ID:** `"agency-time-tracking"`
- **Exported symbol:** `useAgencyTimeTrackingStore`

---

## Internal Type Definitions (local to file)

| Type                             | Shape                                                                                                                                                                                                           |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `AgencyTag`                      | `{ id, teamId, name, createdAt, updatedAt }`                                                                                                                                                                    |
| `AgencyProjectSummary`           | `{ id, teamId, clientId, clientName, name, createdAt, updatedAt }`                                                                                                                                              |
| `AgencyActiveTimer`              | `{ id, teamId, userId, projectId, projectName, tags: AgencyTag[], description, linkUrl, startedAt, createdAt, updatedAt }`                                                                                      |
| `AgencyTimeEntry`                | `{ id, teamId, userId, userName, projectId, projectName, clientId, clientName, tags: AgencyTag[], source: "timer"\|"manual", description, linkUrl, startedAt, endedAt, durationSeconds, createdAt, updatedAt }` |
| `AgencyWeekSummary`              | `{ startDate, endDate, totalSeconds, daily: [{date, totalSeconds}[]] }`                                                                                                                                         |
| `AgencyActiveTimerQueryData`     | `{ timer: AgencyActiveTimer \| null }`                                                                                                                                                                          |
| `AgencyTimeEntriesListQueryData` | `{ items: AgencyTimeEntry[], page, pageSize, total, weekSummary: AgencyWeekSummary }`                                                                                                                           |
| `TrackerDraft`                   | `{ description, projectId, selectedTagIds: string[], linkUrl, syncedTimerId: string \| null }`                                                                                                                  |
| `RegisteredActiveTimerQuery`     | `{ queryKey: QueryKey, teamId: string }`                                                                                                                                                                        |
| `RegisteredLogQuery`             | `{ queryKey: QueryKey, teamId: string, page: number }`                                                                                                                                                          |
| `QuerySnapshot`                  | `{ queryKey: QueryKey, data: unknown }`                                                                                                                                                                         |
| `StartTimerPayload`              | `{ teamId, project, description, linkUrl, tagIds, selectedTags, successDescription? }`                                                                                                                          |
| `StopTimerPayload`               | `{ teamId, description, linkUrl, tagIds, selectedTags, discard?, activeTimer? }`                                                                                                                                |
| `RestartEntryPayload`            | `{ teamId, project, description, linkUrl, tags }`                                                                                                                                                               |
| `DeleteEntriesPayload`           | `{ teamId, entries: Pick<AgencyTimeEntry, "id"\|"startedAt"\|"durationSeconds">[] }`                                                                                                                            |

---

## Reactive State

| Ref                | Type                                | Purpose                                                                              |
| ------------------ | ----------------------------------- | ------------------------------------------------------------------------------------ |
| `draftByTeam`      | `ref<Record<string, TrackerDraft>>` | Per-team tracker form draft (description, projectId, tagIds, linkUrl, syncedTimerId) |
| `timerStartCount`  | `ref<number>`                       | Counts in-flight start mutations (incremented before, decremented after)             |
| `timerStopCount`   | `ref<number>`                       | Counts in-flight stop mutations                                                      |
| `deletingEntryIds` | `ref<string[]>`                     | IDs of entries currently being deleted (for UI loading state)                        |

---

## Computed Properties

| Computed                 | Derived From                                  | Purpose                                      |
| ------------------------ | --------------------------------------------- | -------------------------------------------- |
| `isTimerMutationPending` | `timerStartCount > 0 \|\| timerStopCount > 0` | True while any timer start/stop is in flight |

---

## Query Registries (non-reactive, internal Maps)

| Registry                   | Key                        | Value                        | Purpose                                                    |
| -------------------------- | -------------------------- | ---------------------------- | ---------------------------------------------------------- |
| `activeTimerQueryRegistry` | `JSON.stringify(queryKey)` | `RegisteredActiveTimerQuery` | Tracks all mounted active-timer queries across teams       |
| `logQueryRegistry`         | `JSON.stringify(queryKey)` | `RegisteredLogQuery`         | Tracks all mounted time-entries-list queries per team+page |

These registries enable cross-component cache patching without prop drilling or re-fetching all queries.

---

## TanStack Query Mutations

| Symbol                | Mechanism                                                              |
| --------------------- | ---------------------------------------------------------------------- |
| `startTimerMutation`  | `useMutation(orpc.agencyOps.timer.start.mutationOptions())`            |
| `stopTimerMutation`   | `useMutation(orpc.agencyOps.timer.stop.mutationOptions())`             |
| `deleteEntryMutation` | `useMutation(orpc.agencyOps.timeEntries.deleteMine.mutationOptions())` |

---

## Public API Functions

### Draft Management

| Function                                     | Description                                                                               |
| -------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `ensureTrackerDraft(teamId)`                 | Returns existing `TrackerDraft` for team or creates a new one with empty defaults         |
| `setTrackerDescription(teamId, description)` | Sets `draft.description`                                                                  |
| `setTrackerProjectId(teamId, projectId)`     | Sets `draft.projectId`                                                                    |
| `setTrackerSelectedTagIds(teamId, tagIds)`   | Replaces `draft.selectedTagIds`                                                           |
| `setTrackerLinkUrl(teamId, linkUrl)`         | Sets `draft.linkUrl`                                                                      |
| `toggleTrackerTag(teamId, tagId)`            | Adds or removes `tagId` from `draft.selectedTagIds`                                       |
| `syncDraftFromActiveTimer(teamId, timer)`    | Syncs draft fields from a live timer; skips if `syncedTimerId` already matches `timer.id` |

### Query Registry

| Function                               | Description                                               |
| -------------------------------------- | --------------------------------------------------------- |
| `registerActiveTimerQuery(payload)`    | Adds `{ queryKey, teamId }` to `activeTimerQueryRegistry` |
| `unregisterActiveTimerQuery(queryKey)` | Removes from `activeTimerQueryRegistry` by serialized key |
| `registerLogQuery(payload)`            | Adds `{ queryKey, teamId, page }` to `logQueryRegistry`   |
| `unregisterLogQuery(queryKey)`         | Removes from `logQueryRegistry` by serialized key         |

### Timer Operations

#### `startTimer(payload: StartTimerPayload)`

Full optimistic flow:

1. Snapshot current draft and all active-timer/log caches
2. Call `normalizeAgencyLinkUrl(linkUrl)` — abort with toast on error
3. Increment `timerStartCount`
4. If previous active timer exists in another team → `patchInsertedEntry` to optimistically create a completed entry
5. `patchActiveTimerCaches(optimisticTimer)` — writes optimistic timer into every registered active-timer query cache via `queryClient.setQueryData`
6. Update draft state
7. Calls `startTimerMutation.mutateAsync({ teamId, projectId, description, linkUrl, tagIds })`
8. `patchActiveTimerCaches(result.timer)` — replaces optimistic with server response
9. `syncDraftFromActiveTimer(teamId, result.timer)`
10. `invalidateActiveTimerQueries()` + `invalidateLogQueries(affectedLogTeams)`
11. On error: `restoreQuerySnapshots`, `restoreTrackerDraft`, show error toast
12. Finally: decrement `timerStartCount`

#### `restartEntry(payload: RestartEntryPayload)`

Delegates to `startTimer` with `successDescription: "Tracking {description}."`.

#### `stopTimer(payload: StopTimerPayload)`

Full optimistic flow:

1. Resolve `activeTimer` from `payload.activeTimer ?? getCachedActiveTimer()`
2. Snapshot draft and query caches
3. Call `normalizeAgencyLinkUrl` (skip if `discard`)
4. Increment `timerStopCount`
5. `patchInsertedEntry` optimistically for non-discard
6. `patchActiveTimerCaches(null)` — clears active timer from all caches
7. Clear draft fields
8. Calls `stopTimerMutation.mutateAsync({ teamId, description, linkUrl, tagIds, discard })`
9. `patchActiveTimerCaches(result.timer)` (may be non-null if team mismatch scenario)
10. `invalidateActiveTimerQueries()` + `invalidateLogQueries`
11. Toast: "Timer stopped" (with duration) or "Timer discarded"
12. On error: restore snapshots and draft

#### `deleteEntries(payload: DeleteEntriesPayload)`

1. Dedupes entries by ID via `dedupeEntries`
2. Records current `deletingEntryIds`, adds IDs
3. Snapshots log query caches
4. `patchDeletedEntries` optimistically removes entries from all registered log caches
5. Calls `deleteEntryMutation.mutateAsync` for each ID in parallel via `Promise.all`
6. `invalidateLogQueries` on success
7. On error: `restoreQuerySnapshots`, show error toast
8. Finally: restores previous `deletingEntryIds`

---

## Internal Cache-Patching Functions

| Function                                           | Description                                                                                                                                                              |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `patchActiveTimerCaches(timer)`                    | Iterates `activeTimerQueryRegistry`, calls `queryClient.setQueryData` to write `{ timer: timer \| null }` into each cache (only sets non-null timer if `teamId` matches) |
| `patchInsertedEntry(teamId, entry)`                | Iterates `logQueryRegistry` for matching `teamId`, calls `queryClient.setQueryData` to prepend entry on page 1, increment total, update `weekSummary`                    |
| `patchDeletedEntries(teamId, entries)`             | Iterates `logQueryRegistry` for matching `teamId`, calls `queryClient.setQueryData` to filter entries out, decrement total, update `weekSummary`                         |
| `updateWeekSummary(weekSummary, entry, direction)` | Recalculates `totalSeconds` and `daily` array for the given week; skips entries outside the week range                                                                   |

---

## Internal Helper Functions

| Function                                           | Description                                                                                                        |
| -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `getCachedActiveTimer()`                           | Iterates `activeTimerQueryRegistry`, calls `queryClient.getQueryData` for each, returns first non-null timer found |
| `getTrackerDraftSnapshot(teamId)`                  | Returns deep copy of current draft for rollback                                                                    |
| `restoreTrackerDraft(teamId, snapshot)`            | Restores draft from snapshot (or deletes it if null)                                                               |
| `snapshotQueries(queries)`                         | Maps `queryClient.getQueryData` over each registered query → `QuerySnapshot[]`                                     |
| `restoreQuerySnapshots(snapshots)`                 | Calls `queryClient.setQueryData` for each snapshot                                                                 |
| `getRegisteredLogQueries(teamIds)`                 | Filters `logQueryRegistry` to those matching a `Set<string>` of team IDs                                           |
| `invalidateActiveTimerQueries()`                   | Calls `queryClient.invalidateQueries` for every registered active-timer query                                      |
| `invalidateLogQueries(teamIds)`                    | Calls `queryClient.invalidateQueries` for each matching log query                                                  |
| `createOptimisticTimer(payload)`                   | Builds `AgencyActiveTimer` with `createOptimisticId("agency-active-timer")`, normalized link URL                   |
| `createOptimisticEntryFromTimer(timer, overrides)` | Builds `AgencyTimeEntry` from timer + overrides; computes `durationSeconds` via `getDurationSeconds`               |
| `getDurationSeconds(startedAt, endedAt)`           | `Math.max(1, Math.floor((endMs - startMs) / 1000))`                                                                |
| `createOptimisticId(prefix)`                       | `"${prefix}-${crypto.randomUUID()}"` or `"${prefix}-${Date.now()}-${random}"`                                      |
| `dedupeEntries(entries)`                           | Filters duplicate IDs using a `Set<string>`                                                                        |
| `formatDuration(seconds)`                          | Returns `"HH:MM:SS"` string — used in stop-timer success toast                                                     |
| `getCurrentUserId()`                               | Returns `authSession.value?.data?.user?.id ?? "unknown-user"`                                                      |

---

## Relationships

| Role                        | Entity                                                | Mechanism                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Incoming (Dependents)**   | `WorkspaceAgencyTimeTrackerBlock` component           | `useAgencyTimeTrackingStore()` — calls `startTimer`, `stopTimer`, `syncDraftFromActiveTimer`, draft setters, `registerActiveTimerQuery`, `registerLogQuery` |
| **Incoming (Dependents)**   | Any component mounting time-entry list                | calls `registerLogQuery` / `unregisterLogQuery`                                                                                                             |
| **Outgoing (Dependencies)** | `useAuthSession()`                                    | reads `authSession.value?.data?.user?.id` in `getCurrentUserId()`                                                                                           |
| **Outgoing (Dependencies)** | `useOrpc()` → `orpc.agencyOps.timer.start`            | `useMutation(orpc.agencyOps.timer.start.mutationOptions())`                                                                                                 |
| **Outgoing (Dependencies)** | `useOrpc()` → `orpc.agencyOps.timer.stop`             | `useMutation(orpc.agencyOps.timer.stop.mutationOptions())`                                                                                                  |
| **Outgoing (Dependencies)** | `useOrpc()` → `orpc.agencyOps.timeEntries.deleteMine` | `useMutation(orpc.agencyOps.timeEntries.deleteMine.mutationOptions())`                                                                                      |
| **Outgoing (Dependencies)** | `useToast()`                                          | `toast.add({ title, description, color })` — Nuxt UI toast composable                                                                                       |
| **Outgoing (Dependencies)** | `@tanstack/vue-query`                                 | `useMutation`, `useQueryClient` — all server state                                                                                                          |
| **Outgoing (Dependencies)** | `~/utils/get-error-message`                           | `getErrorMessage(error, fallback)`                                                                                                                          |
| **Outgoing (Dependencies)** | `~/utils/normalize-agency-link-url`                   | `normalizeAgencyLinkUrl(url)` → `{ normalizedUrl, error }` — validates and normalizes link URLs before mutation                                             |

## Standalone Status

**Not standalone** — depends on `useAuthSession`, `useOrpc`, `useToast`, `@tanstack/vue-query`, and two local utils.
