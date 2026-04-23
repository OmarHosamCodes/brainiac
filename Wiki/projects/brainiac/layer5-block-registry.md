---
title: Layer 5 — Block Registry & Block Editors (44 Block Types)
tags: [layer5, blocks, registry, vue, workspace, components]
---

# Layer 5 — Block Registry & Block Editors

## Block Registry — `workspace-block-registry.ts`

**Type:** Utility / Registry  
**File:** `apps/web/app/utils/workspace-block-registry.ts`

Maps every `WorkspaceBlock["type"]` discriminant to a `{ component, label, icon, addGroup }` entry. `addGroup` is `"primary"` | `"secondary"` | `null`.

- `"primary"` types (3): `task-list`, `notes`, `decision` — shown prominently in add menu
- `"secondary"` types (40+): all other blocks — shown in secondary section
- `null` types (2): `agency-settings`, `custom` (legacy) — not shown in add menu

### Exported Functions
| Export | Description |
|---|---|
| `workspaceBlockRegistry` | Full map of all 44 block types → component + metadata |
| `workspacePrimaryBlockTypes` | Filtered array of primary block type strings |
| `getWorkspaceBlockRegistryEntry(type)` | Lookup function for a single entry |
| `WorkspaceBlockRegistryEntry` | TypeScript type for registry entries |

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `WorkspaceNodeBlockRenderer.vue` | calls `getWorkspaceBlockRegistryEntry(block.type).component` for dynamic rendering |
| `WorkspaceEditorModal.vue` | reads registry for available block options display |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/workspace` | imports `WorkspaceBlock` type |
| All 44 block editor components | statically imported for the registry map |

**Standalone Status:** Not standalone — imports all 44 block editor Vue components + `@brainiac/workspace`.

---

## Block Editors — Complete Registry

All 44 block editors reside in `apps/web/app/components/workspace/node/blocks/`. All consume `WorkspaceNodeEditorContext` via `inject(workspaceNodeEditorContextKey)` and receive a `block` prop.

### Core Block Editors (5)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceTaskListBlockEditor` | `task-list` | Task CRUD, priority/domain filters, urgency/importance sliders, due dates, Eisenhower quadrant integration |
| `WorkspaceNotesBlockEditor` | `notes` | Rich text notes with markdown preview panel |
| `WorkspaceTableBlockEditor` | `table` | Dynamic column/row table editor |
| `WorkspaceChecklistBlockEditor` | `checklist` | Simple checked/unchecked item list |
| `WorkspaceDecisionBlockEditor` | `decision` | Structured decision capture (context, options, outcome) |

### Analysis Block Editors (4)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceSwotBlockEditor` | `swot` | 4-quadrant SWOT analysis grid |
| `WorkspaceProsConsBlockEditor` | `pros-cons` | Pros vs. cons comparison list |
| `WorkspaceDecisionMatrixBlockEditor` | `decision-matrix` | Weighted criteria scoring matrix |
| `Workspace2x2MatrixBlockEditor` | `2x2-matrix` | Generic 2×2 positioning matrix |

### Planning Block Editors (4)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceKanbanBlockEditor` | `kanban` | Multi-column kanban with card drag/move |
| `WorkspaceTimelineBlockEditor` | `timeline` | Milestone timeline with dates |
| `WorkspaceProcessBlockEditor` | `process` | Ordered process/workflow steps |
| `WorkspaceHabitGridBlockEditor` | `habit-grid` | Daily habit tracking grid |

### Business Block Editors (4)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceOkrTrackerBlockEditor` | `okr-tracker` | OKR objectives + key results |
| `WorkspaceScorecardBlockEditor` | `scorecard` | Metric tracking scorecard |
| `WorkspaceBusinessModelCanvasBlockEditor` | `business-model-canvas` | Full 9-section BMC |
| `WorkspacePricingSimulatorBlockEditor` | `pricing-simulator` | Pricing scenario simulator |

### Sales/Revenue Block Editors (4)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceDealScoringMatrixBlockEditor` | `deal-scoring-matrix` | Deal scoring criteria matrix |
| `WorkspacePipelineFunnelBlockEditor` | `pipeline-funnel` | Sales pipeline stages |
| `WorkspaceForecastConfidenceBoardBlockEditor` | `forecast-confidence-board` | Revenue forecast + confidence levels |
| `WorkspaceProfitabilityCashFlowBlockEditor` | `profitability-cash-flow` | P&L and cash flow tracker |

### Content Block Editors (4)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceContentPipelineBlockEditor` | `content-pipeline` | Content production pipeline |
| `WorkspaceContentQualityRadarBlockEditor` | `content-quality-radar` | Quality criteria radar chart |
| `WorkspaceContentRoiTrackerBlockEditor` | `content-roi-tracker` | Content ROI measurement |
| `WorkspaceHookBankBlockEditor` | `hook-bank` | Content hook/idea library |

### HR/Teams Block Editors (4)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceTalentGridBlockEditor` | `talent-grid` | 9-box talent/performance grid |
| `WorkspaceSkillsHeatMapBlockEditor` | `skills-heat-map` | Team skills coverage heat map |
| `WorkspaceSeatPlannerBlockEditor` | `seat-planner` | Org seat ownership planner |
| `WorkspaceDelegationMatrixBlockEditor` | `delegation-matrix` | Task delegation responsibility matrix |

### Learning Block Editors (2)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceCourseRoadmapBlockEditor` | `course-roadmap` | Learning path + module roadmap |
| `WorkspaceLearningOutcomesMatrixBlockEditor` | `learning-outcomes-matrix` | Learning outcomes mapping |

### Time/Orchestration Block Editors (3)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceTimeOrchestratorBlockEditor` | `time-orchestrator` | Collects tasks from connected nodes, filters by Eisenhower quadrant, time allocation |
| `WorkspaceLeadershipRhythmPlannerBlockEditor` | `leadership-rhythm-planner` | Leadership cadence + meeting rhythm |
| `WorkspaceEisenhowerMatrixBlockEditor` | `eisenhower-matrix` | Task prioritization by urgency/importance quadrant |

### Agency Block Editors (6)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceAgencyProjectManagerBlockEditor` | `agency-project-manager` | Client + project CRUD, links to agency-ops router |
| `WorkspaceAgencyTimeTrackerBlockEditor` | `agency-time-tracker` | Timer start/stop, project/tag selection, active timer display |
| `WorkspaceAgencyTimeEntriesLogBlockEditor` | `agency-time-entries-log` | Paginated time entries with edit/delete |
| `WorkspaceAgencyTimeSummaryBlockEditor` | `agency-time-summary` | Weekly hours summary by project/user |
| `WorkspaceAgencyBillingReportBlockEditor` | `agency-billing-report` | Billable hours export (CSV) |
| `WorkspaceAgencySettingsBlockEditor` | `agency-settings` | Agency operator global settings (hourly rate, currency) |

### Health/Tracking Block Editors (4)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceCohortHealthDashboardBlockEditor` | `cohort-health-dashboard` | User cohort retention/health metrics |
| `WorkspaceAssumptionTrackerBlockEditor` | `assumption-tracker` | Assumption validation tracking |
| `WorkspaceCollectionsTrackerBlockEditor` | `collections-tracker` | Receivables/collections tracking |
| `WorkspaceAuthorityScorecardBlockEditor` | `authority-scorecard` | Brand authority measurement |

### Messaging Block Editor (1)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceMessageHouseBlockEditor` | `message-house` | Brand messaging architecture |

### AI & Tracker Block Editors (3)

| Component | Block Type | Key Features |
|---|---|---|
| `WorkspaceAiPromptBlockEditor` | `ai-prompt` | Custom AI prompt with template + output display; calls `orpc.agent.chat.turn` via context |
| `WorkspaceCustomBlockEditor` | `custom` | Legacy custom block (formula evaluation, template fill) |
| `WorkspaceTrackerBlockEditor` | `tracker` | Generic numeric tracker/chart |

---

## Universal Block Editor Dependencies

All block editors share these outgoing dependencies:
| Dependency | Mechanism |
|---|---|
| `~/components/workspace/node/context` | `inject(workspaceNodeEditorContextKey)` — receives all CRUD methods |
| `@brainiac/workspace` | block-specific types from the schema package |
| Nuxt UI | UI primitives (inputs, buttons, selects, modals) |

Agency block editors additionally depend on:
| Dependency | Mechanism |
|---|---|
| `useAgencyTimeTrackingStore()` (Pinia) | clocks in/out, reads active timer, optimistic cache patching |
| `useOrpc()` | agency-ops router mutations (via context or direct) |
