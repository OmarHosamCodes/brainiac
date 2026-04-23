---
title: Layer 5 — Workspace Composables (useWorkspaceBoard, useCanvas, useNodeSharing, useWorkspaceNodeSharing)
tags: [layer5, composables, vue, workspace, canvas, sharing, pinia]
---

# Layer 5 — Workspace Composables

## 1. `useWorkspaceBoard`

**Type:** Composable  
**File:** `apps/web/app/composables/useWorkspaceBoard.ts`

Facade over `useWorkspaceStore()` — flattens all board-level state + actions into a single destructurable object for dashboard and marketplace pages. Adds `openNodePage` which calls `preloadRouteComponents` then `navigateTo("/node/:nodeId")`.

### Exported Surface
`authSession`, `workspaceQuery`, `preloadWorkspace`, `nodes`, `selectedNodeIds`, `isWorkspaceInitialLoading`, `isWorkspaceRefreshing`, `saveBadge`, `saveError`, `editorOpen`, `editorMode`, `nodeDraft`, `editorBlockOptions`, `isDraftValid`, `agencyOperatorConnectOpen`, `closeEditor`, `openCreateNode`, `openEditNode`, `openNodePage`, `connectNodePair`, `disconnectNodePair`, `removeNode`, `submitNodeEditor`, `openCreateAgencyOperatorNode`, `submitCreateAgencyOperatorNode`.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/dashboard.vue` | full destructure for board management |
| `pages/marketplace.vue` | partial destructure for workspace state |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `useWorkspaceStore()` (Pinia) | uses `storeToRefs` to access all state refs |
| `useAuthSession()` | reads `authSession` |
| Nuxt `preloadRouteComponents` + `navigateTo` | for `openNodePage` |

**Standalone Status:** Not standalone — pure facade over the workspace store.

---

## 2. `useCanvas`

**Type:** Composable  
**File:** `apps/web/app/composables/useCanvas.ts`

Full infinite canvas engine. Manages a reactive `Camera { x, y, zoom }` (zoom: 0.25–3.0) and viewport size tracked by `ResizeObserver`. Handles pointer events for pan (primary button or space-drag), per-node drag + resize (8 handles), zoom via wheel + Ctrl+wheel + keyboard shortcuts, and `fitAllNodes()` bounding-box fit. Uses `requestAnimationFrame` for smooth pointer panning.

### Key Exports
`camera`, `viewportSize`, `isPanning`, `isSpacePressed`, `canvasTransformStyle`, `gridStyle`, `toWorld`, `toScreen`, `fitAllNodes`, `fitRect`, `zoomIn`, `zoomOut`, `resetZoom`, `onPointerDown`, `onPointerMove`, `onPointerUp`, `onPointerCancel`, `onWheel`, `onKeyDown`, `onKeyUp`, `cleanup`.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `InfiniteCanvas.vue` | calls `useCanvas(viewportRef)`, uses all exported functions + `camera` state |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/workspace` | imports `WorkspaceNodeConnection`, `WorkspaceNodeTint`, `WorkspaceNodeType` types |
| Vue `computed`, `onBeforeUnmount`, `onMounted`, `reactive`, `ref` | reactivity + lifecycle |
| Native `ResizeObserver`, `requestAnimationFrame` | viewport tracking + smooth animation |

**Standalone Status:** Not standalone — depends on `@brainiac/workspace` types + Vue reactivity.

---

## 3. `useNodeSharing` (Board-level)

**Type:** Composable  
**File:** `apps/web/app/composables/useNodeSharing.ts`

Board-level node sharing. Resolves `selectedNode` from `workspaceBoard.selectedNodeIds[0]`. Computes `selectedNodeTeamRole` by cross-referencing node's `teamId` against `teamSelection.teams`. Guards `shareSelectedNode` / `unshareSelectedNode` — only owner role permitted. Calls `orpc.workspace.shareNode` / `unshareNode` mutations, refetches workspace on success.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/dashboard.vue` | calls `useNodeSharing({ teamSelection, workspaceBoard })` for canvas-level sharing panel |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/workspace` | imports `WorkspaceNode` type |
| `@tanstack/vue-query` | `useMutation` for share/unshare |
| `useOrpc()` | calls `orpc.workspace.shareNode.mutationOptions()` + `orpc.workspace.unshareNode.mutationOptions()` |
| `~/utils/get-error-message` | `getErrorMessage` for toast error text |
| `useToast()` (Nuxt UI) | success/warning/error notifications |

**Standalone Status:** Not standalone — depends on `useOrpc`, TanStack Vue Query, `@brainiac/workspace`, toast.

---

## 4. `useWorkspaceNodeSharing` (Node-level)

**Type:** Composable  
**File:** `apps/web/app/composables/workspace-node/useWorkspaceNodeSharing.ts`

Node-detail level sharing. Receives a `node: ComputedRef<WorkspaceNode | null>`. Queries `orpc.team.list` for available teams. Computes:
- `activeTeamMembership` — team the node is currently shared to
- `activeTeamRole` / `selectedShareTeamRole` — RBAC role checks
- `canEditNodeContent` — owner OR (team shared + editor/owner role)
- `canManageNodeSharing` — node owner AND owner role in target team
- `nodeVisibilityLabel` — "Private" | "Team Shared" | "Shared With You"
- `nodeVisibilityBadgeClass` — CSS classes for visibility badge
- `nodeOwnerLabel` — "You" | "Teammate"

Exposes `shareCurrentNodeToTeam` / `unshareCurrentNodeFromTeam` which call `orpc.workspace.shareNode` / `unshareNode` mutations.

### Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `pages/node/[id].vue` | calls `useWorkspaceNodeSharing({ node, workspaceQuery })` |

### Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/workspace` | imports `WorkspaceNode` type |
| `@tanstack/vue-query` | `useMutation`, `useQuery` |
| `useOrpc()` | `orpc.team.list.queryOptions()`, `orpc.workspace.shareNode.mutationOptions()`, `orpc.workspace.unshareNode.mutationOptions()` |
| `useAuthSession()` | reads `currentUserId` |
| `~/utils/get-error-message` | `getErrorMessage` |
| `useToast()` (Nuxt UI) | notifications |

**Standalone Status:** Not standalone — depends on `useOrpc`, `useAuthSession`, TanStack Vue Query, `@brainiac/workspace`.
