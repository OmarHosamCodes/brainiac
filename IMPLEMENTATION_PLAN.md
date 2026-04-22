# Agency Operations Redesign - Implementation Plan

## Overview

This document outlines the implementation strategy for the Agency Operation Blocks redesign, following the confirmed design brief.

## Phase 1: Foundation (Database & API)

### 1.1 Database Migrations

**File**: `packages/db/src/schema/agency-ops.ts`

- Remove: `agencyOpsSprint` table (cascade delete to sprint items, time entries)
- Remove: `agencyOpsSprintItem` table
- Simplify `agencyOpsClient`: remove `brandColor`, `status`, `archivedAt` fields
- Simplify `agencyOpsProject`: remove `description`, `status`, `budgetMinutes`, `archivedAt` fields
- Add `agencyOpsTag` table:
  - id (PK), teamId (FK), name, createdByUserId, createdAt, updatedAt
- Add junction tables:
  - `agencyOpsTimeEntryTag`: timeEntryId, tagId
  - `agencyOpsActiveTimerTag`: activeTimerId, tagId
- Update `agencyOpsTimeEntry`: remove `sprintId`, `sprintItemId`
- Update `agencyOpsActiveTimer`: remove `sprintId`, `sprintItemId`

### 1.2 API Router Updates

**File**: `packages/api/src/routers/agency-ops/index.ts` + `service.ts`

**Remove**:

- `sprints.*` endpoints (list, create, update)
- `sprintItems.*` endpoints (list, create, update)
- All sprint/sprintItem schema definitions
- References to sprint/sprintItem in reports

**Update**:

- `clients`: Remove `brandColor`, `status`, `archived` from schemas/inputs
- `projects`: Remove `description`, `status`, `budgetMinutes`, `archived` from schemas/inputs
- `timer.start`: Remove `sprintItemId` requirement, make `projectId` required, add `tagIds` optional
- `timer.stop`: Add `tagIds` optional
- `timeEntries.listMine`: Add `tagIds` filter, remove sprint/item filters
- `timeEntries.createManual`: Remove sprint/item references, add tag support
- `reports.summary`: Simplify to team activity + time by client/project

**Add**:

- `tags.*` endpoints:
  - `list(teamId)` → returns team tags
  - `create(teamId, name)` → creates new tag
  - `delete(teamId, tagId)` → soft/hard delete tag
  - `addToEntry(teamId, entryId, tagIds)` → tags a time entry
  - `removeFromEntry(teamId, entryId, tagIds)` → removes tags from time entry

## Phase 2: Frontend Components

### 2.1 Time Tracker Block

**File**: `apps/web/app/components/workspace/node/blocks/WorkspaceAgencyTimeTrackerBlockEditor.vue`

**Key changes**:

- Form structure: description (optional), project (required select), tags (multi-select from team list)
- Timer display: large monospaced elapsed time
- Button states: "Start" (idle) → "Stop" (running)
- Three-dot menu: appears only when running, contains "Discard timer" option
- Discard confirmation: inline confirmation, not modal
- Remove: sprint item selector, recent entries list
- Update schema in component: remove `showRecentEntries`, add `selectedTagIds`

### 2.2 Time Summary Block (formerly Time Reports)

**File**: `apps/web/app/components/workspace/node/blocks/WorkspaceAgencyTimeReportsBlockEditor.vue`

**Key changes**:

- Rename to `WorkspaceAgencyTimeSummaryBlockEditor.vue`
- Update block type: `"agency-time-summary"` (instead of `"agency-time-reports"`)
- Filter bar: date preset pills, then dropdowns (client, project, member, tags)
- List layout: one row per team member
  - Left: avatar + name + email
  - Center: latest/active entry (project, description snippet, tag chips)
  - Right: total hours (monospaced, bold)
- Live indicator: pulsing dot for active timers
- Remove: project burn charts, time distribution visualizations, CSV export
- Update schema: add `selectedTagIds` optional

### 2.3 Project Manager Block

**File**: `apps/web/app/components/workspace/node/blocks/WorkspaceAgencyProjectManagerBlockEditor.vue`

**Key changes**:

- Simplify layout: clients (left) | projects (right)
- Clients panel: name input + Add button, simple list of names (no color, no status)
- Projects panel: name input + Add button, simple list of names (filtered by selected client)
- Remove: client color picker, project description, budget, status, archive toggles
- Update schema: remove `selectedClientId`, `showArchivedClients`, `showArchivedProjects`

### 2.4 Time Entries Log Block

**File**: `apps/web/app/components/workspace/node/blocks/WorkspaceAgencyTimeEntriesLogBlockEditor.vue`

**Key changes**:

- Filter bar: client, project, member, tags (multi-select)
- Table columns: date, user, project, description, tags (chip display), duration, delete action
- Remove: sprint, sprint item columns
- Pagination: keep existing
- Delete action: soft delete with inline confirmation
- Update schema: add `selectedClientId`, `selectedProjectId`, `selectedMemberUserId`, `selectedTagIds`

### 2.5 Settings Block

**File**: `apps/web/app/components/workspace/node/blocks/WorkspaceAgencySettingsBlockEditor.vue`

**Key changes**:

- Keep: billing period configuration (start/end day of month)
- Add: Tags management section
  - Display: list of team tags with delete buttons
  - Create: inline input + Add button
  - Empty state: "No tags yet — add your first tag to start categorizing time entries"

## Phase 3: Workspace Schema Updates

**File**: `packages/workspace/src/schemas.ts`

- Add: `agencyOpsTagSchema` (for API response validation)
- Remove: `workspaceAgencySprintBoardBlockSchema`, type `"agency-sprint-board"`
- Update: `workspaceAgencyTimeTrackerBlockSchema` (remove `showRecentEntries`, add `selectedTagIds`)
- Rename: `workspaceAgencyTimeReportsBlockSchema` → `workspaceAgencyTimeSummaryBlockSchema`
- Update: `workspaceAgencyTimeReportsBlockSchema` (add `selectedTagIds`)
- Update: `workspaceAgencyProjectManagerBlockSchema` (remove archive/selection fields)
- Update: `workspaceAgencyTimeEntriesLogBlockSchema` (add filter fields)

## Phase 4: Component Removal & Migration

- Delete: `WorkspaceAgencySprintBoardBlockEditor.vue`
- Update: workspace block type registration to remove sprint board
- Add migration script: Convert stored blocks with type `"agency-time-reports"` to `"agency-time-summary"`

## Design System Application

All components will adhere to:

- **Spacing**: 4pt base scale (4, 8, 12, 16, 24, 32, 48, 64, 96px) using `gap` for sibling spacing
- **Typography**: Public Sans (body), JetBrains Mono (data/elapsed time), bold weights for hierarchy
- **Color**: Emerald accent (#10b981), zinc neutral (#27272a), dark mode first
- **Shape**: Highly rounded (32px cards, pill badges, 2xl inputs)
- **Interaction**:
  - Hover states (subtle lift, color shift)
  - Focus rings visible only for keyboard (`:focus-visible`)
  - Optimistic UI for create/delete operations
  - Loading skeletons not spinners
- **Motion**: Smooth ease-out deceleration, no bounce/elastic easing
- **States**: Design every state (idle, running, loading, error, empty, success)
- **Responsive**: Container queries for component adaptation, not viewport breakpoints

## Testing Checklist

- [ ] All blocks render without errors
- [ ] Time Tracker: start/stop timer flow
- [ ] Time Tracker: discard confirmation appears and works
- [ ] Time Summary: filters update list immediately
- [ ] Project Manager: create client → filter projects to that client
- [ ] Project Manager: no archive/status UI
- [ ] Time Entries Log: filters work, delete with confirmation
- [ ] Settings: create/delete tags
- [ ] All states tested: empty, loading, error, populated
- [ ] Responsive: mobile, tablet, desktop
- [ ] Keyboard navigation: all interactive elements
- [ ] Focus rings: visible only for keyboard
- [ ] AI slop test: no side-stripe borders, no gradient text, no generic cards

## Success Criteria

1. ✓ Design brief matches implementation exactly
2. ✓ Zero sprint/sprintItem references in code
3. ✓ Tag-based filtering working across all blocks
4. ✓ UI passes AI slop test (distinctive, intentional, not generic)
5. ✓ All states designed and intentional
6. ✓ Performance: no unnecessary re-renders, optimistic UI feedback
7. ✓ Accessibility: WCAG 2.1 AA, keyboard nav, screen reader support
