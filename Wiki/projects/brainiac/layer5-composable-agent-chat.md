---
title: Layer 5 — Agent Chat Composable (useDashboardAgentChat)
tags: [layer5, composables, vue, agent, conversations, openrouter, model-catalog]
---

# Layer 5 — Agent Chat Composable

**Entity:** `useDashboardAgentChat`  
**Type:** Composable  
**File:** `apps/web/app/composables/useDashboardAgentChat.ts`

The most complex composable (~1200+ lines). Manages the full dashboard AI agent chat panel: conversation lifecycle, model catalog browsing, @mention node references, and agent invocation.

---

## Imports

| Import | Source |
|---|---|
| `DashboardAgentToolPreset`, `DashboardConversationDetail`, `DashboardConversationMessage`, `DashboardConversationSummary`, `DashboardConversationUsageSummary`, `OpenRouterCatalogModel` | `@brainiac/agent` |
| `WorkspaceNode` | `@brainiac/workspace` |
| `useMutation`, `useQuery`, `useQueryClient` | `@tanstack/vue-query` |
| `storeToRefs` | `pinia` |
| `getActiveDashboardNodeMention`, `getDashboardNodeMentionSuggestions`, `stripActiveDashboardNodeMention` | `~/utils/dashboard-agent-mentions` |
| `getErrorDebugDetails` | `~/utils/get-error-debug-details` |
| `getErrorMessage` | `~/utils/get-error-message` |

---

## Queries & Mutations

| Operation | oRPC Procedure | Cache TTL |
|---|---|---|
| `modelCatalogQuery` | `orpc.agent.modelCatalog` | 10 min |
| `accountStatusQuery` | `orpc.agent.accountStatus` | 60 s |
| `conversationListQuery` | `orpc.agent.conversations.list` | — |
| `conversationDetailQuery` | `orpc.agent.conversations.get` | — |
| `sendTurnMutation` | `orpc.agent.chat.turn` | — |
| `createConversationMutation` | `orpc.agent.conversations.create` | — |
| `renameConversationMutation` | `orpc.agent.conversations.rename` | — |
| `deleteConversationMutation` | `orpc.agent.conversations.delete` | — |

---

## Model Preferences

Persisted to `localStorage` under key `brainiac.dashboard.agent.model-preferences` as `{ defaultModelId?, favoriteModelIds: string[] }`. On load: resolves active model from preferences → catalog matching → free model fallback.

---

## @Mention System

- Parses `/@([^\s@]*)$/` pattern in draft text for active mention
- `getDashboardNodeMentionSuggestions(nodes, query, selectedNodeIds)` — scored fuzzy match on title/label/id
- Selected mentions become `selectedNodeIds` (Set) → passed to agent as scoped workspace context
- `stripActiveDashboardNodeMention(draft)` — removes mention text after selection

---

## Formatters

| Function | Purpose |
|---|---|
| `formatCompactNumber` | `Intl.NumberFormat` compact notation |
| `formatContextLength` | `"123K ctx"` display |
| `formatUsd` | `$0.00` currency display |
| `formatRelativeTime` | `Intl.RelativeTimeFormat` relative timestamps |

---

## Incoming Dependents

| Consumer | Mechanism |
|---|---|
| `DashboardAgentChatPanel.vue` | calls `useDashboardAgentChat({ nodes })` |

---

## Outgoing Dependencies

| Dependency | Mechanism |
|---|---|
| `@brainiac/agent` | 6 type imports for conversation/model structures |
| `@brainiac/workspace` | `WorkspaceNode` type |
| `@tanstack/vue-query` | `useMutation`, `useQuery`, `useQueryClient` |
| `pinia` (`storeToRefs`) | reads workspace store refs |
| `useOrpc()` | all 8 agent/conversation oRPC query + mutation options |
| `useAuthSession()` | auth guard for enabled state |
| `~/utils/dashboard-agent-mentions` | mention parsing + suggestion scoring |
| `~/utils/get-error-debug-details` | error debug info for display |
| `~/utils/get-error-message` | error message extraction |
| `localStorage` | model preference persistence |
| `Intl.NumberFormat`, `Intl.RelativeTimeFormat` | formatting utilities |

---

## Standalone Status

Not standalone — depends on `@brainiac/agent`, `@brainiac/workspace`, `useOrpc`, TanStack Vue Query, Pinia, multiple utility modules, localStorage.
