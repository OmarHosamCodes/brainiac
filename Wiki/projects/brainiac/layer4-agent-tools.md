---
title: Layer 4 — Agent Package: Workspace Tools & Runtime
tags: [layer4, agent, tools, workspace, runtime, search, mutation, patch]
---

# Layer 4 — Agent Package: Workspace Tools & Runtime

**Entity:** `tools.ts` — `buildDashboardAgentTools`, `createDashboardAgentWorkspaceRuntime`, `buildWorkspaceOverview`, `summarizeBlock`  
**Type:** Tool Factory + Runtime Module  
**File:** `packages/agent/src/tools.ts`

---

## 1. `createDashboardAgentWorkspaceRuntime`

```ts
export function createDashboardAgentWorkspaceRuntime(args: {
  nodes: WorkspaceNode[];
  updatedAt?: string | null;
}): DashboardAgentWorkspaceRuntime
```

Creates an in-memory mutable workspace context that tools operate on. Deep-clones the incoming nodes via `cloneWorkspaceNodes` (from `@brainiac/workspace`).

### Runtime Interface

| Method | Purpose |
|---|---|
| `getNodes()` | Returns current node array |
| `getUpdatedAt()` | Returns last mutation timestamp |
| `hasChanges()` | Returns `true` if any mutation applied |
| `toSnapshot()` | Returns `{ nodes, updatedAt }` deep clone |
| `applyMutation(mutator)` | Clones draft, calls `mutator(draft, timestamp)`, promotes draft to current, sets `changed = true` |

---

## 2. `buildWorkspaceOverview`

```ts
export function buildWorkspaceOverview(nodes: WorkspaceNode[]): string
```

Generates the agent's dashboard overview snippet injected into the system prompt. Renders up to 10 nodes as:
```
1. NodeTitle (N tabs, N blocks, block-type1, block-type2, ...)
```

---

## 3. `summarizeBlock`

```ts
export function summarizeBlock(block: WorkspaceBlock): string
```

Returns a one-line human-readable description per block type (e.g. `"N tasks"`, `"Live team time tracker"`, `"N cards across N columns"`). Used for workspace overview and search content previews.

---

## 4. `buildDashboardAgentTools`

```ts
export function buildDashboardAgentTools(
  workspace: DashboardAgentWorkspaceRuntime,
  marketplaceItems: WorkspaceMarketplaceItem[] = [],
  profile: "ask" | "agent" = "ask",
): Tool[]
```

Returns an array of OpenRouter-SDK `tool()` objects. Profile controls which mutation tools are included.

### Read-only Tools (available in both `ask` and `agent`)

| Tool Name | Description | Input | Output Schema |
|---|---|---|---|
| `list_dashboard_nodes` | List nodes with structural summaries | `{ limit (1–50) }` | `listDashboardNodesOutputSchema` |
| `search_dashboard` | Full-text search across node titles, descriptions, tabs, block content | `{ query, limit, nodeId? }` | `searchDashboardOutputSchema` |
| `list_marketplace_items` | List marketplace items by kind | `{ limit, kind }` | `listMarketplaceItemsOutputSchema` |
| `search_marketplace` | Full-text search marketplace items | `{ query, limit }` | `searchMarketplaceOutputSchema` |
| `get_node_details` | Get node summary or full raw payload | `{ nodeId, detailLevel }` | `getNodeDetailsOutputSchema` |
| `get_tab_details` | Get tab summary or full raw payload | `{ nodeId, tabId, detailLevel }` | `getTabDetailsOutputSchema` |
| `get_block_details` | Get block summary + `editGuide` or full raw payload | `{ nodeId, tabId, blockId, detailLevel }` | `getBlockDetailsOutputSchema` |
| `get_marketplace_item_details` | Get marketplace item summary or full raw payload | `{ itemId, detailLevel }` | `getMarketplaceItemDetailsOutputSchema` |
| `get_current_time` | Return ISO timestamp | `{}` | `z.object({ currentTime })` |

### Mutation Tools (only in `"agent"` profile)

| Tool Name | Description | Key Input Fields | Output Schema |
|---|---|---|---|
| `create_node` | Create a new workspace node | `{ title, label?, content?, tint?, template? }` | `nodeMutationOutputSchema` |
| `replace_node` | Replace a node's mutable fields | `{ nodeId, title, label?, content?, tint?, template? }` | `nodeMutationOutputSchema` |
| `delete_node` | Delete a node by ID | `{ nodeId }` | `deleteNodeOutputSchema` |
| `create_tab` | Add a tab to a node | `{ nodeId, title }` | `tabMutationOutputSchema` |
| `replace_tab` | Replace a tab's title | `{ nodeId, tabId, title }` | `tabMutationOutputSchema` |
| `delete_tab` | Remove a tab (promotes next sibling to active) | `{ nodeId, tabId }` | `deleteTabOutputSchema` |
| `create_block` | Create a typed block in a tab | `{ nodeId, tabId, type, title?, customTemplateId? }` | `blockMutationOutputSchema` |
| `patch_block` | Apply targeted operations to block fields | `{ nodeId, tabId, blockId, operations[] }` | `patchBlockOutputSchema` |
| `replace_block` | Full replace of a block (raw payload) | `{ nodeId, tabId, blockId, block }` | `blockMutationOutputSchema` |
| `delete_block` | Delete a block from a tab | `{ nodeId, tabId, blockId }` | `deleteBlockOutputSchema` |

### Supported Block Types (44 types)

`task-list`, `notes`, `table`, `checklist`, `decision`, `pros-cons`, `swot`, `tracker`, `ai-prompt`, `habit-grid`, `process`, `2x2-matrix`, `course-roadmap`, `learning-outcomes-matrix`, `time-orchestrator`, `cohort-health-dashboard`, `eisenhower-matrix`, `leadership-rhythm-planner`, `kanban`, `timeline`, `skills-heat-map`, `delegation-matrix`, `talent-grid`, `seat-planner`, `deal-scoring-matrix`, `pipeline-funnel`, `forecast-confidence-board`, `content-pipeline`, `content-quality-radar`, `content-roi-tracker`, `authority-scorecard`, `hook-bank`, `message-house`, `scorecard`, `okr-tracker`, `decision-matrix`, `business-model-canvas`, `assumption-tracker`, `profitability-cash-flow`, `pricing-simulator`, `collections-tracker`, `agency-project-manager`, `agency-time-tracker`, `agency-time-entries-log`, `agency-time-summary`, `agency-settings`, `custom`

---

## `patch_block` Path Syntax

Supports dot-separated paths with four selector types:
- `field.subfield` — plain field traversal
- `array[]` — all items (`kind: "all"`)
- `array[0]` — numeric index (`kind: "index"`)
- `array[id=abc123]` — field-value match (`kind: "field"`)

Operations: `set`, `merge`, `append`, `remove`

---

## Block Edit Guides (`describeBlockEditGuide`)

Every block type has a statically defined edit guide returned by `get_block_details`:
- `editableFieldPaths[]` — exact dot-path fields the agent may mutate
- `referenceFieldPaths[]` — fields that are references (must match existing IDs)
- `immutableFieldPaths[]` — always `["id", "type", "createdAt", "updatedAt"]`
- `notes[]` — additional constraints (e.g. kanban's `columnId` must match an existing column)

Agency blocks (`agency-time-tracker`, `agency-time-entries-log`, `agency-time-summary`) deliberately **exclude** local editor filter fields (`selectedClientId`, `selectedProjectId`, `selectedMemberUserId`, `selectedTagIds`, `fromDate`, `toDate`) from `editableFieldPaths` — these are UI-only state not persisted to the workspace.

---

## Search Implementation

`search_dashboard` scores hits across three levels:
1. **Block** content (highest) — `collectBlockSearchDetails()` extracts text fragments per block type
2. **Tab** title
3. **Node** title + content

Results sorted by score descending. Excerpts are extracted with `SEARCH_EXCERPT_LENGTH = 260` chars.

---

## Incoming Dependents

| Consumer | Mechanism |
|---|---|
| `packages/agent/src/index.ts` | calls `buildDashboardAgentTools(workspaceRuntime, marketplaceItems, toolPreset)` and `createDashboardAgentWorkspaceRuntime({ nodes, updatedAt })` |

## Outgoing Dependencies

| Dependency | Mechanism |
|---|---|
| `@brainiac/workspace` | imports 40+ block creator functions, schemas, `cloneWorkspaceNodes`, and `WorkspaceNode`/`WorkspaceBlock`/`WorkspaceMarketplaceItem` types |
| `@openrouter/sdk/lib/tool` (`tool`) | wraps each tool definition |
| `zod` | all I/O schemas |

## Standalone Status

Not standalone — depends on `@brainiac/workspace`, `@openrouter/sdk`, and `zod`.
