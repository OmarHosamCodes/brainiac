---
title: Layer 5 — Node Editor Components (Shell, BlockRenderer, Context)
tags: [layer5, components, vue, node-editor, blocks, context, provide-inject]
---

# Layer 5 — Node Editor Components

## 1. `WorkspaceNodeShell.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/workspace/node/WorkspaceNodeShell.vue`

The outer shell for the node detail page (`/node/[id]`). Renders:

- Tab bar (list + add/rename tab)
- Block search input
- Visibility badge (`nodeVisibilityLabel`, `nodeVisibilityBadgeClass`)
- Node sharing controls (share to team / unshare)
- `WorkspaceNodeBlockRenderer` for visible blocks
- Tab editor inline form (create/rename mode)

Injects `WorkspaceNodeEditorContext` from `workspaceNodeEditorContextKey` (provided by `pages/node/[id].vue`).

### Incoming Dependents

| Consumer              | Mechanism                                              |
| --------------------- | ------------------------------------------------------ |
| `pages/node/[id].vue` | rendered as the root component of the node detail view |

### Outgoing Dependencies

| Dependency                                       | Mechanism                               |
| ------------------------------------------------ | --------------------------------------- |
| `~/components/workspace/node/context`            | `inject(workspaceNodeEditorContextKey)` |
| `WorkspaceNodeBlockRenderer`                     | renders blocks for the active tab       |
| Nuxt UI (`UButton`, `UInput`, `UBadge`, `UTabs`) | UI primitives                           |

**Standalone Status:** Not standalone — requires `WorkspaceNodeEditorContext` injection from parent.

---

## 2. `WorkspaceNodeBlockRenderer.vue`

**Type:** Vue Component  
**File:** `apps/web/app/components/workspace/node/WorkspaceNodeBlockRenderer.vue`

Dynamic block renderer. Receives a `block: WorkspaceBlock` prop and resolves the correct editor component via `getWorkspaceBlockRegistryEntry(block.type).component`. Renders via `<component :is="resolvedComponent" :block="block" />`. Also injects `WorkspaceNodeEditorContext` to pass down to block editors.

### Incoming Dependents

| Consumer                 | Mechanism                        |
| ------------------------ | -------------------------------- |
| `WorkspaceNodeShell.vue` | `v-for="block in visibleBlocks"` |

### Outgoing Dependencies

| Dependency                            | Mechanism                                                                   |
| ------------------------------------- | --------------------------------------------------------------------------- |
| `~/utils/workspace-block-registry`    | `getWorkspaceBlockRegistryEntry(block.type)` — dynamic component resolution |
| `~/components/workspace/node/context` | injects `WorkspaceNodeEditorContext`                                        |
| All 44 block editor components        | resolved dynamically at runtime from registry                               |

**Standalone Status:** Not standalone — depends on block registry + context injection.

---

## 3. `context.ts` — `WorkspaceNodeEditorContext`

**Type:** Vue Provide/Inject Context (TypeScript module)  
**File:** `apps/web/app/components/workspace/node/context.ts`

Defines the `InjectionKey` and `WorkspaceNodeEditorContext` type for the node editor. The context is the communication contract between `pages/node/[id].vue` (provider) and all block editor components (consumers).

### Context Shape (~80+ fields)

| Field                   | Type                                 | Description                                                         |
| ----------------------- | ------------------------------------ | ------------------------------------------------------------------- |
| `currentNode`           | `ComputedRef<WorkspaceNode \| null>` | The active workspace node                                           |
| `blockSearch`           | `Ref<string>`                        | Block search filter text                                            |
| `normalizedBlockSearch` | `ComputedRef<string>`                | Lowercased, trimmed search                                          |
| `addBlockMenuItems`     | `ComputedRef<DropdownMenuItem[][]>`  | Block add dropdown structure                                        |
| `blockPresetMenuItems`  | `ComputedRef<DropdownMenuItem[][]>`  | Preset pack dropdown structure                                      |
| `tabEditor`             | `WorkspaceTabEditorState`            | Tab create/rename editor state                                      |
| `priorityOptions`       | `WorkspaceNodePriorityOption[]`      | Priority filter options                                             |
| `domainOptions`         | `WorkspaceNodeDomainOption[]`        | Domain filter options                                               |
| Block CRUD methods      | `void \| Promise<void>`              | addBlock, removeBlock, updateBlock, moveBlock, duplicateBlock, etc. |
| Tab CRUD methods        | `void \| Promise<void>`              | addTab, removeTab, renameTab, reorderTab, setActiveTab              |
| Task CRUD methods       | `void \| Promise<void>`              | addTask, updateTask, removeTask, toggleTask                         |
| Kanban methods          | —                                    | addColumn, removeColumn, moveCard, etc.                             |
| Agent interaction       | —                                    | addAgentContextTarget, removeAgentContextTarget, runAgentPrompt     |
| Marketplace methods     | —                                    | shareBlock, shareTab, shareNode                                     |
| Orchestrator methods    | —                                    | getOrchestratorSummary, openOrchestratorSources                     |
| Agency time tracking    | —                                    | clockIn, clockOut, getActiveTimer                                   |

### Incoming Dependents

| Consumer                         | Mechanism                                                          |
| -------------------------------- | ------------------------------------------------------------------ |
| `pages/node/[id].vue`            | provides context via `provide(workspaceNodeEditorContextKey, ctx)` |
| All 44+ block editor components  | consume via `inject(workspaceNodeEditorContextKey)`                |
| `WorkspaceNodeShell.vue`         | injects for tab/block management                                   |
| `WorkspaceNodeBlockRenderer.vue` | injects to pass context to blocks                                  |

### Outgoing Dependencies

| Dependency                                         | Mechanism                                      |
| -------------------------------------------------- | ---------------------------------------------- |
| `@brainiac/workspace`                              | 15+ type imports for all block/node/task types |
| `@nuxt/ui`                                         | `DropdownMenuItem` type                        |
| Vue `inject`, `InjectionKey`, `ComputedRef`, `Ref` | injection infrastructure                       |
| `~/utils/workspace-block-presets`                  | `WorkspaceBlockPresetId` type                  |

**Standalone Status:** Not standalone — purely type + key definition; no runtime logic, but depends on `@brainiac/workspace` + `@nuxt/ui` types.
