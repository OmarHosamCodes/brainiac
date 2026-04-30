---
title: Layer 5 — Node Detail Page (node/[id].vue)
tags: [layer5, pages, nuxt, vue, workspace, blocks, agent, tabs, sharing]
---

# Layer 5 — Node Detail Page

**Entity:** `node/[id].vue`  
**Type:** Nuxt Dynamic Page (Route `/node/:id`)  
**File:** `apps/web/app/pages/node/[id].vue`  
**Middleware:** `auth`, `workspace`

The most complex page in the application (~2500+ lines). Provides the full node editing experience: tab management, block rendering, agent chat integration, node sharing, and marketplace publishing.

---

## Key State

| Ref/Computed          | Description                                            |
| --------------------- | ------------------------------------------------------ | ------------------ |
| `nodeId`              | computed from `route.params.id`                        |
| `node`                | derived from `workspaceStore.nodes` by `nodeId`        |
| `activeTabId`         | `node.viewState.activeTabId`                           |
| `activeTab`           | resolved tab object from `node.tabs`                   |
| `visibleBlocks`       | `activeTab.blocks` filtered by `blockSearch`           |
| `tabEditor`           | reactive `{ open, mode: "create"                       | "rename", title }` |
| `agentContextTargets` | array of `{ tabId, blockId }` for scoped agent context |
| `isAgentChatVisible`  | toggles agent panel visibility                         |

---

## Mutations (via `useOrpc` + `useMutation`)

| Mutation                   | oRPC Procedure                    |
| -------------------------- | --------------------------------- |
| `saveMarketplaceItem`      | `orpc.workspace.marketplace.save` |
| `blockAgentPromptMutation` | `orpc.agent.chat.turn`            |

---

## Block Factory Imports

Imports all ~45 `create*Block` factory functions from `@brainiac/workspace` for building new blocks inline. Also imports: `cloneWorkspaceNodes`, `AGENCY_OPERATOR_PREDEFINED_TAB_TITLES`, `createDefaultWorkspaceTab`, evaluation utilities (`evaluateCustomBlockFormula`, `filterCollectedTasksByTimeOrchestratorSettings`, `fillCustomBlockPromptTemplate`, `generateWorkspacePromptOutput`, `getTimeOrchestratorSummary`), `collectWorkspaceNodeTasks`, `normalizeWorkspaceNode`.

---

## Vue Provide / Inject Context

Provides a `WorkspaceNodeEditorContext` via `workspaceNodeEditorContextKey` with ~80+ methods and refs for block editors to consume. Injected by block editor components via the context key.

---

## Incoming Dependents

| Consumer                                                   | Mechanism                                                |
| ---------------------------------------------------------- | -------------------------------------------------------- |
| `pages/dashboard.vue` via `useWorkspaceBoard.openNodePage` | `navigateTo("/node/:id")` after `preloadRouteComponents` |
| Direct URL navigation                                      | Nuxt dynamic route `/node/[id]`                          |

---

## Outgoing Dependencies

| Dependency                                             | Mechanism                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@brainiac/workspace`                                  | 45+ block factory imports, all block/node types, evaluation utilities, `collectWorkspaceNodeTasks`, `normalizeWorkspaceNode`                                                                                                                                                                                       |
| `@nuxt/ui`                                             | `DropdownMenuItem` type                                                                                                                                                                                                                                                                                            |
| `@tanstack/vue-query`                                  | `useMutation` for marketplace save + agent chat turn                                                                                                                                                                                                                                                               |
| `pinia` (`storeToRefs`)                                | reads workspace store refs directly                                                                                                                                                                                                                                                                                |
| `useWorkspaceStore()` (Pinia)                          | `nodes`, `isWorkspaceInitialLoading`, `isWorkspaceRefreshing`, `saveBadge`, `saveError`; calls `workspaceStore.workspaceQuery`                                                                                                                                                                                     |
| `useOrpc()`                                            | creates mutations `orpc.workspace.marketplace.save` + `orpc.agent.chat.turn`                                                                                                                                                                                                                                       |
| `useWorkspaceNodeSharing({ node, workspaceQuery })`    | reads `activeTeamMembership`, `activeTeamRole`, `canEditNodeContent`, `canManageNodeSharing`, `nodeOwnerLabel`, `nodeShareTeamId`, `nodeVisibilityBadgeClass`, `nodeVisibilityLabel`, `shareCurrentNodeToTeam`, `unshareCurrentNodeFromTeam`, `shareNodeMutation`, `unshareNodeMutation`, `teamListQuery`, `teams` |
| `~/components/workspace/node/context`                  | imports `workspaceNodeEditorContextKey`, `WorkspaceTabEditorMode` type                                                                                                                                                                                                                                             |
| `~/composables/workspace-node/useWorkspaceNodeSharing` | imports composable                                                                                                                                                                                                                                                                                                 |
| `~/constants/workspace-node-options`                   | imports `workspaceNodeDomainOptions`, `workspaceNodePriorityOptions`                                                                                                                                                                                                                                               |
| `~/utils/get-error-message`                            | `getErrorMessage`                                                                                                                                                                                                                                                                                                  |
| `~/utils/render-simple-markdown`                       | `renderSimpleMarkdown`                                                                                                                                                                                                                                                                                             |
| `~/utils/workspace-add-block-menu`                     | `createWorkspaceAddBlockMenuItems`                                                                                                                                                                                                                                                                                 |
| `~/utils/workspace-block-presets`                      | `getWorkspaceBlockPreset`, `workspaceBlockPresets`, `WorkspaceBlockPresetId` type                                                                                                                                                                                                                                  |
| `~/utils/workspace-marketplace`                        | `createBlockMarketplacePayload`, `createNodeMarketplacePayload`, `createTabMarketplacePayload`                                                                                                                                                                                                                     |
| `~/utils/workspace-node-formatters`                    | `formatWorkspaceFormulaResult`, `formatWorkspaceRelativeTaskMeta`, `getWorkspaceTaskPriorityBadgeClass`                                                                                                                                                                                                            |
| `WorkspaceNodeShell` component                         | renders the full node UI shell                                                                                                                                                                                                                                                                                     |
| Nuxt `useRoute()`, `useToast()`                        | routing + toast notifications                                                                                                                                                                                                                                                                                      |

---

## Standalone Status

Not standalone — the most dependency-heavy file in the UI layer. Orchestrates the workspace store, agent mutation, sharing composable, all block factory functions, and multiple utility modules.
