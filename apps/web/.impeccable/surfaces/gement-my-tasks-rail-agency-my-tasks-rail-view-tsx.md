---
version: 1
slug: "gement-my-tasks-rail-agency-my-tasks-rail-view-tsx"
primary_target: "apps/web/src/features/task-management/my-tasks-rail/agency-my-tasks-rail-view.tsx"
related_targets:
  [
    "apps/web/src/features/task-management/containers/agency-my-tasks-rail-container.tsx",
    "apps/web/src/features/task-management/hooks/use-agency-my-tasks-rail.ts",
    "apps/web/src/features/task-management/work-surface/agency-work-surface-layout-view.tsx",
  ]
---

# My Tasks rail (Agency Tracker)

## Scope & mode

Operate — docked right rail on Tracker for personal task list + play-to-track. Not a new visual world; inherits Agency / Orch product system.

## Audience & job

Agency members managing open work while tracking time. Dual job: manage the list (filter, complete, create) and start the timer from a row.

## Direction (locked hybrid)

- Layout: D10 floating inset (margin, radius, elevation; Sheet on small screens)
- Active tracking: D08 accent on running task + related time-log highlight
- Keyboard: D02 J/K move, Enter play, progressive action disclosure
- Grouping: client groups; row meta `Assigned by X · Project name`
- Filters: Open / Done / Delegated pills (not tabs)

## Memorable moment

Play from the rail while the matching log rows light with the same tracking accent.

## Constraints

Clockify-adjacent task/play patterns; shadcn tokens; golden-file layers; collapse preference persisted locally.
