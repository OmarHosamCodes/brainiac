---
title: "useWorkspaceStore — Pinia Workspace State"
category: projects
tags: [store, pinia, workspace, vue-query, state]
summary: "Central Pinia store for workspace nodes: load/save/sync lifecycle, editor draft, node CRUD, connection wiring, optimistic revision tracking."
provenance:
  extracted: 1.0
  inferred: 0.0
  ambiguous: 0.0
updated: 2026-04-23
layer: 2
---

# useWorkspaceStore — Pinia Workspace State

## Primary Entity

- **Name:** `useWorkspaceStore`
- **Type:** Pinia Store (Setup Store)
- **File:** `apps/web/app/stores/workspace.ts`
- **Store ID:** `"workspace"`
- **Exported symbol:** `useWorkspaceStore`

---

## Reactive State

| Ref / Reactive | Type | Purpose |
|---|---|---|
| `nodes` | `ref<WorkspaceNode[]>` | Authoritative local node list |
| `selectedNodeIds` | `ref<string[]>` | Currently selected node IDs on the canvas |
| `editorOpen` | `ref<boolean>` | Node editor drawer visibility |
| `editorMode` | `ref<"create" \| "edit">` | Whether the editor is creating or editing a node |
| `activeNodeId` | `ref<string \| null>` | Node currently open in the editor |
| `pendingNodePosition` | `ref<NodePosition \| null>` | Canvas position for a node being created |
| `agencyOperatorConnectOpen` | `ref<boolean>` | Agency-operator connect dialog visibility |
| `pendingAgencyOperatorPosition` | `ref<NodePosition \| null>` | Canvas position for pending agency-operator node |
| `loadApplied` | `ref<boolean>` | True once the first remote snapshot has been applied |
| `isHydratingWorkspace` | `ref<boolean>` | True during the tick that applies a remote snapshot |
| `saveState` | `ref<"idle" \| "saving" \| "saved" \| "error">` | Current sync badge state |
| `saveError` | `ref<string \| null>` | Last save error message |
| `syncedAt` | `ref<string \| null>` | ISO timestamp of last confirmed server sync |
| `isPreloadingWorkspace` | `ref<boolean>` | True during `ensureQueryData` prefetch |
| `localRevision` | `ref<number>` | Increments on every local `nodes` mutation |
| `syncedRevision` | `ref<number>` | Revision value at last confirmed server sync |
| `nodeDraft` | `reactive<{title, content, nodeType, tint, featuredBlocks}>` | Mutable draft for the node editor form |

---

## Computed Properties

| Computed | Derived From | Purpose |
|---|---|---|
| `workspaceReadyForEdits` | `authSession`, `loadApplied`, `isHydratingWorkspace` | Guards all mutation functions |
| `isWorkspaceInitialLoading` | `authSession`, `loadApplied`, query loading state | Drives skeleton/loading UI |
| `isWorkspaceRefreshing` | `loadApplied`, query refetch state | Drives subtle refresh indicator |
| `isDraftValid` | `nodeDraft.title` | Enables submit in node editor |
| `editorBlockOptions` | `activeNodeId`, `nodes` | Returns `WorkspaceNodeDashboardSelectableBlock[]` via `getWorkspaceNodeDashboardSelectableBlocks(node)` |
| `hasPendingLocalChanges` | `localRevision`, `syncedRevision`, `saveTimer`, `saveWorkspace.isPending` | Prevents overwriting unsaved local edits with remote snapshot |
| `saveBadge` | `saveState` | Returns `{ label, className }` for sync status chip |

---

## TanStack Query Integration

| Symbol | Mechanism |
|---|---|
| `workspaceQuery` | `skipHydrate(useQuery({ ...orpc.workspace.get.queryOptions(), staleTime: 1_500, refetchInterval: 4_000, refetchIntervalInBackground: true, refetchOnReconnect: true, refetchOnWindowFocus: true }))` |
| `saveWorkspace` | `useMutation(orpc.workspace.save.mutationOptions())` |
| `deleteWorkspaceNode` | `useMutation(orpc.workspace.deleteNode.mutationOptions())` |

---

## Key Functions

### Sync / Persistence

| Function | Mechanism |
|---|---|
| `preloadWorkspace()` | Calls `queryClient.ensureQueryData({ ...workspaceGetQueryOptions, staleTime: 1_500 })` |
| `applyRemoteSnapshot(nodes, updatedAt)` | Sets `nodes`, filters `selectedNodeIds`, sets `loadApplied = true`, resets `saveState`. Wraps `isHydratingWorkspace = true` and clears it in `nextTick` |
| `applyWorkspaceSnapshot(nodes, updatedAt)` | Calls `queryClient.setQueryData(...)` then `applyRemoteSnapshot` — used by sharing/import flows |
| `persistWorkspace(snapshot, revision)` | Calls `saveWorkspace.mutateAsync({ nodes: snapshot })`; on success updates `syncedRevision`, `syncedAt`, triggers refetch; on error schedules retry after 2 s via `setTimeout` |
| `scheduleWorkspaceSave(delay = 250)` | Debounces `persistWorkspace` via `setTimeout(delay)` using a revision+snapshot closure |

### Node CRUD

| Function | Description |
|---|---|
| `openCreateNode(position)` | Sets `editorMode = "create"`, stores `pendingNodePosition`, clears `activeNodeId`, resets draft, opens editor |
| `openEditNode({ nodeId })` | Sets `editorMode = "edit"`, loads draft from found node, opens editor |
| `submitNodeEditor()` | Create path: constructs full `WorkspaceNode` via `normalizeWorkspaceNode(...)` with `createDefaultWorkspaceTab("Overview", content)`, appends to `nodes`. Edit path: patches existing node in-place via `updateNodes` |
| `removeNode({ nodeId })` | Removes from `nodes` via `updateNodes`, calls `deleteWorkspaceNode.mutate({ nodeId, ownerUserId })`, refetches on error |
| `openCreateAgencyOperatorNode(position)` | Sets `pendingAgencyOperatorPosition`, opens agency connect dialog |
| `submitCreateAgencyOperatorNode({ teamId, teamName })` | Constructs agency-operator node using `createAgencyOperatorNodeTabs(teamId)`, `normalizeWorkspaceNode(...)`, appends to `nodes` |

### Connection Management

| Function | Description |
|---|---|
| `connectNodePair({ orchestratorNodeId, standardNodeId })` | Validates both node types, pushes `{ targetNodeId }` to orchestrator's `connections`, calls `applyConnectionSanitization` |
| `disconnectNodePair({ orchestratorNodeId, standardNodeId })` | Filters connection out of orchestrator's `connections`, calls `applyConnectionSanitization` |

### Internal Helpers

| Function | Description |
|---|---|
| `updateNodes(mutator)` | Clones `nodes` via `cloneWorkspaceNodes`, runs `mutator(draftNodes)`, writes back — guards on `workspaceReadyForEdits` |
| `applyConnectionSanitization(draftNodes, timestamp)` | Calls `sanitizeConnections(draftNodes)`, patches changed connection arrays using `normalizeTrackedNode` |
| `normalizeTrackedNode(node, timestamp)` | Calls `normalizeWorkspaceNode({ ...node, label: node.title, updatedAt: timestamp })` |

---

## Watchers

| Watch Target | Behavior |
|---|---|
| `authSession.value?.data?.user?.id` | On user ID change (or null): calls `resetWorkspaceState()`. Immediate. |
| `workspaceQuery.data.value` | On data update: if no `loadApplied` → `applyRemoteSnapshot`; if `updatedAt` unchanged → skip; if pending local changes → skip; else → `applyRemoteSnapshot` |
| `nodes` (deep) | If `workspaceReadyForEdits`: increments `localRevision`, calls `scheduleWorkspaceSave()` |

---

## Lifecycle

- `onScopeDispose`: calls `clearSaveTimer()` and `clearRetryTimer()`

---

## Relationships

| Role | Entity | Mechanism |
|---|---|---|
| **Incoming (Dependents)** | Canvas components, editor modals, board composables | `useWorkspaceStore()` — access `nodes`, dispatch mutations |
| **Incoming (Dependents)** | `useWorkspaceBoard` composable | calls `applyWorkspaceSnapshot`, `updateNodes` |
| **Outgoing (Dependencies)** | `useAuthSession()` | reads `authSession.value?.data?.user` to guard edits and watch user changes |
| **Outgoing (Dependencies)** | `useOrpc()` → `orpc.workspace.get` | `orpc.workspace.get.queryOptions()` — fetches remote workspace |
| **Outgoing (Dependencies)** | `useOrpc()` → `orpc.workspace.save` | `useMutation(orpc.workspace.save.mutationOptions())` — persists nodes to server |
| **Outgoing (Dependencies)** | `useOrpc()` → `orpc.workspace.deleteNode` | `useMutation(orpc.workspace.deleteNode.mutationOptions())` — deletes single node on server |
| **Outgoing (Dependencies)** | `@tanstack/vue-query` | `useQuery`, `useMutation`, `useQueryClient` — all server state |
| **Outgoing (Dependencies)** | `@brainiac/workspace` | `cloneWorkspaceNodes`, `createAgencyOperatorNodeTabs`, `createDefaultWorkspaceTab`, `normalizeWorkspaceNode`, `getWorkspaceNodeDashboardSelectableBlocks`, dimension constants, type imports |
| **Outgoing (Dependencies)** | `~/utils/workspace-node-connections` | `sanitizeConnections(nodes)` — cleans orphaned connection references |
| **Outgoing (Dependencies)** | `~/utils/get-error-message` | `getErrorMessage(error, fallback)` — formats error strings |

## Standalone Status

**Not standalone** — depends on `useAuthSession`, `useOrpc`, `@tanstack/vue-query`, `@brainiac/workspace`, and two local utils.
