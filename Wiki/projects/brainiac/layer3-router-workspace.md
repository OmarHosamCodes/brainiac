---
title: Layer 3 — Workspace Router
tags: [layer3, api, orpc, router, workspace, marketplace]
---

# Layer 3 — Workspace Router

**Entity:** `workspaceRouter`  
**Type:** ORPC Router  
**File:** `packages/api/src/routers/workspace/index.ts`

## Procedure Map

| Procedure | Auth Level | Input Schema | Handler Summary |
|---|---|---|---|
| `workspace.get` | `protectedProcedure` | none | calls `getWorkspaceSnapshot(userId)` — returns personal + shared nodes |
| `workspace.save` | `protectedProcedure` | `workspaceSaveInputSchema` | calls `getBillingStateForUser`, checks `billing.limits.workspaceNodes`; on pass calls `saveWorkspaceNodes(userId, input.nodes)` |
| `workspace.shareNode` | `protectedProcedure` | `{ nodeId: string, teamId: string }` | calls `shareWorkspaceNode(userId, input)`, validates response with inline `z.object({ nodeId, teamId, visibility })` |
| `workspace.unshareNode` | `protectedProcedure` | `{ nodeId: string }` | calls `unshareWorkspaceNode(userId, input)`, validates with inline `z.object({ nodeId, visibility })` |
| `workspace.deleteNode` | `protectedProcedure` | `{ nodeId: string, ownerUserId?: string }` | calls `deleteWorkspaceNode(userId, input)`, validates with inline `z.object({ nodeId, ownerUserId, deleted })` |
| `workspace.marketplace.list` | `protectedProcedure` | `workspaceMarketplaceListInputSchema` | calls `getWorkspaceMarketplaceItems(input)` (no userId — public browse) |
| `workspace.marketplace.save` | `protectedProProcedure` | `workspaceMarketplaceSaveInputSchema` | calls `saveWorkspaceMarketplaceItem(userId, userName, input)` — Pro-only publish |

## Billing Enforcement in `workspace.save`
- Calls `getBillingStateForUser(userId)`.
- If `input.nodes.length > billing.limits.workspaceNodes` → throws `ORPCError("FORBIDDEN", { data: { limit, current } })`.

## Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/workspace` | imports `workspaceNodeVisibilitySchema`, `workspaceMarketplaceListInputSchema`, `workspaceMarketplaceSaveInputSchema`, `workspaceSaveInputSchema` |
| `@orpc/server` (`ORPCError`) | dynamically imported inside `workspace.save` for billing limit error |
| `../../billing-guard` (`getBillingStateForUser`) | called in `workspace.save` handler |
| `../../procedures` | imports `protectedProcedure`, `protectedProProcedure` |
| `./service` | imports `getWorkspaceSnapshot`, `saveWorkspaceNodes`, `shareWorkspaceNode`, `unshareWorkspaceNode`, `deleteWorkspaceNode`, `getWorkspaceMarketplaceItems`, `saveWorkspaceMarketplaceItem` |

## Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `routers/index.ts` | mounted as `workspace: workspaceRouter` on `appRouter` |
| `apps/web` — `useWorkspaceStore` | calls `orpc.workspace.get.useQuery()`, `orpc.workspace.save.mutate(input)`, node share/unshare/delete mutations |

## Standalone Status
Not standalone — depends on `@brainiac/workspace`, billing-guard, procedures, and service layer.
