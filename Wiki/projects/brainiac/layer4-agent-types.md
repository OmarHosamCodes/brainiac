---
title: Layer 4 — Agent Package: Types & Schemas
tags: [layer4, agent, types, schemas, zod, constants]
---

# Layer 4 — Agent Package: Types & Schemas

**Entity:** `types.ts`  
**Type:** Type / Schema Module  
**File:** `packages/agent/src/types.ts`

## Constants

| Constant                                | Value                 | Purpose                                                |
| --------------------------------------- | --------------------- | ------------------------------------------------------ |
| `DEFAULT_AGENT_MODEL`                   | `"openai/gpt-5-nano"` | Fallback model if none selected or catalog unavailable |
| `DASHBOARD_CONVERSATION_TITLE_LIMIT`    | `80`                  | Max characters for a conversation title                |
| `DASHBOARD_CONVERSATION_HISTORY_LIMIT`  | `50`                  | Max conversations returned in list                     |
| `DASHBOARD_CONVERSATION_MESSAGE_WINDOW` | `20`                  | Number of recent messages fed as context to the agent  |

## Zod Schemas

### Usage Schemas

| Schema                                    | Shape                                                                                                        |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `dashboardConversationUsageLatestSchema`  | `{ modelId, contextLength, inputTokens, cachedTokens, outputTokens, reasoningTokens, totalTokens, costUsd }` |
| `dashboardConversationUsageTotalsSchema`  | Cumulative token + cost accumulators                                                                         |
| `dashboardConversationUsageSummarySchema` | `{ latest: usageLatest \| null, totals: usageTotals }`                                                       |

### Role & Preset Enums

| Schema                                    | Values                                                       |
| ----------------------------------------- | ------------------------------------------------------------ |
| `agentMessageRoleSchema`                  | `"user" \| "assistant" \| "system"`                          |
| `dashboardConversationMessageRoleSchema`  | `"user" \| "assistant"`                                      |
| `dashboardAgentCanonicalToolPresetSchema` | `"ask" \| "agent"`                                           |
| `dashboardAgentLegacyToolPresetSchema`    | `"auto" \| "direct" \| "workspace-search" \| "deep-inspect"` |
| `dashboardAgentToolPresetSchema`          | Alias for canonical: `"ask" \| "agent"`                      |

### Normalizer

`normalizeDashboardAgentToolPreset(preset?)` — maps legacy preset strings (`"deep-inspect"` → `"agent"`, `"auto"/"direct"/"workspace-search"` → `"ask"`).

`dashboardAgentToolPresetInputSchema` — union of canonical + legacy, runs `.transform(normalizeDashboardAgentToolPreset)`.

### Conversation Schemas

| Schema                                    | Shape                                                                                                               |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `agentMessageSchema`                      | `{ role, content (max 20,000 chars) }`                                                                              |
| `agentChatResponseSchema`                 | Raw agent output: `{ response, messagesCount, model, toolsCalled[], workspaceNodeCount, usage, workspaceSnapshot }` |
| `dashboardConversationSummarySchema`      | `{ id, title, model, toolPreset, usageSummary, createdAt, updatedAt, lastMessageAt, lastMessagePreview }`           |
| `dashboardConversationMessageSchema`      | `{ id, role, content, contextNodeTitles[], model, toolsCalled[], createdAt }`                                       |
| `dashboardConversationDetailSchema`       | `dashboardConversationSummarySchema` extended with `messages[]`                                                     |
| `dashboardConversationListResponseSchema` | `{ conversations[] }` (max 50)                                                                                      |

### Input / Output Schemas for ORPC Procedures

| Schema                                   | Used By                                                                                                   |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `dashboardConversationGetInputSchema`    | `{ conversationId }`                                                                                      |
| `dashboardConversationRenameInputSchema` | `{ conversationId, title }`                                                                               |
| `dashboardConversationDeleteInputSchema` | `{ conversationId }`                                                                                      |
| `agentChatTurnInputSchema`               | `{ conversationId?, content, nodes?, scopeNodes?, contextNodeTitles?, activeTabId?, model?, toolPreset }` |
| `agentChatTurnResponseSchema`            | `{ conversation, userMessage, assistantMessage, createdConversation, workspaceSnapshot }`                 |

## Exported TypeScript Types

`AgentMessage`, `AgentChatResponse`, `DashboardAgentToolPreset`, `DashboardConversationUsageLatest`, `DashboardConversationUsageTotals`, `DashboardConversationUsageSummary`, `DashboardConversationSummary`, `DashboardConversationMessage`, `DashboardConversationDetail`, `AgentChatTurnInput`, `AgentChatTurnResponse`

### Runtime Context Types

```ts
type DashboardAgentWorkspaceContext = {
  nodes: WorkspaceNode[];
  scopeNodes?: WorkspaceNode[];
  marketplaceItems?: WorkspaceMarketplaceItem[];
  updatedAt?: string | null;
  userName?: string | null;
  activeTabId?: string | null;
};

type DashboardAgentConfig = {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  toolPreset?: DashboardAgentToolPreset;
};
```

## Outgoing Dependencies

| Dependency            | Mechanism                                                                                          |
| --------------------- | -------------------------------------------------------------------------------------------------- |
| `@brainiac/workspace` | imports `workspaceNodeSchema`, `WORKSPACE_NODE_LIMIT`, `WorkspaceNode`, `WorkspaceMarketplaceItem` |
| `zod`                 | all schema definitions                                                                             |

## Incoming Dependents

Consumed by every other module in `packages/agent/src/` and by `packages/api/src/routers/agent.ts` and `packages/api/src/routers/agent/service.ts`.

## Standalone Status

Not standalone — depends on `@brainiac/workspace` and `zod`.
