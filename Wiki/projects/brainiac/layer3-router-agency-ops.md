---
title: Layer 3 — Agency Ops Router
tags: [layer3, api, orpc, router, agency-ops, time-tracking, reports, pro]
---

# Layer 3 — Agency Ops Router

**Entity:** `agencyOpsRouter`  
**Type:** ORPC Router (Pro-only)  
**File:** `packages/api/src/routers/agency-ops/index.ts`

> All procedures use `protectedProProcedure` — every call requires an active Pro subscription enforced via `requirePro` middleware in `billing-guard.ts`.

## Inline Schemas (defined in router file)

| Schema                    | Key Fields                                                                                                                                                                                                        |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `agencyClientSchema`      | `{ id, teamId, name, createdAt, updatedAt }`                                                                                                                                                                      |
| `agencyProjectSchema`     | `{ id, teamId, clientId, clientName, name, createdAt, updatedAt }`                                                                                                                                                |
| `agencyTagSchema`         | `{ id, teamId, name, createdAt, updatedAt }`                                                                                                                                                                      |
| `agencyTimeEntrySchema`   | `{ id, teamId, userId, userName, projectId, projectName, clientId, clientName, tags[], source ("timer"\|"manual"), description, linkUrl (url\|null), startedAt, endedAt, durationSeconds, createdAt, updatedAt }` |
| `agencyActiveTimerSchema` | `{ id, teamId, userId, projectId, projectName, tags[], description, linkUrl (url\|null), startedAt, createdAt, updatedAt }`                                                                                       |
| `timeSummarySchema`       | `{ totalSeconds, activeCount, teamMembers[{ id, avatar, name, email, isActive, totalSeconds, latestEntry }] }`                                                                                                    |
| `reportsSummarySchema`    | `{ totalHours, totalEntries, timeDistributionByClient[], timeDistributionByProject[], teamActivity[] }`                                                                                                           |
| `teamScopedInputSchema`   | `{ teamId: string }` — base for all team-scoped inputs                                                                                                                                                            |
| `reportsInputSchema`      | extends `teamScopedInputSchema` with `{ from, to, clientId?, projectId?, memberUserId?, tagIds? }`                                                                                                                |

## Procedure Map

### `agencyOps.clients`

| Procedure        | Input                         | Handler                                                                |
| ---------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `clients.list`   | `{ teamId }`                  | `listAgencyClients(userId, input)` → `{ items: agencyClientSchema[] }` |
| `clients.create` | `{ teamId, name (max 120) }`  | `createAgencyClient(userId, input)` → `agencyClientSchema`             |
| `clients.update` | `{ teamId, clientId, name? }` | `updateAgencyClient(userId, input)` → `agencyClientSchema`             |

### `agencyOps.projects`

| Procedure         | Input                                     | Handler                                                                  |
| ----------------- | ----------------------------------------- | ------------------------------------------------------------------------ |
| `projects.list`   | `{ teamId, clientId? }`                   | `listAgencyProjects(userId, input)` → `{ items: agencyProjectSchema[] }` |
| `projects.create` | `{ teamId, clientId, name (max 160) }`    | `createAgencyProject(userId, input)` → `agencyProjectSchema`             |
| `projects.update` | `{ teamId, projectId, clientId?, name? }` | `updateAgencyProject(userId, input)` → `agencyProjectSchema`             |

### `agencyOps.tags`

| Procedure     | Input                       | Handler                                                    |
| ------------- | --------------------------- | ---------------------------------------------------------- |
| `tags.list`   | `{ teamId }`                | `listTags(userId, input)` → `{ items: agencyTagSchema[] }` |
| `tags.create` | `{ teamId, name (max 50) }` | `createTag(userId, input)` → `agencyTagSchema`             |
| `tags.delete` | `{ teamId, tagId }`         | `deleteTag(userId, input)` → `{ tagId, deleted }`          |

### `agencyOps.timer`

| Procedure         | Input                                                    | Handler                                                                                                                  |
| ----------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `timer.getActive` | `{ teamId? }`                                            | `getAgencyActiveTimer(userId, input)` → `{ timer: agencyActiveTimerSchema\|null }`                                       |
| `timer.start`     | `{ teamId, projectId, description?, linkUrl?, tagIds? }` | `startAgencyTimer(userId, input)` → `{ timer: agencyActiveTimerSchema\|null }`                                           |
| `timer.stop`      | `{ teamId?, description?, linkUrl?, tagIds?, discard? }` | `stopAgencyTimer(userId, input)` → `{ timer: agencyActiveTimerSchema\|null, createdEntry: agencyTimeEntrySchema\|null }` |

### `agencyOps.timeEntries`

| Procedure                  | Input                                                                    | Handler                                                                                      |
| -------------------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| `timeEntries.listMine`     | `{ teamId, page?, pageSize? (max 100), anchorDate? }`                    | `listMyAgencyTimeEntries(userId, input)` → `{ items[], page, pageSize, total, weekSummary }` |
| `timeEntries.createManual` | `{ teamId, projectId, startAt, endAt, description?, linkUrl?, tagIds? }` | `createManualAgencyTimeEntry(userId, input)` → `agencyTimeEntrySchema`                       |
| `timeEntries.updateMine`   | `{ teamId, entryId, startAt?, endAt?, description?, linkUrl? }`          | `updateMyAgencyTimeEntry(userId, input)` → `agencyTimeEntrySchema`                           |
| `timeEntries.deleteMine`   | `{ teamId, entryId }`                                                    | `deleteMyAgencyTimeEntry(userId, input)` → `{ entryId, deleted }`                            |

### `agencyOps.summary`

| Procedure      | Input                | Handler                                                                  |
| -------------- | -------------------- | ------------------------------------------------------------------------ |
| `summary.list` | `reportsInputSchema` | `getAgencyTimeSummary(userId, input)` → `{ summary: timeSummarySchema }` |

### `agencyOps.reports`

| Procedure             | Input                                                                                                             | Handler                                                                                           |
| --------------------- | ----------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `reports.summary`     | `reportsInputSchema`                                                                                              | `getAgencyReportsSummary(userId, input)` → `{ summary: reportsSummarySchema }`                    |
| `reports.exportCsv`   | `reportsInputSchema`                                                                                              | `exportAgencyReportsCsv(userId, input)` → `{ contentType: "text/csv", fileName, csv, totalRows }` |
| `reports.listEntries` | extends `reportsInputSchema` with `{ page?, pageSize? }`                                                          | `listAllAgencyTimeEntries(userId, input)` → `{ items[], page, pageSize, total }`                  |
| `reports.updateEntry` | extends `teamScopedInputSchema` with `{ entryId, startAt?, endAt?, description?, linkUrl?, projectId?, tagIds? }` | `updateAnyAgencyTimeEntry(userId, input)` → `agencyTimeEntrySchema`                               |

## Outgoing Dependencies

| Dependency                                   | Mechanism                                                                                       |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `../../procedures` (`protectedProProcedure`) | base procedure for every route — enforces Pro tier                                              |
| `./service`                                  | imports all 19 service functions for clients, projects, tags, timers, time entries, and reports |

## Incoming Dependents

| Consumer                                  | Mechanism                                                                                              |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `routers/index.ts`                        | mounted as `agencyOps: agencyOpsRouter` on `appRouter`                                                 |
| `apps/web` — `useAgencyTimeTrackingStore` | calls timer start/stop/getActive, time entry list/create/update/delete, summary, and report procedures |

## Standalone Status

Not standalone — depends on `protectedProProcedure` and all `./service` functions.
