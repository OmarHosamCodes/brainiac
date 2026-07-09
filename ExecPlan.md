# ExecPlan — Domain-driven restructure of `apps/web/src/components/agency` and `packages/api/src/routers`

Goal: break the two monolith directories into isolated feature domains without changing any
runtime behavior, public API shape, or component code. Every step is a `git mv` + import-path
update. `bun run check` and `bun run check-types` must pass after each phase.

## Domains

| Domain            | Owns                                                                                                   |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `time-tracking`   | Timer, mini-timer, time entries log/rows/groups, manual entries, time summary                          |
| `task-management` | Tasks, task lists, task threads, attachments, voice notes, work surface                                |
| `reports`         | Report creator, saved reports, report tables, CSV/XLSX export, dashboard summaries                     |
| `billing`         | Invoices, budgets, member rates, subscription state, pro upsell                                        |
| `clients`         | Client list, archive, contacts                                                                         |
| `projects`        | Projects, project detail, project journey                                                              |
| `resourcing`      | Capacity planning, tenure engine/policy/roster                                                         |
| `dashboard`       | Agency dashboard surface + command bar                                                                 |
| `settings`        | Colors, integrations, management surface                                                               |
| `notifications`   | Agency notification feed                                                                               |
| `shared`          | Cross-domain agency primitives (avatars, choosers, segment shell, filters, breadcrumbs, live/presence) |

Placement rule: a component goes to `shared` only if it is imported by 2+ domains today
(verified against current imports); everything else goes to the domain that renders it.

---

## Part 1 — Frontend: `apps/web/src/components/agency` → `apps/web/src/features/<domain>`

### 1.0 Shared UI primitives

The shadcn primitives move from `components/ui` to `apps/web/src/ui` per the target
architecture. They stay framework-generic; nothing agency-specific may live here.

| Current                                                                                                                                                                                   | New                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `apps/web/src/components/ui/*.tsx` (badge, button, card, command, context-menu, dialog, dropdown-menu, form, input, label, popover, separator, skeleton, sonner, tabs, textarea, tooltip) | `apps/web/src/ui/*.tsx` |

Update the `@/components/ui/*` alias usages to `@/ui/*` (tsconfig `paths` + `components.json`).

### 1.1 `features/shared` — cross-domain agency primitives

| Current (`components/agency/`)                   | New (`features/shared/`)                         |
| ------------------------------------------------ | ------------------------------------------------ |
| `agency-command-bar-ui.tsx`                      | `command-bar/agency-command-bar-ui.tsx`          |
| `agency-list-filter-command-bar.tsx`             | `command-bar/agency-list-filter-command-bar.tsx` |
| `agency-multi-select-filter.tsx`                 | `filters/agency-multi-select-filter.tsx`         |
| `agency-search-highlight.tsx`                    | `agency-search-highlight.tsx`                    |
| `agency-member-avatar.tsx`                       | `agency-member-avatar.tsx`                       |
| `agency-presence-avatars.tsx`                    | `live/agency-presence-avatars.tsx`               |
| `agency-project-hue-dot.tsx`                     | `agency-project-hue-dot.tsx`                     |
| `agency-segment-bar.tsx`                         | `segment/agency-segment-bar.tsx`                 |
| `agency-segment-body.tsx`                        | `segment/agency-segment-body.tsx`                |
| `agency-subtitle-breadcrumb.tsx`                 | `agency-subtitle-breadcrumb.tsx`                 |
| `agency-team-breadcrumb.tsx`                     | `agency-team-breadcrumb.tsx`                     |
| `agency-logo-loader.tsx`                         | `agency-logo-loader.tsx`                         |
| `agency-placeholder-surface.tsx`                 | `agency-placeholder-surface.tsx`                 |
| `agency-member-chooser.tsx`                      | `choosers/agency-member-chooser.tsx`             |
| `agency-project-chooser.tsx`                     | `choosers/agency-project-chooser.tsx`            |
| `work/task-list/agency-member-chooser-view.tsx`  | `choosers/agency-member-chooser-view.tsx`        |
| `work/task-list/agency-project-chooser-view.tsx` | `choosers/agency-project-chooser-view.tsx`       |

The member/project choosers are generic pickers consumed by task rows, the time tracker, and
report filters — that cross-domain fan-out is why they land in `shared`, not `task-management`.

### 1.2 `features/time-tracking`

| Current (`components/agency/`)                                 | New (`features/time-tracking/`)                      |
| -------------------------------------------------------------- | ---------------------------------------------------- |
| `agency-time-tracker.tsx`                                      | `agency-time-tracker.tsx`                            |
| `agency-mini-timer.tsx`                                        | `agency-mini-timer.tsx`                              |
| `work/task-list/agency-mini-timer-view.tsx`                    | `agency-mini-timer-view.tsx`                         |
| `agency-time-summary.tsx`                                      | `agency-time-summary.tsx`                            |
| `agency-description-suggestion-menu.tsx`                       | `agency-description-suggestion-menu.tsx`             |
| `agency-task-chooser.tsx`                                      | `choosers/agency-task-chooser.tsx`                   |
| `work/time-entries/agency-task-chooser-view.tsx`               | `choosers/agency-task-chooser-view.tsx`              |
| `agency-time-entries-log.tsx`                                  | `entries/agency-time-entries-log.tsx`                |
| `agency-time-entry-actions.tsx`                                | `entries/agency-time-entry-actions.tsx`              |
| `agency-time-entry-day-group.tsx`                              | `entries/agency-time-entry-day-group.tsx`            |
| `agency-time-entry-inline-edit.tsx`                            | `entries/agency-time-entry-inline-edit.tsx`          |
| `agency-time-entry-project-label.tsx`                          | `entries/agency-time-entry-project-label.tsx`        |
| `agency-time-entry-row.tsx`                                    | `entries/agency-time-entry-row.tsx`                  |
| `agency-time-entry-week-group.tsx`                             | `entries/agency-time-entry-week-group.tsx`           |
| `work/time-entries/agency-time-entries-log-view.tsx`           | `entries/agency-time-entries-log-view.tsx`           |
| `work/time-entries/agency-time-entry-day-group-view.tsx`       | `entries/agency-time-entry-day-group-view.tsx`       |
| `work/time-entries/agency-time-entry-recency-section-view.tsx` | `entries/agency-time-entry-recency-section-view.tsx` |
| `work/time-entries/agency-time-entry-row-view.tsx`             | `entries/agency-time-entry-row-view.tsx`             |
| `work/time-entries/agency-time-entry-week-group-view.tsx`      | `entries/agency-time-entry-week-group-view.tsx`      |
| `work/time-entries/agency-time-tracker-view.tsx`               | `agency-time-tracker-view.tsx`                       |

### 1.3 `features/task-management`

| Current (`components/agency/`)                       | New (`features/task-management/`)               |
| ---------------------------------------------------- | ----------------------------------------------- |
| `agency-work-surface.tsx`                            | `agency-work-surface.tsx`                       |
| `work/work-surface/*.tsx` (all 12 files)             | `work-surface/*.tsx`                            |
| `agency-task-list.tsx`                               | `task-list/agency-task-list.tsx`                |
| `agency-task-row.tsx`                                | `task-list/agency-task-row.tsx`                 |
| `agency-task-client-group.tsx`                       | `task-list/agency-task-client-group.tsx`        |
| `agency-task-create-inline.tsx`                      | `task-list/agency-task-create-inline.tsx`       |
| `agency-task-rail-summary.tsx`                       | `task-list/agency-task-rail-summary.tsx`        |
| `agency-task-title-chooser.tsx`                      | `task-list/agency-task-title-chooser.tsx`       |
| `agency-project-tasks.tsx`                           | `task-list/agency-project-tasks.tsx`            |
| `work/task-list/agency-task-client-group-view.tsx`   | `task-list/agency-task-client-group-view.tsx`   |
| `work/task-list/agency-task-create-inline-view.tsx`  | `task-list/agency-task-create-inline-view.tsx`  |
| `work/task-list/agency-task-display-row-view.tsx`    | `task-list/agency-task-display-row-view.tsx`    |
| `work/task-list/agency-task-group-row-view.tsx`      | `task-list/agency-task-group-row-view.tsx`      |
| `work/task-list/agency-task-groups-list.tsx`         | `task-list/agency-task-groups-list.tsx`         |
| `work/task-list/agency-task-journey-row-view.tsx`    | `task-list/agency-task-journey-row-view.tsx`    |
| `work/task-list/agency-task-list-view.tsx`           | `task-list/agency-task-list-view.tsx`           |
| `work/task-list/agency-task-project-group-view.tsx`  | `task-list/agency-task-project-group-view.tsx`  |
| `work/task-list/agency-task-rail-expand-button.tsx`  | `task-list/agency-task-rail-expand-button.tsx`  |
| `work/task-list/agency-task-rail-ring-button.tsx`    | `task-list/agency-task-rail-ring-button.tsx`    |
| `work/task-list/agency-task-rail-status-filters.tsx` | `task-list/agency-task-rail-status-filters.tsx` |
| `work/task-list/agency-task-row-view.tsx`            | `task-list/agency-task-row-view.tsx`            |
| `work/task-list/agency-task-title-chooser-view.tsx`  | `task-list/agency-task-title-chooser-view.tsx`  |
| `work/task-list/agency-task-virtual-list.tsx`        | `task-list/agency-task-virtual-list.tsx`        |
| `agency-task-thread.tsx`                             | `task-thread/agency-task-thread.tsx`            |
| `agency-task-composer.tsx`                           | `task-thread/agency-task-composer.tsx`          |
| `agency-task-media-player.tsx`                       | `task-thread/agency-task-media-player.tsx`      |
| `agency-voice-recorder.tsx`                          | `task-thread/agency-voice-recorder.tsx`         |
| `agency-attachment-grid.tsx`                         | `task-thread/agency-attachment-grid.tsx`        |
| `work/task-thread/*.tsx` (all 13 files)              | `task-thread/*.tsx`                             |

### 1.4 `features/reports`

| Current (`components/agency/`)         | New (`features/reports/`)                   |
| -------------------------------------- | ------------------------------------------- |
| `agency-reports-surface.tsx`           | `agency-reports-surface.tsx`                |
| `agency-reports-table.tsx`             | `agency-reports-table.tsx`                  |
| `agency-report-creator-surface.tsx`    | `creator/agency-report-creator-surface.tsx` |
| `agency-report-creator-header.tsx`     | `creator/agency-report-creator-header.tsx`  |
| `agency-report-creator-table.tsx`      | `creator/agency-report-creator-table.tsx`   |
| `agency-report-activity-menu.tsx`      | `creator/agency-report-activity-menu.tsx`   |
| `agency-report-history-menu.tsx`       | `creator/agency-report-history-menu.tsx`    |
| `agency-report-description-cell.tsx`   | `cells/agency-report-description-cell.tsx`  |
| `agency-report-duration-cell.tsx`      | `cells/agency-report-duration-cell.tsx`     |
| `agency-report-task-cell.tsx`          | `cells/agency-report-task-cell.tsx`         |
| `agency-report-entry-context-menu.tsx` | `agency-report-entry-context-menu.tsx`      |
| `agency-report-row-actions.tsx`        | `agency-report-row-actions.tsx`             |

### 1.5 `features/billing`

| Current (`components/agency/`)            | New (`features/billing/`)        |
| ----------------------------------------- | -------------------------------- |
| `agency-billing-surface.tsx`              | `agency-billing-surface.tsx`     |
| `agency-pro-upsell.tsx`                   | `agency-pro-upsell.tsx`          |
| `settings/agency-settings-rates-pane.tsx` | `agency-settings-rates-pane.tsx` |

### 1.6 `features/clients`

| Current (`components/agency/`)     | New (`features/clients/`)          |
| ---------------------------------- | ---------------------------------- |
| `agency-clients-surface.tsx`       | `agency-clients-surface.tsx`       |
| `agency-client-archive-filter.tsx` | `agency-client-archive-filter.tsx` |

### 1.7 `features/projects`

| Current (`components/agency/`)                      | New (`features/projects/`)                          |
| --------------------------------------------------- | --------------------------------------------------- |
| `agency-project-manager.tsx`                        | `agency-project-manager.tsx`                        |
| `agency-project-detail.tsx`                         | `agency-project-detail.tsx`                         |
| `agency-project-create-dialog.tsx`                  | `agency-project-create-dialog.tsx`                  |
| `agency-projects-table.tsx`                         | `agency-projects-table.tsx`                         |
| `agency-projects-virtual-table.tsx`                 | `agency-projects-virtual-table.tsx`                 |
| `journey/agency-project-journey-stepper.tsx`        | `journey/agency-project-journey-stepper.tsx`        |
| `journey/agency-project-journey-stepper-dialog.tsx` | `journey/agency-project-journey-stepper-dialog.tsx` |

### 1.8 `features/resourcing`

| Current (`components/agency/`)                      | New (`features/resourcing/`)                      |
| --------------------------------------------------- | ------------------------------------------------- |
| `agency-resourcing-surface.tsx`                     | `agency-resourcing-surface.tsx`                   |
| `settings/agency-settings-tenure-pane.tsx`          | `tenure/agency-settings-tenure-pane.tsx`          |
| `settings/agency-settings-tenure-member-detail.tsx` | `tenure/agency-settings-tenure-member-detail.tsx` |
| `settings/agency-settings-tenure-policy.tsx`        | `tenure/agency-settings-tenure-policy.tsx`        |
| `settings/agency-settings-tenure-roster.tsx`        | `tenure/agency-settings-tenure-roster.tsx`        |

### 1.9 `features/dashboard`

| Current (`components/agency/`)         | New (`features/dashboard/`)            |
| -------------------------------------- | -------------------------------------- |
| `agency-dashboard-surface.tsx`         | `agency-dashboard-surface.tsx`         |
| `agency-dashboard-command-bar.tsx`     | `agency-dashboard-command-bar.tsx`     |
| `agency-dashboard-command-bar.test.ts` | `agency-dashboard-command-bar.test.ts` |

### 1.10 `features/settings`

| Current (`components/agency/`)                   | New (`features/settings/`)              |
| ------------------------------------------------ | --------------------------------------- |
| `agency-management-surface.tsx`                  | `agency-management-surface.tsx`         |
| `settings/agency-settings-colors-pane.tsx`       | `agency-settings-colors-pane.tsx`       |
| `settings/agency-settings-integrations-pane.tsx` | `agency-settings-integrations-pane.tsx` |

### 1.11 `features/notifications`

| Current (`components/agency/`) | New (`features/notifications/`) |
| ------------------------------ | ------------------------------- |
| `agency-notifications.tsx`     | `agency-notifications.tsx`      |

After Part 1, `apps/web/src/components/agency/` is deleted. Non-agency directories
(`app-shell*`, `dashboard/agent-chat`, `workspace/`, `marketing/`, `shell/`, `canvas/`,
`auth/`, `team/`) are out of scope and stay in `components/`.

### 1.12 Phase 2 (follow-up): colocate hooks, containers, stores, and utils

The container/hook/store layer in `lib/agency`, `lib/utils`, `lib/queries`, and `stores`
follows its components into the same feature folders. Consolidated mapping:

| Current                                                                                                                                                                                                                                                   | New home                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| `lib/agency/work/hooks/use-agency-{mini-timer,elapsed-timer,time-entries-log,time-entry-row,time-tracker,task-chooser}.ts`                                                                                                                                | `features/time-tracking/hooks/`        |
| `lib/agency/work/{timer-validation,task-tracking-state,description-suggestions}{,.test}.ts`                                                                                                                                                               | `features/time-tracking/`              |
| `lib/agency/work/containers/agency-{mini-timer,task-chooser,time-entries-log,time-entry-row,time-tracker}-container.tsx`                                                                                                                                  | `features/time-tracking/containers/`   |
| `lib/utils/{time-entry-draft,group-time-entries,format-agency-day-label}*.ts`, `lib/schemas/agency-time-entry.ts`                                                                                                                                         | `features/time-tracking/`              |
| `stores/agency-{timer,time-tracking,time-entries-log}.ts`                                                                                                                                                                                                 | `features/time-tracking/stores/`       |
| `lib/agency/work/hooks/use-agency-{task-list,task-thread,task-title-chooser,attachment-grid,voice-recorder,work-surface,journey-live-sync}.ts`, `use-task-thread-*.ts`                                                                                    | `features/task-management/hooks/`      |
| `lib/agency/work/containers/agency-{task-list,task-thread,task-title-chooser,attachment-grid,voice-recorder,work-surface,work-surface-task-pane}-container.tsx`                                                                                           | `features/task-management/containers/` |
| `lib/utils/agency-task-*.ts`, `agency-thread-motion*.ts`, `agency-attachment-utils*.ts`, `group-tasks-by-recency.ts`, `lib/schemas/agency-work.ts`                                                                                                        | `features/task-management/`            |
| `stores/agency-task-{list,messages,thread}*.ts`                                                                                                                                                                                                           | `features/task-management/stores/`     |
| `lib/agency/reports/*`                                                                                                                                                                                                                                    | `features/reports/`                    |
| `lib/utils/{agency-report-grouping,export-agency-report-xlsx}*.ts`                                                                                                                                                                                        | `features/reports/`                    |
| `lib/agency/{hooks/use-agency-project-journey,journey/journey-step-layout}.ts`                                                                                                                                                                            | `features/projects/`                   |
| `lib/queries/billing.ts`                                                                                                                                                                                                                                  | `features/billing/`                    |
| `lib/queries/notifications.ts`                                                                                                                                                                                                                            | `features/notifications/`              |
| `lib/tenure-utils{,.test}.ts`                                                                                                                                                                                                                             | `features/resourcing/`                 |
| `lib/agency/work/hooks/use-agency-{member,project}-chooser.ts` + matching containers                                                                                                                                                                      | `features/shared/choosers/`            |
| `lib/agency/{live/*,agency-boot,agency-segment-boot,agency-segment-filters,use-agency-boot-gate,use-agency-list-filters,use-agency-time-range-filters,agency-client-archive-filter}.ts`, `lib/agency-{segments,management-sections,settings-sections}.ts` | `features/shared/`                     |
| `lib/utils/agency-{live-rpc,optimistic-merge,presence-members,query-cache,query-options,list-search,ui}*.ts`, `lib/queries/agency*.ts`, `stores/agency-{ops,optimistic}.ts`                                                                               | `features/shared/`                     |

Tests always move with the file they cover.

---

## Part 2 — Backend: `packages/api/src/routers`

`agent`, `notifications`, `team`, `workspace`, `system`, and the existing `billing` router are
already domain-scoped and stay put. The work is splitting `agency-ops` (index.ts 1,833 lines +
service.ts 6,076 lines) into domain modules.

Wire-compat constraint: `appRouter.agencyOps.<namespace>.<procedure>` must not change.
`routers/agency-ops/index.ts` becomes a thin aggregator that spreads the domain routers back
into the exact same namespace keys, so the frontend oRPC client needs zero changes.

### 2.1 Target layout

```
packages/api/src/routers/agency-ops/
  index.ts                  # aggregator only: composes domain routers into current shape
  shared/
    schemas.ts              # cross-domain zod output schemas currently inlined in index.ts
    membership.ts           # unchanged re-export of lib/team-membership
  clients/       { router.ts, service.ts }
  projects/      { router.ts, service.ts }
  tasks/         { router.ts, service.ts, task-agent.ts, task-title.ts, list-project-tasks-filters.ts }
  time-tracking/ { router.ts, service.ts, resolve-agency-timer-stop-binding.ts }
  reports/       { router.ts, service.ts, saved-reports-service.ts }
  billing/       { router.ts, service.ts }
  resourcing/    { router.ts, service.ts, tenure-engine.ts, tenure-service.ts }
  integrations/  { router.ts, stubs-service.ts }
  live/          { router.ts, live.ts }
```

### 2.2 Router namespace mapping (from `agency-ops/index.ts`)

| Namespace in `index.ts`                    | New router file           |
| ------------------------------------------ | ------------------------- |
| `clients`, `contacts`                      | `clients/router.ts`       |
| `projects` (incl. journey procedures)      | `projects/router.ts`      |
| `projectTasks`, `taskThreads`, `taskAgent` | `tasks/router.ts`         |
| `timer`, `timeEntries`, `summary`          | `time-tracking/router.ts` |
| `reports`                                  | `reports/router.ts`       |
| `invoices`, `budgets`, `rates`             | `billing/router.ts`       |
| `capacity`, `tenure`                       | `resourcing/router.ts`    |
| `integrations`                             | `integrations/router.ts`  |
| `live`                                     | `live/router.ts`          |

The shared zod schemas defined at the top of `index.ts` (`agencyClientSchema`,
`agencyProjectSchema`, `agencyProjectTaskSchema`, `agencyTaskMessageSchema`,
`agencyTimeEntrySchema`, journey/report/saved-report schemas, etc.) move to
`shared/schemas.ts`; domain routers import only what they use.

### 2.3 `service.ts` function mapping (all 6,076 lines accounted for)

| Exported functions                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | New service file           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| `listAgencyClients`, `createAgencyClient`, `updateAgencyClient`, `archiveAgencyClient`, `unarchiveAgencyClient`, `getClientContact`, `upsertClientContact`                                                                                                                                                                                                                                                                                                                                                          | `clients/service.ts`       |
| `listAgencyProjects`, `createAgencyProject`, `createAgencyProjectWithJourney`, `updateAgencyProject`, `getAgencyProjectJourney`, `updateAgencyProjectJourneySteps`, `addAgencyProjectJourneyStep`, `previewRemoveAgencyProjectJourneyStep`, `removeAgencyProjectJourneyStep`                                                                                                                                                                                                                                        | `projects/service.ts`      |
| `listAgencyProjectTasks`, `createAgencyProjectTask`, `completeAgencyProjectTaskForMember`, `updateAgencyProjectTaskBlueprint`, `updateAgencyProjectTask`, `deleteAgencyProjectTask`, `ensureTaskThreadByTaskId`, `listTaskThreadMessages`, `getTaskThreadMessageById`, `createTaskThreadMessage`, `validateTaskAttachmentUploadReferences`, `createTaskAttachmentPresignedUrl`, `createTaskLinkAttachment`, `deleteTaskAttachment`, `listTaskThreadMembers`, `getTaskThreadContext`, `listRecentTaskThreadMessages` | `tasks/service.ts`         |
| `getAgencyActiveTimer`, `listAgencyActiveMembers`, `startAgencyTimer`, `stopAgencyTimer`, `updateAgencyActiveTimerStart`, `listMyAgencyTimeEntries`, `createManualAgencyTimeEntry`, `updateMyAgencyTimeEntry`, `deleteMyAgencyTimeEntry`, `listAllAgencyTimeEntries`, `updateAnyAgencyTimeEntry`, `getAgencyTimeSummary`                                                                                                                                                                                            | `time-tracking/service.ts` |
| `getAgencyReportsSummary`, `getAgencyDashboardSummary`, `exportAgencyReportsCsv`                                                                                                                                                                                                                                                                                                                                                                                                                                    | `reports/service.ts`       |
| `listMemberRates`, `upsertMemberRate`, `listInvoices`, `getInvoiceSummary`, `createInvoice`, `updateInvoiceStatus`                                                                                                                                                                                                                                                                                                                                                                                                  | `billing/service.ts`       |
| `listMemberCapacity`, `setMemberCapacity`                                                                                                                                                                                                                                                                                                                                                                                                                                                                           | `resourcing/service.ts`    |

Sidecar files move whole with their tests:

| Current (`agency-ops/`)                                                                                                 | New                                |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| `task-agent.ts`                                                                                                         | `tasks/task-agent.ts`              |
| `task-title.ts` + `task-title.test.ts`                                                                                  | `tasks/`                           |
| `list-project-tasks-filters.ts` + `.test.ts`                                                                            | `tasks/`                           |
| `resolve-agency-timer-stop-binding.ts` + `.test.ts`                                                                     | `time-tracking/`                   |
| `saved-reports-service.ts`                                                                                              | `reports/saved-reports-service.ts` |
| `tenure-engine.ts` + `.test.ts`, `tenure-service.ts`                                                                    | `resourcing/`                      |
| `stubs-service.ts` (`listBudgetsStub` → `billing/service.ts`; `listIntegrationsStub` → `integrations/stubs-service.ts`) | split as noted                     |
| `live.ts`                                                                                                               | `live/live.ts`                     |
| `membership.ts`                                                                                                         | `shared/membership.ts`             |

Private helpers inside `service.ts` (row mappers, duration math, journey step helpers) move
to the domain that calls them; a helper used by 2+ domains goes to `shared/`.

Rules that keep applying after the split: every team-scoped service function still calls
`requireTeamMembership` first; routers stay thin (Zod in → service → Zod out); domain routers
never import each other's `service.ts` — cross-domain reads go through `shared/` or get
duplicated as a deliberate, documented exception.

---

## Migration order

Each step is independently shippable and ends with `bun run check` + `bun run check-types` green.

1. **Backend split** (highest risk reduction, zero client impact): create the domain folders
   under `routers/agency-ops/`, move sidecar files, split `service.ts` and `index.ts` per the
   tables above, rebuild `index.ts` as the aggregator. Wire shape unchanged — verify with a
   type-level assertion that `AppRouter` is identical before/after.
2. **Shared UI move**: `components/ui` → `src/ui`, update alias, mechanical find/replace.
3. **Frontend feature folders**: create `features/<domain>/`, `git mv` per Part 1 tables,
   fix imports. One domain per commit (conventional `refactor:` messages).
4. **Phase 2 colocation** (section 1.12): move hooks/containers/stores/utils into their
   feature folders. Optional but recommended; do it domain-by-domain.
5. Delete the now-empty `components/agency/` and `lib/agency/work/` directories; run
   `knip` to catch orphaned exports.

Non-goals: no component rewrites, no API renames, no new abstractions, no barrel files beyond
each domain's `router.ts`/existing entry points.
