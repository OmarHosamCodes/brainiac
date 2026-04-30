---
title: Agency Time Tracker Block
category: projects/brainiac
tags: [vue, nuxt, agency, time-tracking, pinia]
summary: "Workspace block for billable time tracking with grouped project/client selector, stop gating, and entry link support."
sources:
  - ~/.claude/projects/-home-omar-Projects-brainiac/ac9367d2-e5c0-4596-98b6-ea191f8ožt2.jsonl
  - ~/.codex/sessions/2026/04/22/rollout-2026-04-22T17-33-59.jsonl
provenance:
  extracted: 0.85
  inferred: 0.15
  ambiguous: 0.0
updated: 2026-04-23T01:25:34+02:00
---

# Agency Time Tracker Block

File: `apps/web/app/components/workspace/node/blocks/WorkspaceAgencyTimeTrackerBlockEditor.vue`

## Features

### Grouped Project/Client Selector

- Projects are grouped under non-selectable **client** headers
- Height is limited and the dropdown is scrollable
- Clients are displayed as section headers; only leaf projects are selectable

### Stop Gating

- The timer **cannot be stopped** unless:
  1. A **project** is selected
  2. At least **one tag** is selected
- The stop action is disabled with visual feedback when conditions are unmet

### Entry Links (Link Popover)

- A `i-lucide-link` ghost button appears inline with the timer controls
- On click, a popover opens where the user can insert/edit a URL
- Link icon is colored primary when a URL is set, ghost when empty
- URL is normalized before saving
- A `getAgencyLinkUrlDisplayLabel` util derives a human-readable label from the URL (hostname or short path)

### Tag Selector (Tag Popover)

- A `i-lucide-tag` ghost button is shown **only when tags exist** (`v-if="tags.length > 0"`)
- On click, a popover with searchable tag toggles opens
- Tags always show, with "No matching tags." when list is empty

### Active State Summary Row

- Below the main controls, a flex-wrap row is shown **only when tags are selected or a valid link URL is set**
- Link appears as a clickable pill (`<a>`) with a primary-tinted border, showing the display label and a link icon — opens in a new tab
- Each selected tag appears as a `UBadge` (soft primary, rounded-full)
- This gives at-a-glance confirmation of what will be recorded with the current timer entry

## Log Entry Consistency

The time entry log (`WorkspaceAgencyTimeEntriesLog`) uses the **same icon+popover pattern** as the tracker:

- Link: `i-lucide-link` → popover showing URL + "Open link" button with external-link icon (read-only in log)
- Tags: `i-lucide-tag` → same toggle popover, placed inline with the link button in a shared flex row

## Data Flow

- Draft state and optimistic updates managed in [[brainiac-pinia-store]]
- Link normalization happens before store mutation
- Mutation payloads wired through the store to the API

## Related

- [[brainiac-time-orchestrator]]
- [[brainiac-eisenhower-matrix]]
- [[brainiac]]
