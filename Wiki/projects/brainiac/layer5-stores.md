---
title: Layer 5 — Stores (useWorkspaceStore, useAgencyTimeTrackingStore)
tags: [layer5, stores, pinia, vue, workspace, agency, optimistic-updates]
---

# Layer 5 — Stores

## 1. `useWorkspaceStore` (Pinia)

**Type:** Pinia Store  
**File:** `apps/web/app/stores/workspace.ts`

Central workspace state manager. Handles node list, editor draft, save/sync lifecycle with revision tracking.

### State

| Ref | Type | Description |
|---|---|---|
| `nodes` | `WorkspaceNode[]` | Live workspace node list (draft copy for editing) |
| `selectedNodeIds` | `string[]` | Currently selected node IDs on canvas |
| `editorOpen` | `boolean` | Whether node create/edit modal is open |
| `editorMode` | `"create" \| "edit"` | Modal mode |
| `activeNodeId` | `string \| null` | Node being edited |
| `nodeDraft` | reactive `{ title, content, nodeType, tint, featuredBlocks }` | Live editor draft |
| `agencyOperatorConnectOpen` | `boolean` | Agency operator modal state |
| `saveState` | `"idle" \| "saving" \| "saved" \| "error"` | Save lifecycle state |
| `saveError` | `string \| null` | Last save error message |
| `localRevision` | `number` | Incremented on every local mutation |
| `syncedRevision` | `number` | Revision at last successful server sync |
| `loadApplied` | `boolean` | Whether initial server load has been applied |

### Computed

| Computed | Description |
|---|---|
| `isWorkspaceInitialLoading` | True while first load not yet applied |
| `isWorkspaceRefreshing` | True while background refetch is in progress |
| `workspaceReadyForEdits` | `auth + loadApplied + !hydrating` |
| `saveBadge` | `{ label, className }` for save state display |
| `editorBlockOptions` | Available block types for the editor modal (gated by tier limits) |
| `isDraftValid` | True when `nodeDraft.title.trim()` is non-empty |

### Queries & Mutations

| Operation | oRPC Procedure | Config |
|---|---|---|
| `workspaceQuery` | `orpc.workspace.get` | `staleTime: 1500ms`, `refetchInterval: 4000ms`, `refetchOnReconnect`, `refetchOnWindowFocus` |
| `saveWorkspace` | `orpc.workspace.save` | mutation |
| `deleteWorkspaceNode` | `orpc.workspace.deleteNode` | mutation |

### Key Actions

| Action | Description |
|---|---|
| `preloadWorkspace()` | Prefetches workspace for middleware — awaits `workspaceQuery.refetch()` once |
| `openCreateNode(payload?)` | Opens editor in create mode, sets `pendingNodePosition` |
| `openEditNode(nodeId)` | Opens editor in edit mode, loads node data into `nodeDraft` |
| `closeEditor()` | Closes editor, resets draft |
| `submitNodeEditor()` | Create: adds node to `nodes` + increments `localRevision`. Edit: patches node in-place |
| `connectNodePair({ orchestratorNodeId, standardNodeId })` | Adds connection to orchestrator node, sanitizes |
| `disconnectNodePair({ orchestratorNodeId, standardNodeId })` | Removes connection |
| `removeNode(nodeId)` | Calls `deleteWorkspaceNode.mutateAsync`, removes from `nodes` |
| `openCreateAgencyOperatorNode()` | Opens agency operator connect modal |
| `submitCreateAgencyOperatorNode({ teamId })` | Creates agency-operator node with predefined tabs |
| `saveWorkspaceDebounced()` | Internal — debounced 800ms save to `orpc.workspace.save`, retries on error |

### Server Sync Pattern

A `watch(workspaceQuery.data)` applies server responses into `nodes` only when `localRevision === syncedRevision` (no pending local edits). A `watch(localRevision)` triggers the debounced save. This prevents server state from overwriting in-flight local changes.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `useWorkspaceBoard()` | facade over this store via `storeToRefs` |
| `pages/node/[id].vue` | calls `useWorkspaceStore()` directly + `storeToRefs` |
| `middleware/workspace.ts` | calls `workspaceStore.preloadWorkspace()` |
| All agency block editors | read `nodes` for orchestrator connections |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/workspace` | 8+ factory/utility imports, all node/block types |
| `@tanstack/vue-query` | `useMutation`, `useQuery`, `useQueryClient` |
| `pinia` | `defineStore`, `skipHydrate` |
| `useOrpc()` | workspace query + 2 mutations |
| `useAuthSession()` | auth guard for query enabled state |
| `~/utils/get-error-message` | error message extraction |
| `~/utils/workspace-node-connections` | `sanitizeConnections` |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace`, `useOrpc`, `useAuthSession`, TanStack Vue Query, Pinia.

---

## 2. `useAgencyTimeTrackingStore` (Pinia)

**Type:** Pinia Store  
**File:** `apps/web/app/stores/agency-time-tracking.ts`

Manages per-team agency time tracking state: active timers, time entries, week summaries, and project/tag lists.

### State

| Ref | Type | Description |
|---|---|---|
| Timer draft | reactive | `{ teamId, projectId, description, linkUrl, tagIds }` for new timer |
| Manual entry draft | reactive | For manual time entry creation |

### Queries & Mutations

All operations use `useOrpc()` with mutations calling `agencyOps.*` procedures. Implements optimistic cache patching via `useQueryClient()`.

### Key Actions
`clockIn(teamId, draft)` → `orpc.agencyOps.timer.start`  
`clockOut(teamId, timerId)` → `orpc.agencyOps.timer.stop`  
`restartTimer(entry)` → re-creates a timer from a past entry  
`getActiveTimer(teamId)` → `orpc.agencyOps.timer.getActive`  

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `WorkspaceAgencyTimeTrackerBlockEditor` | calls store for timer start/stop |
| `WorkspaceAgencyTimeEntriesLogBlockEditor` | reads time entries cache |
| `WorkspaceAgencyTimeSummaryBlockEditor` | reads week summary cache |
| `WorkspaceAgencyBillingReportBlockEditor` | triggers CSV export |
| `WorkspaceAgencySettingsBlockEditor` | reads/writes agency settings |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@tanstack/vue-query` | `useMutation`, `useQueryClient` |
| `pinia` | `defineStore` |
| `useOrpc()` | all `agencyOps.*` mutations |
| `~/utils/get-error-message` | error message extraction |
| `~/utils/normalize-agency-link-url` | `normalizeAgencyLinkUrl` |

**Standalone Status:** Not standalone — depends on `useOrpc`, TanStack Vue Query, Pinia, utility modules.
