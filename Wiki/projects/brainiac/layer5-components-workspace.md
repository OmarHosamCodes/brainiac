---
title: Layer 5 — Workspace Board Components
tags: [layer5, components, vue, workspace, canvas, board, modals]
---

# Layer 5 — Workspace Board Components

## 1. `WorkspaceNodeCard.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/workspace/WorkspaceNodeCard.vue`

Rendered inside `InfiniteCanvas` scoped slot `#node`. Displays a workspace node on the canvas with title, tint color, connection indicators, and featured block previews (if `dashboard.featuredBlocks` configured). Receives `node`, `selected`, `allNodes` props.

### Incoming Dependents

| Consumer              | Mechanism                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------ |
| `pages/dashboard.vue` | `<template #node="{ node, selected, allNodes }"><WorkspaceNodeCard .../></template>` inside `InfiniteCanvas` |

### Outgoing Dependencies

| Dependency                         | Mechanism                                           |
| ---------------------------------- | --------------------------------------------------- |
| `@brainiac/workspace`              | node type + tint types                              |
| `~/utils/workspace-node-dashboard` | `getWorkspaceNodeTintStyle` for CSS custom property |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace`, utility.

---

## 2. `WorkspaceBoardStatus.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/workspace/WorkspaceBoardStatus.vue`

Fixed bottom-left status pill on the dashboard. Shows save state badge (`saveBadge.label`, `saveBadge.className`), node count, and authenticated user name.

### Props

| Prop         | Type                  |
| ------------ | --------------------- |
| `badge`      | `WorkspaceSaveBadge`  |
| `nodesCount` | `number`              |
| `userName`   | `string \| undefined` |

### Incoming Dependents

| Consumer              | Mechanism                                                               |
| --------------------- | ----------------------------------------------------------------------- |
| `pages/dashboard.vue` | rendered with `saveBadge`, `nodes.length`, `authSession.data.user.name` |

**Standalone Status:** Standalone (purely presentational, no external imports beyond Nuxt UI).

---

## 3. `WorkspaceEditorModal.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/workspace/WorkspaceEditorModal.vue`

Modal for creating or editing a workspace node. Props: `content`, `mode` (`create` | `edit`), `nodeType`, `open`, `title`, `tint`, `valid`, `availableBlocks`, `featuredBlocks`. Shows title input, tint swatch picker (6 colors), node type selector, featured blocks picker. Emits `close`, `submit`, and `update:*` events for all editable props.

### Incoming Dependents

| Consumer              | Mechanism                                                                 |
| --------------------- | ------------------------------------------------------------------------- |
| `pages/dashboard.vue` | `LazyWorkspaceEditorModal` with all props from `nodeDraft` + `editorMode` |

### Outgoing Dependencies

| Dependency                                        | Mechanism                                                                               |
| ------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `@brainiac/workspace`                             | `WorkspaceNodeTint`, `WorkspaceNodeType`, `WorkspaceNodeDashboardSelectableBlock` types |
| `~/utils/workspace-node-dashboard`                | `workspaceNodeTintOptions` for swatch display                                           |
| Nuxt UI (`UModal`, `UInput`, `UButton`, `UBadge`) | modal + form primitives                                                                 |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace`, tint utility, Nuxt UI.

---

## 4. `WorkspaceAgencyOperatorConnectModal.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/workspace/WorkspaceAgencyOperatorConnectModal.vue`

Modal for creating an Agency Operator node on the canvas. Allows selecting a team to bind the operator node to. Props: `open`, `boundTeamIds` (Set — teams already bound to existing operator nodes). Emits `update:open`, `submit({ teamId })`.

### Incoming Dependents

| Consumer              | Mechanism                                                                           |
| --------------------- | ----------------------------------------------------------------------------------- |
| `pages/dashboard.vue` | `LazyWorkspaceAgencyOperatorConnectModal` controlled by `agencyOperatorConnectOpen` |

### Outgoing Dependencies

| Dependency                               | Mechanism                            |
| ---------------------------------------- | ------------------------------------ |
| `useTeamSelection()`                     | queries available teams for selector |
| Nuxt UI (`UModal`, `USelect`, `UButton`) | modal primitives                     |

**Standalone Status:** Not standalone — depends on `useTeamSelection`, Nuxt UI.

---

## 5. `WorkspaceOrchestratorSourcesModal.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/workspace/WorkspaceOrchestratorSourcesModal.vue`

Modal for linking task source nodes to a Time Orchestrator block. Lists connected standard nodes, allows selecting which to include as task sources.

### Incoming Dependents

| Consumer                                   | Mechanism                            |
| ------------------------------------------ | ------------------------------------ |
| `WorkspaceTimeOrchestratorBlockEditor.vue` | rendered within block editor context |

**Standalone Status:** Not standalone — depends on workspace context injection.

---

## 6. Team Components

### `team/TeamSettingsModal.vue`

Modal for managing a team: rename, invite members, change roles, remove members, delete team. All actions are passed as event emitters — pure presentational with loading states as props.

### Incoming Dependents

| Consumer              | Mechanism                                                                                   |
| --------------------- | ------------------------------------------------------------------------------------------- |
| `pages/dashboard.vue` | `LazyTeamSettingsModal` with all mutation states + action handlers from `useTeamManagement` |

### `team/TeamMemberList.vue`

Presentational list of team members with role badges. Consumed by `TeamSettingsModal`.

**Standalone Status:** Both are not standalone — depend on Nuxt UI + parent mutation state.

---

## 7. Marketplace Components

### `MarketplaceItemCard.vue`

Card for a single marketplace item. Shows item kind (node/tab/block), title, description, author. "Insert" button emits `insert(item: WorkspaceMarketplaceItem)`.

### Incoming Dependents

| Consumer                | Mechanism                                              |
| ----------------------- | ------------------------------------------------------ |
| `pages/marketplace.vue` | renders for each item in `allItems`, handles `@insert` |

### `MarketplaceImportModal.vue`

Import wizard modal. Given an item and workspace nodes, lets user pick a destination node (for tabs/blocks) or creates a new node (for node-kind items). Calls `orpc.workspace.marketplace.save` mutation on confirm.

### Incoming Dependents

| Consumer                | Mechanism                                                        |
| ----------------------- | ---------------------------------------------------------------- |
| `pages/marketplace.vue` | `MarketplaceImportModal` with `item`, `nodes`, `selectedNodeIds` |

### Outgoing Dependencies

| Consumer                        | Mechanism                                                                                         |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `useOrpc()`                     | `orpc.workspace.marketplace.save.mutationOptions()`                                               |
| `~/utils/workspace-marketplace` | `cloneMarketplaceNodePayloadAsNode`, `cloneMarketplaceTabPayload`, `cloneMarketplaceBlockPayload` |

---

## 8. Dashboard AI Components

### `DashboardAgentChatPanel.vue`

Full AI agent chat panel. Conversation list sidebar + active chat view. Renders conversation messages (user + assistant + tool responses). Model selector opens `DashboardAgentModelLibrary`. Supports @mention autocomplete for node references. Receives `nodes` prop + emits `close`.

### Incoming Dependents

| Consumer              | Mechanism                                                                   |
| --------------------- | --------------------------------------------------------------------------- |
| `pages/dashboard.vue` | `LazyDashboardAgentChatPanel :nodes="nodes" @close="isChatVisible = false"` |

### Outgoing Dependencies

| Consumer                           | Mechanism                                                |
| ---------------------------------- | -------------------------------------------------------- |
| `useDashboardAgentChat({ nodes })` | all chat state, model selection, conversation management |
| `~/utils/render-simple-markdown`   | `renderSimpleMarkdown` for assistant message rendering   |
| Nuxt UI                            | panel primitives                                         |

### `DashboardAgentModelLibrary.vue`

Model browser overlay. Filters by access (`all` / `free` / `paid`), creator, search. Shows favorites toggle. Reads model catalog from `useDashboardAgentChat`. Consumed only by `DashboardAgentChatPanel`.
