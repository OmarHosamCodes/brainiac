---
title: Layer 4 — Agent Package: Dashboard Agent Runner (index.ts)
tags: [layer4, agent, runner, openrouter, instructions, orchestration]
---

# Layer 4 — Agent Package: Dashboard Agent Runner

**Entity:** `runDashboardAgent` + instruction builders  
**Type:** Agent Orchestration Module  
**File:** `packages/agent/src/index.ts`

## Primary Export

```ts
export async function runDashboardAgent(
  messages: AgentMessage[],
  workspace: DashboardAgentWorkspaceContext,
  config: DashboardAgentConfig = {},
): Promise<AgentChatResponse>;
```

This is the top-level entry point that executes a full agent chat turn against OpenRouter.

## Execution Flow

```
runDashboardAgent(messages, workspace, config)
  ├─ resolveOpenRouterModel(config.model)           ← picks/validates model from catalog
  ├─ createDashboardAgentWorkspaceRuntime({ nodes }) ← clones workspace into mutable runtime
  ├─ resolveAgentExecutionConfig(workspace, toolPreset, supportsTools)
  │     ├─ "agent" preset → buildAgentOnlyInstructions, maxSteps=10, maxTokens=1200, shouldRetryForInspection=true
  │     └─ "ask" preset   → buildAskInstructions, maxSteps=6, shouldRetryForInspection=false
  ├─ [if shouldUseTools]
  │     ├─ runToolEnabledPass(...)     ← calls createOpenRouterClient().callModel() with tools
  │     └─ [if agent preset + 0 tools called + nodes exist]
  │           └─ runToolEnabledPass (retry with forced inspection directive)
  └─ [if empty responseText]
        └─ client.callModel() with fallbackInstructions (no tools)
```

## Instruction Builders

| Function                                       | Preset             | Key Rules                                                                                                |
| ---------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------- |
| `buildAgentInstructions(workspace)`            | base (used by all) | Sets persona, injects workspace overview, scoped context, focused block details, user + timestamp labels |
| `buildAskInstructions(workspace)`              | `"ask"`            | Read-only; max 1 inspection tool before answering; no mutations; resolves scoped node if present         |
| `buildAgentOnlyInstructions(workspace)`        | `"agent"`          | Mutations enabled; `READ BEFORE WRITE`; `SCOPED MUTATION WORKFLOW` (4-step anti-pattern list)            |
| `buildDirectAnswerInstructions(workspace)`     | fallback           | No tools; answer from provided context only                                                              |
| `buildToolEnabledAgentInstructions(workspace)` | pass-through       | Wraps `buildAgentInstructions`                                                                           |

## Scoped Context Mechanics

- `SCOPED_CONTEXT_SEPARATOR = "::context::"` — node IDs can be encoded as `originalNodeId::context::focusedBlockId` to indicate a focused block inside a scoped node.
- `buildScopedWorkspaceContext` injects CURRENT SCOPE, active tab, focused block into the system prompt so the LLM resolves "here / this tab / current block" to exact IDs.
- `buildFocusedWorkspaceDetails` further expands MUTATION TARGET IDs when scope is exactly 1 node × 1 tab × 1 block.

## Tool-Enabled Pass (`runToolEnabledPass`)

```ts
const result = createOpenRouterClient().callModel({
  model, instructions, input: normalizedMessages,
  tools,                           // from buildDashboardAgentTools(workspaceRuntime, ...)
  stopWhen: [stepCountIs(maxSteps)],
  temperature?, maxOutputTokens?,
});
// Streams getFullResponsesStream() to collect called tool names
// Resolves getText() + getResponse() for final text + usage stats
```

## Usage Normalization

`normalizeUsage(usage, modelId, contextLength)` converts raw OpenRouter usage to `DashboardConversationUsageLatest` (adds `cachedTokens`, `reasoningTokens`, `costUsd`).

## Return Value: `AgentChatResponse`

```ts
{
  response: string,
  messagesCount: number,
  model: string,
  toolsCalled: string[],
  workspaceNodeCount: number,
  usage: DashboardConversationUsageLatest | null,
  workspaceSnapshot: { nodes, updatedAt } | null  // only if runtime.hasChanges()
}
```

## Re-exports

`index.ts` re-exports `* from "./models"` and `* from "./types"` — making them all available from `@brainiac/agent`.

## Incoming Dependents

| Consumer                                    | Mechanism                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `packages/api/src/routers/agent/service.ts` | calls `runDashboardAgent(messages, workspaceContext, config)` inside `appendDashboardConversationTurn` |

## Outgoing Dependencies

| Dependency                            | Mechanism                                                                                                      |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `packages/agent/src/client.ts`        | `createOpenRouterClient()` for SDK calls                                                                       |
| `packages/agent/src/models.ts`        | `resolveOpenRouterModel()` to resolve model ID                                                                 |
| `packages/agent/src/tools.ts`         | `buildDashboardAgentTools`, `createDashboardAgentWorkspaceRuntime`, `buildWorkspaceOverview`, `summarizeBlock` |
| `packages/agent/src/types.ts`         | all type/schema imports                                                                                        |
| `@openrouter/sdk/lib/stop-conditions` | `stepCountIs(n)` stop condition                                                                                |

## Standalone Status

Not standalone — depends on all sibling modules plus `@openrouter/sdk`.
