---
title: Layer 3 — Agent Router
tags: [layer3, api, orpc, router, agent, openrouter, conversations]
---

# Layer 3 — Agent Router

**Entity:** `agentRouter`  
**Type:** ORPC Router  
**File:** `packages/api/src/routers/agent.ts`

## Procedure Map

| Procedure | Auth Level | Input Schema | Handler Summary |
|---|---|---|---|
| `agent.freeModels` | `protectedProcedure` | none | calls `listOpenRouterFreeModels()`, validates with `openRouterFreeModelsResponseSchema` |
| `agent.modelCatalog` | `protectedProcedure` | none | calls `listOpenRouterModels()`, validates with `openRouterModelCatalogResponseSchema` |
| `agent.accountStatus` | `protectedProcedure` | none | calls `getOpenRouterAccountStatus()`, validates with `openRouterAccountStatusSchema` |
| `agent.chat.turn` | `protectedProcedure` | `agentChatTurnInputSchema` | enforces `aiConversations` billing limit for new conversations, then calls `appendDashboardConversationTurn` |
| `agent.conversations.list` | `protectedProcedure` | none | calls `listDashboardConversations(userId)`, validates with `dashboardConversationListResponseSchema` |
| `agent.conversations.get` | `protectedProcedure` | `dashboardConversationGetInputSchema` | calls `getDashboardConversation(userId, conversationId)`, validates with `dashboardConversationDetailSchema` |
| `agent.conversations.rename` | `protectedProcedure` | `dashboardConversationRenameInputSchema` | calls `renameDashboardConversation(userId, conversationId, title)`, validates with `dashboardConversationDetailSchema` |
| `agent.conversations.delete` | `protectedProcedure` | `dashboardConversationDeleteInputSchema` | calls `deleteDashboardConversation(userId, conversationId)`, validates with inline `z.object({ deleted, conversationId })` |

## Billing Enforcement in `agent.chat.turn`
- Only triggered when `input.conversationId` is absent (new conversation).
- Calls `getBillingStateForUser(userId)` to get `billing.limits.aiConversations`.
- If limit is not `-1` (unlimited) and current count `>= limit` → throws `ORPCError("FORBIDDEN", { data: { limit, current } })`.

## Error Handling
Every procedure is wrapped in `try/catch` and rethrows via `toInternalServerError("agent.<procedure>", error, context)`.  
`agent.chat.turn` passes rich debug context: `{ conversationId, requestedNodesCount, workspaceSource, requestedModel, toolPreset }`.

## Outgoing Dependencies
| Dependency | Mechanism |
|---|---|
| `@brainiac/agent` | imports all I/O Zod schemas + OpenRouter utility functions (`listOpenRouterFreeModels`, `listOpenRouterModels`, `getOpenRouterAccountStatus`) |
| `@orpc/server` (`ORPCError`) | throws typed billing-limit errors |
| `../billing-guard` (`getBillingStateForUser`) | called inside `agent.chat.turn` to check `aiConversations` limit |
| `../procedures` (`protectedProcedure`) | base procedure for all routes |
| `../dev-errors` (`toInternalServerError`) | wraps all caught errors |
| `./agent/service` | imports `appendDashboardConversationTurn`, `deleteDashboardConversation`, `getDashboardConversation`, `listDashboardConversations`, `renameDashboardConversation` |

## Incoming Dependents
| Consumer | Mechanism |
|---|---|
| `routers/index.ts` | mounted as `agent: agentRouter` on `appRouter` |
| `apps/web` | calls e.g. `orpc.agent.chat.turn.mutate(input)`, `orpc.agent.conversations.list.useQuery()` |

## Standalone Status
Not standalone — depends on `@brainiac/agent`, billing-guard, procedures, dev-errors, and service layer.
