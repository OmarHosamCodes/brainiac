# Implementation Plan: Node Block Expansion

## Goal

Extend the current node editor so it can support the highest-value prototype blocks without breaking existing node data or overloading the current flat custom-template system.

This plan is implementation-oriented:

- schema changes
- helper/function changes
- UI component breakdown
- file-by-file change list
- phased delivery order

## Planning Decisions

### 1. Keep `@brainiac/workspace` as the source of truth

All block schemas, factories, normalization, cloning, derived calculations, and prompt-context helpers should remain in `packages/workspace`.

The web app should own:

- block labels/icons
- menus
- editor components
- page wiring

### 2. Do not stretch the current `custom` block into every prototype shape

The current `custom` block is a flat form-template system. It should remain available for simple structured forms.

Prototype parity should be delivered through:

- new first-class typed blocks for domain-native tools
- a later structured custom-block engine for reusable visual layouts

### 3. Upgrade the shared task model instead of creating a second task system

The prototype Time Orchestrator owns rich tasks, but the current product already has task-list blocks as the task source.

Recommended path:

- extend `WorkspaceTask`
- keep `time-orchestrator` as a specialized view/editor over shared tasks

This avoids duplicating task storage and keeps one canonical task model for:

- task-list blocks
- time orchestrator views
- search
- prompt context generation

### 4. Refactor the node page before adding many new blocks

`apps/web/app/pages/node/[id].vue` is already 2,381 lines. Adding new blocks directly into that file will slow every future change.

Recommended path:

- convert the node page into a shell
- move block rendering into a registry
- extract one component per block type

## Delivery Phases

## Phase 0: Refactor Groundwork

Goal: create a maintainable extension point before adding new block types.

Deliverables:

- block registry in the web app
- extracted shared node-editor components
- extracted editor component per existing block
- workspace search helpers moved out of the page

Why first:

- the current page is already large
- new block types will otherwise duplicate mutation, search, and rendering logic

## Phase 1: Highest-Value First-Class Blocks

Goal: implement the prototype blocks that are both highest-value and hardest to fake with the current custom template system.

Recommended Phase 1 blocks:

- `okr`
- `decision-matrix`
- `business-model-canvas`
- `deal-scoring`
- `content-pipeline`
- upgraded `time-orchestrator`

Also in Phase 1:

- enrich `WorkspaceTask`
- move AI prompt execution behind an abstraction so real-provider execution can be added later without rewriting block UIs

## Phase 2: Structured Generic Blocks

Goal: support the prototype’s reusable mini-app layouts.

Recommended Phase 2 blocks:

- `table`
- `checklist`
- `kanban`
- `scorecard`
- `swot`
- `pros-cons`
- `habit-grid`
- `process`
- `matrix-2x2`
- `timeline`

## Phase 3: Domain Packs and AI

Goal: make the node experience feel closer to the prototype’s domain workspaces.

Deliverables:

- quick-insert domain block packs
- node templates made of multiple blocks
- real AI provider execution
- domain-aware prompt presets

## Schema Changes

## A. Shared Schema Changes

These should go into `packages/workspace`.

### Extend `WorkspaceTask`

Current `WorkspaceTask` only supports:

- text
- completed
- dueDate
- priority

Add:

- `domain: WorkspaceTaskDomain | null`
- `urgency: number | null`
- `importance: number | null`
- `estimateMinutes: number | null`

Recommended enum:

- `general`
- `strategy`
- `people`
- `sales`
- `content`
- `brand`
- `finance`
- `education`

Recommended numeric ranges:

- `urgency`: 1-10
- `importance`: 1-10
- `estimateMinutes`: 0-1440

Why:

- enables prototype-grade orchestrator behavior
- keeps task-list and orchestrator aligned
- allows richer prioritization and time allocation

### New shared enums/primitives

Add:

- `workspaceTaskDomainSchema`
- `workspaceDealTemperatureSchema`
- `workspaceDealStageSchema`
- `workspaceContentStatusSchema`

These should be used by multiple blocks and avoid string drift in the UI.

## B. New Phase 1 Block Schemas

### `workspaceOkrBlockSchema`

Type: `okr`

Fields:

- `objectives[]`
- objective:
  - `id`
  - `title`
  - `keyResults[]`
- key result:
  - `id`
  - `label`
  - `progress`
  - `target`

Helpers needed:

- `createWorkspaceOkrBlock`
- `getOkrObjectiveProgress`
- `getOkrBlockProgress`

### `workspaceDecisionMatrixBlockSchema`

Type: `decision-matrix`

Fields:

- `question`
- `criteria[]`
- criterion:
  - `id`
  - `label`
  - `weight`
- `options[]`
- option:
  - `id`
  - `label`
  - `scores: Record<criterionId, number>`

Helpers needed:

- `createWorkspaceDecisionMatrixBlock`
- `getDecisionMatrixOptionScore`
- `getDecisionMatrixSummary`

### `workspaceBusinessModelCanvasBlockSchema`

Type: `business-model-canvas`

Fields:

- `keyPartners`
- `keyActivities`
- `keyResources`
- `valuePropositions`
- `customerRelationships`
- `channels`
- `customerSegments`
- `costStructure`
- `revenueStreams`

Helpers needed:

- `createWorkspaceBusinessModelCanvasBlock`

### `workspaceDealScoringBlockSchema`

Type: `deal-scoring`

Fields:

- `deals[]`
- deal:
  - `id`
  - `client`
  - `value`
  - `stage`
  - `temperature`
  - `score`
  - `nextAction`
  - `dueDate`

Helpers needed:

- `createWorkspaceDealScoringBlock`
- `getDealStageSummary`
- `sortDealsByPriority`

### `workspaceContentPipelineBlockSchema`

Type: `content-pipeline`

Fields:

- `items[]`
- item:
  - `id`
  - `title`
  - `status`
  - `platform`
  - `contentType`
  - `assignee`
  - `dueDate`

Helpers needed:

- `createWorkspaceContentPipelineBlock`
- `getContentPipelineColumnCounts`

### Extend `workspaceTimeOrchestratorBlockSchema`

Keep the type as `time-orchestrator`.

Add fields:

- `showCompleted: boolean`
- `groupBy: "quadrant" | "domain" | "due-date"`
- `sortBy: "priority-score" | "due-date" | "importance"`

Do not add a second embedded `tasks[]` array to this block.

Instead, upgrade orchestrator helpers to read from enriched `WorkspaceTask` objects collected from all `task-list` blocks in the node.

Helpers needed:

- `getTimeOrchestratorSummary` upgrade
- `getEisenhowerBuckets`
- `getDomainTimeAllocation`
- `getTaskPriorityScore`

## C. Future Phase 2 Block Schemas

These do not need to be implemented first, but the architecture should leave room for them.

Add later:

- `table`
- `checklist`
- `kanban`
- `scorecard`
- `swot`
- `pros-cons`
- `habit-grid`
- `process`
- `matrix-2x2`
- `timeline`

These are better modeled as first-class structured block schemas than as extensions of the current flat custom template system.

## D. Existing Schema Functions That Must Change

The following functions in `packages/workspace/src/index.ts` will need new cases for all added block types:

- `workspaceBlockSchema`
- `createWorkspace...Block` factory set
- `normalizeWorkspaceBlock`
- `cloneWorkspaceBlockForInsertion`
- `getWorkspaceNodePreview`
- `getWorkspaceNodeStats`
- `generateWorkspacePromptOutput`

Also add new shared helpers so block-specific logic is no longer hardcoded in the node page.

Recommended new helpers:

- `getWorkspaceBlockTitle(block)`
- `getWorkspaceBlockSearchText(block, templates?)`
- `getWorkspaceBlockSearchDetails(block, templates?)`
- `getWorkspaceBlockSummary(block)`

This removes the growing block-type switch logic from the page component.

## Persistence and Migration Notes

No relational DB migration is required because workspace nodes are stored as JSONB in [workspace.ts](/home/omar/Projects/Programming/StackBased/brainiac/packages/db/src/schema/workspace.ts).

What changes instead:

- Zod runtime schemas
- normalization defaults for older saved nodes
- block cloning
- marketplace payload validation

Migration approach:

- every new field must have a safe default
- `normalizeWorkspaceBlock` must backfill missing fields
- `normalizeWorkspaceNode` remains the compatibility boundary

## Package File Plan

Current state:

- all workspace schemas, factories, cloning, and analytics live in [index.ts](/home/omar/Projects/Programming/StackBased/brainiac/packages/workspace/src/index.ts)

Recommended structure:

- `packages/workspace/src/schemas.ts`
- `packages/workspace/src/factories.ts`
- `packages/workspace/src/analytics.ts`
- `packages/workspace/src/search.ts`
- `packages/workspace/src/index.ts`

Pragmatic alternative:

- keep `index.ts`
- but add clearly separated sections and move page-only helpers out of the node page first

Recommended choice:

- split now, before Phase 1 block additions

Reason:

- the file is already 1,173 lines
- Phase 1 plus Phase 2 additions will push it beyond maintainable size

## Web App Architecture Changes

## A. Turn the node page into a shell

Keep [node/[id].vue](/home/omar/Projects/Programming/StackBased/brainiac/apps/web/app/pages/node/[id].vue) responsible for:

- route lookup
- data loading
- autosave state
- tab modal state
- template modal state

Move out:

- block rendering
- block-specific mutation UIs
- block search helpers
- add-block metadata

## B. Introduce a block registry

Add:

- `apps/web/app/utils/workspace-block-registry.ts`

Registry responsibility:

- map `block.type` to label
- icon
- default creation callback
- editor component
- optional search category

This should be the single source of truth for the Add Block menu and renderer selection.

## C. Introduce a generic block renderer

Add:

- `apps/web/app/components/workspace/node/WorkspaceBlockRenderer.vue`

Responsibility:

- receive `block`, `tab`, `node`, and mutation callbacks
- resolve the proper editor component from the registry

## D. Extract shared node-editor shell components

Add:

- `WorkspaceNodeHeader.vue`
- `WorkspaceTabBar.vue`
- `WorkspaceBlockToolbar.vue`
- `WorkspaceBlockCard.vue`
- `WorkspaceBlockSearchBanner.vue`
- `WorkspaceAddBlockMenu.vue`

These components reduce repetition across block types and keep the page shell small.

## Component List

Recommended folder:

- `apps/web/app/components/workspace/node/`

## Shared components

### `WorkspaceNodeHeader.vue`

Responsibility:

- back button
- save badge
- node title/meta
- marketplace actions

### `WorkspaceTabBar.vue`

Responsibility:

- render tabs
- activate tab
- open create/rename/delete tab actions

### `WorkspaceBlockToolbar.vue`

Responsibility:

- search input
- add-block menu
- quick template buttons

### `WorkspaceBlockCard.vue`

Responsibility:

- standard card chrome
- title input
- type badge
- delete/export actions
- optional search-match banner slot

### `WorkspaceBlockRenderer.vue`

Responsibility:

- switch from block type to actual block editor component

### `WorkspacePromptOutputHistory.vue`

Responsibility:

- reusable output history UI for `ai-prompt` and custom-template prompt output

## Existing block editors to extract

These should be moved out of the page even if behavior does not change immediately.

- `WorkspaceTaskListBlockEditor.vue`
- `WorkspaceNotesBlockEditor.vue`
- `WorkspaceDecisionBlockEditor.vue`
- `WorkspaceTrackerBlockEditor.vue`
- `WorkspaceAiPromptBlockEditor.vue`
- `WorkspaceTimeOrchestratorBlockEditor.vue`
- `WorkspaceCustomBlockEditor.vue`
- `WorkspaceCustomTemplateBuilder.vue`

## New Phase 1 block editors

### `WorkspaceOkrBlockEditor.vue`

Features:

- objectives list
- nested key results
- average progress per objective
- add/remove objectives and KRs

### `WorkspaceDecisionMatrixBlockEditor.vue`

Features:

- editable question
- criteria rows
- option columns
- weight sliders
- option score sliders
- recommended option summary

### `WorkspaceBusinessModelCanvasBlockEditor.vue`

Features:

- fixed 9-cell grid
- textareas for each field

### `WorkspaceDealScoringBlockEditor.vue`

Features:

- deal cards or rows
- stage indicators
- score and temperature controls
- next-action and due-date display

### `WorkspaceContentPipelineBlockEditor.vue`

Features:

- kanban-like columns
- item creation
- status change actions
- item metadata badges

### `WorkspaceTimeOrchestratorBlockEditor.vue`

This replaces the current simpler renderer, not the block type.

Features:

- overdue/upcoming/high-priority/next-actions summary
- Eisenhower buckets
- domain time allocation
- direct editing of shared task metadata
- task completion from orchestrator

## Future Phase 2 block editors

- `WorkspaceTableBlockEditor.vue`
- `WorkspaceChecklistBlockEditor.vue`
- `WorkspaceKanbanBlockEditor.vue`
- `WorkspaceScorecardBlockEditor.vue`
- `WorkspaceSwotBlockEditor.vue`
- `WorkspaceProsConsBlockEditor.vue`
- `WorkspaceHabitGridBlockEditor.vue`
- `WorkspaceProcessBlockEditor.vue`
- `WorkspaceMatrix2x2BlockEditor.vue`
- `WorkspaceTimelineBlockEditor.vue`

## Shared visual primitives

Add later as needed:

- `WorkspaceMiniBarChart.vue`
- `WorkspaceMetricProgress.vue`
- `WorkspaceStagePills.vue`
- `WorkspaceQuadrantGrid.vue`
- `WorkspaceFunnelSummary.vue`

Keep these simple. No charting library is necessary for Phase 1.

## Web Utility and Composable Changes

Add:

- `apps/web/app/utils/workspace-block-registry.ts`
- `apps/web/app/utils/workspace-block-search.ts`
- `apps/web/app/composables/useWorkspaceNodeEditor.ts`

Responsibilities:

- centralize mutation helpers now embedded in the page
- centralize search-text extraction per block type
- centralize block creation menu metadata

Recommended note:

If composables feel heavy for the first pass, extract plain utility functions first and convert later only if state sharing becomes awkward.

## Marketplace Impact

Current marketplace helpers in [workspace-marketplace.ts](/home/omar/Projects/Programming/StackBased/brainiac/apps/web/app/utils/workspace-marketplace.ts) already clone arbitrary `WorkspaceBlock` unions.

Required changes:

- support new block types in block summaries and labels
- ensure new blocks clone correctly through `cloneWorkspaceBlockForInsertion`
- keep custom-template dependency logic only for `custom` blocks

No marketplace schema redesign is required.

## Search Impact

Current search is page-local and block-type specific.

Required changes:

- move block search extraction to shared helpers
- add search coverage for all new block types
- keep search local and synchronous

Recommended search behavior by new block:

- `okr`: objective titles, KR labels
- `decision-matrix`: question, criteria labels, option labels
- `business-model-canvas`: all 9 canvas fields
- `deal-scoring`: client, stage, next action, due date
- `content-pipeline`: title, assignee, platform, status
- `time-orchestrator`: task text, domain, due date

## Prompt and AI Impact

Current `AI prompt` blocks call `generateWorkspacePromptOutput`, which is a local summarizer.

Recommended implementation shape:

- keep `generateWorkspacePromptOutput` as a fallback summarizer in `@brainiac/workspace`
- introduce a web-level prompt runner abstraction
- later route prompt execution through the API layer for real providers

Do not couple new block editors directly to provider APIs.

Use an abstraction such as:

- `runWorkspacePrompt({ node, prompt, fallbackMode })`

This keeps the UI stable whether output is mocked or real.

## File-by-File Change List

## `packages/workspace`

Modify:

- [index.ts](/home/omar/Projects/Programming/StackBased/brainiac/packages/workspace/src/index.ts)

Add or split into:

- `schemas.ts`
- `factories.ts`
- `analytics.ts`
- `search.ts`

## `apps/web`

Modify:

- [node/[id].vue](/home/omar/Projects/Programming/StackBased/brainiac/apps/web/app/pages/node/[id].vue)
- [workspace-marketplace.ts](/home/omar/Projects/Programming/StackBased/brainiac/apps/web/app/utils/workspace-marketplace.ts)

Add:

- `apps/web/app/utils/workspace-block-registry.ts`
- `apps/web/app/utils/workspace-block-search.ts`
- `apps/web/app/composables/useWorkspaceNodeEditor.ts`
- `apps/web/app/components/workspace/node/WorkspaceNodeHeader.vue`
- `apps/web/app/components/workspace/node/WorkspaceTabBar.vue`
- `apps/web/app/components/workspace/node/WorkspaceBlockToolbar.vue`
- `apps/web/app/components/workspace/node/WorkspaceBlockCard.vue`
- `apps/web/app/components/workspace/node/WorkspaceBlockRenderer.vue`
- `apps/web/app/components/workspace/node/WorkspacePromptOutputHistory.vue`
- `apps/web/app/components/workspace/node/WorkspaceCustomTemplateBuilder.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceTaskListBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceNotesBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceDecisionBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceTrackerBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceAiPromptBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceTimeOrchestratorBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceCustomBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceOkrBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceDecisionMatrixBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceBusinessModelCanvasBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceDealScoringBlockEditor.vue`
- `apps/web/app/components/workspace/node/blocks/WorkspaceContentPipelineBlockEditor.vue`

## Recommended Implementation Order

1. Extract the node page shell and registry.
2. Move existing block editors out of the page unchanged.
3. Extend `WorkspaceTask` and upgrade orchestrator helpers.
4. Add Phase 1 block schemas and factories in `@brainiac/workspace`.
5. Add block search helpers and registry metadata for new block types.
6. Build Phase 1 editor components one block at a time.
7. Wire Add Block menu and marketplace summaries.
8. Add prompt-runner abstraction for AI blocks.

## Recommended Start Scope

If implementation begins immediately, start with this slice:

### Start Slice A

- page shell extraction
- block registry
- `WorkspaceTask` enrichment
- `time-orchestrator` upgrade

Reason:

- it improves existing functionality immediately
- it reduces the risk of future block additions
- it establishes the component architecture needed for everything else

### Start Slice B

- `okr`
- `decision-matrix`
- `business-model-canvas`

Reason:

- these are high-value and self-contained
- they mostly require form and derived-metric UI, not complex drag interactions

### Start Slice C

- `deal-scoring`
- `content-pipeline`

Reason:

- they bring visible prototype parity to sales and content workflows

## Success Criteria

This plan is successful when:

- the node page becomes a shell instead of a monolithic renderer
- block-type behavior moves into the workspace package or editor components
- new typed blocks can be added without editing a 2,000+ line page
- Time Orchestrator can use rich shared task metadata
- Phase 1 prototype blocks can be shipped without redesigning persistence
