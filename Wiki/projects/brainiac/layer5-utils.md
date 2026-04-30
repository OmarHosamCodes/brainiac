---
title: Layer 5 — Utilities & Constants
tags: [layer5, utils, constants, workspace, formatting, mentions, connections, marketplace]
---

# Layer 5 — Utilities & Constants

## 1. `workspace-block-registry.ts`

Documented in `layer5-block-registry.md`.

---

## 2. `workspace-node-connections.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/workspace-node-connections.ts`

Connection validation utilities for the infinite canvas.

### Exported Functions

| Function                                                   | Signature                                    | Description                                                                                                                                                                                                         |
| ---------------------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getCanonicalConnectionPair(source, target)`               | `→ WorkspaceCanonicalConnectionPair \| null` | Returns `{ orchestratorNodeId, standardNodeId }` given two nodes. Returns `null` if: same node, same type, either is `agency-operator`. Correctly assigns orchestrator/standard roles regardless of argument order. |
| `hasConnection(nodes, orchestratorNodeId, standardNodeId)` | `→ boolean`                                  | Checks if orchestrator's `connections[]` contains `targetNodeId === standardNodeId`                                                                                                                                 |
| `getEligibleConnectionTargetIds(nodes, sourceNodeId)`      | `→ string[]`                                 | Returns all node IDs that `sourceNodeId` can connect to (no existing connection, valid pair type)                                                                                                                   |
| `sanitizeConnections(nodes)`                               | `→ WorkspaceNode[]`                          | Strips connections from non-orchestrators, deduplicates, removes broken refs; called by workspace store on save                                                                                                     |

### Incoming Dependents

| Consumer             | Mechanism                                                                             |
| -------------------- | ------------------------------------------------------------------------------------- |
| `InfiniteCanvas.vue` | `getCanonicalConnectionPair`, `getEligibleConnectionTargetIds` for connection preview |
| `useWorkspaceStore`  | `sanitizeConnections` before save                                                     |

### Outgoing Dependencies

| Dependency            | Mechanism                                        |
| --------------------- | ------------------------------------------------ |
| `@brainiac/workspace` | `WorkspaceNode`, `WorkspaceNodeConnection` types |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace` types.

---

## 3. `workspace-node-dashboard.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/workspace-node-dashboard.ts`

Node tint/color utilities for canvas display.

### Exported Items

| Export                             | Description                                                                                                                      |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `workspaceNodeTintOptions`         | Array of 6 `WorkspaceNodeTintOption` objects (neutral/emerald/sky/amber/rose/indigo) with `value`, `label`, `description`, `rgb` |
| `getWorkspaceNodeTintOption(tint)` | Finds option by tint value, falls back to neutral                                                                                |
| `getWorkspaceNodeTintStyle(tint)`  | Returns `CSSProperties` with `--workspace-node-rgb` CSS custom property                                                          |
| `WorkspaceNodeTintOption`          | TypeScript type                                                                                                                  |

### Incoming Dependents

| Consumer                   | Mechanism                                                                |
| -------------------------- | ------------------------------------------------------------------------ |
| `InfiniteCanvas.vue`       | `getWorkspaceNodeTintOption`, `getWorkspaceNodeTintStyle` for node color |
| `WorkspaceNodeCard.vue`    | `getWorkspaceNodeTintStyle`                                              |
| `WorkspaceEditorModal.vue` | `workspaceNodeTintOptions` for swatch picker                             |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace` types.

---

## 4. `workspace-marketplace.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/workspace-marketplace.ts`

Serialization/deserialization utilities for marketplace payloads.

### Exported Functions

| Function                                     | Description                                                                          |
| -------------------------------------------- | ------------------------------------------------------------------------------------ |
| `createNodeMarketplacePayload(node)`         | Wraps `node` into `WorkspaceMarketplacePayload { kind: "node" }` via schema parse    |
| `createTabMarketplacePayload(node, tab)`     | Extracts tab + its custom block template dependencies into `{ kind: "tab" }` payload |
| `createBlockMarketplacePayload(node, block)` | Extracts block + template dependencies into `{ kind: "block" }` payload              |
| `cloneMarketplaceNodePayloadAsNode(payload)` | Clones payload into a fresh `WorkspaceNode` (new IDs, private visibility)            |
| `cloneMarketplaceTabPayload(payload)`        | Returns `{ templates, tab }` clones for insertion into existing node                 |
| `cloneMarketplaceBlockPayload(payload)`      | Returns `{ templates, block }` clones for insertion into existing tab                |
| `getMarketplacePayloadTypeLabel(payload)`    | `"Node" \| "Tab" \| "Block"`                                                         |
| `getMarketplacePayloadSummary(payload)`      | `"3 tabs"` / `"5 blocks"` / `"task-list"`                                            |

### Incoming Dependents

| Consumer                     | Mechanism                                                                                         |
| ---------------------------- | ------------------------------------------------------------------------------------------------- |
| `pages/node/[id].vue`        | `createBlockMarketplacePayload`, `createNodeMarketplacePayload`, `createTabMarketplacePayload`    |
| `MarketplaceImportModal.vue` | `cloneMarketplaceNodePayloadAsNode`, `cloneMarketplaceTabPayload`, `cloneMarketplaceBlockPayload` |

### Outgoing Dependencies

| Dependency            | Mechanism                                                                             |
| --------------------- | ------------------------------------------------------------------------------------- |
| `@brainiac/workspace` | all clone/create functions, `workspaceMarketplacePayloadSchema`, node/tab/block types |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace`.

---

## 5. `workspace-add-block-menu.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/workspace-add-block-menu.ts`

Builds the "Add Block" dropdown menu structure from `workspaceBlockCategories` (from `@brainiac/workspace`). Returns `DropdownMenuItem[][]` grouped by category.

### Exported Functions

- `createWorkspaceAddBlockMenuItems(onSelect, node)` → `DropdownMenuItem[][]`

### Incoming Dependents

| Consumer              | Mechanism                                                     |
| --------------------- | ------------------------------------------------------------- |
| `pages/node/[id].vue` | computes `addBlockMenuItems` for `WorkspaceNodeEditorContext` |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace`, `@nuxt/ui` types.

---

## 6. `workspace-block-presets.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/workspace-block-presets.ts`

Defines 5 pre-configured block packs that create multiple blocks at once:

| Preset ID         | Label           | Blocks Created                                                |
| ----------------- | --------------- | ------------------------------------------------------------- |
| `plan-and-ship`   | Plan and ship   | task-list, kanban, timeline, scorecard                        |
| `decision-sprint` | Decision sprint | notes, decision, task-list, timeline                          |
| `ops-cadence`     | Ops cadence     | scorecard, okr-tracker, process, task-list                    |
| `people-review`   | People review   | talent-grid, delegation-matrix, skills-heat-map               |
| `strategy-room`   | Strategy room   | notes, swot, decision-matrix, okr-tracker, assumption-tracker |

### Incoming Dependents

| Consumer              | Mechanism                                                                             |
| --------------------- | ------------------------------------------------------------------------------------- |
| `pages/node/[id].vue` | `getWorkspaceBlockPreset`, `workspaceBlockPresets` for `blockPresetMenuItems` context |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace` factory functions.

---

## 7. `workspace-node-formatters.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/workspace-node-formatters.ts`

Display formatting for task metadata and formula results.

| Function                                       | Description                                                                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `getWorkspaceTaskPriorityBadgeClass(priority)` | Returns Tailwind CSS class string for `high` / `medium` / `low` / `null` priority                                               |
| `formatWorkspaceRelativeTaskMeta(item)`        | Builds `"NodeTitle / TabTitle / BlockTitle • domain • Due date • priority • U{urgency} • I{importance} • {minutes} min"` string |
| `formatWorkspaceFormulaResult(value)`          | Returns `"Invalid formula"` or integer/2dp number string                                                                        |

### Incoming Dependents

| Consumer              | Mechanism       |
| --------------------- | --------------- |
| `pages/node/[id].vue` | all 3 functions |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace` types + `getWorkspaceTaskDomainLabel`.

---

## 8. `dashboard-agent-mentions.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/dashboard-agent-mentions.ts`

@mention parsing and node suggestion scoring for the agent chat input.

| Function                                                                   | Description                                                                                        |
| -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `getActiveDashboardNodeMention(draft)`                                     | Regex match for `/(^                                                                               | [\s([{:;,])@([^\s@]\*)$/`→ returns`{ query, start, end }` or null |
| `getDashboardNodeMentionSuggestions(nodes, query, selectedNodeIds, limit)` | Scores nodes by title/label/id match (100→30 scale), filters already-selected, returns top `limit` |
| `stripActiveDashboardNodeMention(draft)`                                   | Removes the active mention text from the draft string                                              |

### Incoming Dependents

| Consumer                | Mechanism       |
| ----------------------- | --------------- |
| `useDashboardAgentChat` | all 3 functions |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace` `WorkspaceNode` type.

---

## 9. `render-simple-markdown.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/render-simple-markdown.ts`

Minimal safe markdown-to-HTML renderer. Handles: HTML escaping (`&`, `<`, `>`), `**bold**`, `__bold__`, `*italic*`, `_italic_`, `- list` / `* list` → `<ul><li>`, blank lines → `<div class="h-3">`, plain lines → `<p>`. No external dependencies.

### Incoming Dependents

| Consumer                      | Mechanism                  |
| ----------------------------- | -------------------------- |
| `DashboardAgentChatPanel.vue` | renders assistant messages |
| `pages/node/[id].vue`         | renders notes preview      |

**Standalone Status:** Standalone — no imports.

---

## 10. `get-error-message.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/get-error-message.ts`

Extracts a human-readable error string from unknown error shapes. Walks: `Error.message` → `error.error.data.message` → `error.data.message` → `error.error.message` → `error.message` → `fallback`.

**Standalone Status:** Standalone — no imports.

---

## 11. `normalize-agency-link-url.ts`

**Type:** Utility Module  
**File:** `apps/web/app/utils/normalize-agency-link-url.ts`

Normalizes/cleans link URLs for agency time entries. Strips whitespace, validates URL format.

**Standalone Status:** Standalone — no external imports.

---

## 12. Constants — `workspace-node-options.ts`

**Type:** Constants Module  
**File:** `apps/web/app/constants/workspace-node-options.ts`

Exports priority and domain option arrays for task filter dropdowns.

| Export                         | Description                                                                                                         |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `workspaceNodePriorityOptions` | `[{ label: "None", value: "" }, low, medium, high]` satisfying `WorkspaceNodePriorityOption[]`                      |
| `workspaceNodeDomainOptions`   | `[{ label: "Unassigned", value: "" }, ...WORKSPACE_TASK_DOMAINS.map(...)]` satisfying `WorkspaceNodeDomainOption[]` |

### Incoming Dependents

| Consumer              | Mechanism                                                                               |
| --------------------- | --------------------------------------------------------------------------------------- |
| `pages/node/[id].vue` | imports both arrays for `WorkspaceNodeEditorContext.priorityOptions` + `.domainOptions` |

### Outgoing Dependencies

| Dependency                            | Mechanism                                                        |
| ------------------------------------- | ---------------------------------------------------------------- |
| `@brainiac/workspace`                 | `WORKSPACE_TASK_DOMAINS`, `getWorkspaceTaskDomainLabel`          |
| `~/components/workspace/node/context` | `WorkspaceNodeDomainOption`, `WorkspaceNodePriorityOption` types |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace` and context types.
