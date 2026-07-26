import { stepCountIs } from "@openrouter/sdk/lib/stop-conditions";

import { buildAgencyAgentTools } from "./agency-tools";
import { createOpenRouterClient } from "./client";
import { resolveOpenRouterModel } from "./models";
import {
  buildDashboardAgentTools,
  buildWorkspaceOverview,
  createDashboardAgentWorkspaceRuntime,
  summarizeBlock,
  type DashboardAgentWorkspaceRuntime,
} from "./tools";
import {
  DEFAULT_AGENT_MODEL,
  type AgentChatResponse,
  type AgentMessage,
  type AgentToolCall,
  type DashboardAgentConfig,
  type DashboardAgentToolPreset,
  type DashboardAgentWorkspaceContext,
  type DashboardConversationUsageLatest,
} from "./types";

type OpenRouterUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost?: number | null;
  inputTokensDetails?: {
    cachedTokens?: number | null;
  } | null;
  outputTokensDetails?: {
    reasoningTokens?: number | null;
  } | null;
};

function getScopedWorkspaceNodes(workspace: DashboardAgentWorkspaceContext) {
  if (workspace.scopeNodes && workspace.scopeNodes.length > 0) {
    return workspace.scopeNodes;
  }

  return workspace.nodes;
}

function hasScopedWorkspace(workspace: DashboardAgentWorkspaceContext) {
  if (!workspace.scopeNodes || workspace.scopeNodes.length === 0) {
    return false;
  }

  if (workspace.scopeNodes.length !== workspace.nodes.length) {
    return true;
  }

  return workspace.scopeNodes.some((node, index) => node.id !== workspace.nodes[index]?.id);
}

const SCOPED_CONTEXT_SEPARATOR = "::context::";

function parseScopedNodeId(nodeId: string) {
  const separatorIndex = nodeId.indexOf(SCOPED_CONTEXT_SEPARATOR);

  if (separatorIndex === -1) {
    return null;
  }

  return {
    originalNodeId: nodeId.slice(0, separatorIndex),
    focusedBlockId: nodeId.slice(separatorIndex + SCOPED_CONTEXT_SEPARATOR.length),
  };
}

function buildFocusedWorkspaceDetails(nodes: ReturnType<typeof getScopedWorkspaceNodes>) {
  if (nodes.length !== 1) {
    return null;
  }

  const node = nodes[0];

  if (!node || node.tabs.length !== 1) {
    return null;
  }

  const tab = node.tabs[0];

  if (!tab || tab.blocks.length !== 1) {
    return null;
  }

  const block = tab.blocks[0];

  if (!block) {
    return null;
  }

  const parsedScope = parseScopedNodeId(node.id);

  return [
    "Focused scope details:",
    `Node title: ${node.title}`,
    ...(node.label ? [`Node label: ${node.label}`] : []),
    ...(node.content ? [`Node context: ${node.content}`] : []),
    `Tab title: ${tab.title}`,
    `Block type: ${block.type}`,
    `Block title: ${block.title || "Untitled block"}`,
    `Block summary: ${summarizeBlock(block)}`,
    ...(parsedScope
      ? [
          `MUTATION TARGET IDs — use these when calling mutation tools:`,
          `  nodeId: ${parsedScope.originalNodeId}`,
          `  tabId: ${tab.id}`,
          `  blockId: ${parsedScope.focusedBlockId}`,
        ]
      : [
          `MUTATION TARGET IDs — use these when calling mutation tools:`,
          `  nodeId: ${node.id}`,
          `  tabId: ${tab.id}`,
          `  blockId: ${block.id}`,
        ]),
  ].join("\n");
}

function buildScopedWorkspaceContext(workspace: DashboardAgentWorkspaceContext) {
  const scopedNodes = getScopedWorkspaceNodes(workspace);

  if (!hasScopedWorkspace(workspace)) {
    return null;
  }

  if (scopedNodes.length === 1) {
    const node = scopedNodes[0];

    if (!node) {
      return null;
    }

    const parsedScope = parseScopedNodeId(node.id);
    const realNodeId = parsedScope?.originalNodeId ?? node.id;
    const activeTabId = workspace.activeTabId ?? node.viewState?.activeTabId;
    const activeTab = activeTabId ? node.tabs.find((tab) => tab.id === activeTabId) : node.tabs[0];

    const lines = [
      `CURRENT SCOPE: You are inside node "${node.title}" (nodeId: ${realNodeId}).`,
      ...(activeTab
        ? [
            `Active tab: "${activeTab.title}" (tabId: ${activeTab.id}) with ${activeTab.blocks.length} block${activeTab.blocks.length === 1 ? "" : "s"}.`,
          ]
        : []),
    ];

    if (parsedScope) {
      const focusedBlock = activeTab?.blocks.find(
        (block) => block.id === parsedScope.focusedBlockId,
      );

      if (focusedBlock) {
        lines.push(
          `Focused block: "${focusedBlock.title || "Untitled"}" (blockId: ${focusedBlock.id}, type: ${focusedBlock.type}).`,
        );
      }
    }

    lines.push(
      `When the user says "here", "this tab", "this node", or "current block", resolve to these IDs.`,
      `Default all mutations (create_block, patch_block, etc.) to nodeId: ${realNodeId}${activeTab ? `, tabId: ${activeTab.id}` : ""} unless the user explicitly names a different target.`,
    );

    return lines.join("\n");
  }

  return [
    `CURRENT SCOPE: You are scoped to ${scopedNodes.length} nodes. Prioritize mutations within these nodes.`,
    `Use the node/tab/block IDs from the scoped overview when the user refers to "here" or "this".`,
  ].join("\n");
}

function buildAgencyInstructions(workspace: DashboardAgentWorkspaceContext) {
  const userLabel = workspace.userName?.trim()
    ? `The current user is ${workspace.userName.trim()}.`
    : "The current user name is unavailable.";
  const scopeLines =
    workspace.scopeRefs && workspace.scopeRefs.length > 0
      ? [
          "Pinned scope chips for this turn:",
          ...workspace.scopeRefs.map((ref) => `- ${ref.kind}: ${ref.label} (${ref.id})`),
        ]
      : ["No Agency scope chips are pinned for this turn."];

  return [
    "You are Orch's Agency assistant.",
    "Help the user understand tracked time, projects, members, and report totals.",
    "Agency mode is ask-only. Do not create, edit, or delete time entries, projects, tasks, or members.",
    "Ground every answer in tool results. If you need data, call a tool instead of guessing.",
    "Be concise, concrete, and factual.",
    userLabel,
    workspace.teamId ? `Active team id: ${workspace.teamId}.` : "Active team id is unavailable.",
    ...scopeLines,
  ].join("\n");
}

function buildAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  if (workspace.surface === "agency") {
    return buildAgencyInstructions(workspace);
  }

  const scopedNodes = getScopedWorkspaceNodes(workspace);
  const scopedWorkspace = hasScopedWorkspace(workspace);
  const updatedLabel = workspace.updatedAt
    ? `Workspace updated at ${workspace.updatedAt}.`
    : "Workspace update time is unavailable.";
  const userLabel = workspace.userName?.trim()
    ? `The current user is ${workspace.userName.trim()}.`
    : "The current user name is unavailable.";
  const marketplaceCount = workspace.marketplaceItems?.length ?? 0;
  const focusedWorkspaceDetails = buildFocusedWorkspaceDetails(scopedNodes);
  const scopedContext = buildScopedWorkspaceContext(workspace);
  const scopeRefLines =
    workspace.scopeRefs && workspace.scopeRefs.length > 0
      ? [
          "Pinned scope chips for this turn:",
          ...workspace.scopeRefs.map((ref) => `- ${ref.kind}: ${ref.label} (${ref.id})`),
        ]
      : [];

  return [
    "You are Orch's dashboard agent.",
    "Help the user reason about the dashboard, prioritize work, and spot gaps.",
    "Ground every answer in the actual workspace data. If you need more detail, call a tool instead of guessing.",
    "Be concise, concrete, and action-oriented.",
    userLabel,
    updatedLabel,
    `The dashboard currently has ${workspace.nodes.length} nodes.`,
    ...(scopedWorkspace
      ? [
          `The current turn is scoped to ${scopedNodes.length} node${scopedNodes.length === 1 ? "" : "s"}. Prioritize those unless the user asks you to work elsewhere.`,
        ]
      : []),
    `The marketplace currently has ${marketplaceCount} items.`,
    ...scopeRefLines,
    scopedWorkspace ? "Scoped dashboard overview:" : "Dashboard overview:",
    buildWorkspaceOverview(scopedNodes),
    ...(scopedContext ? [scopedContext] : []),
    ...(focusedWorkspaceDetails ? [focusedWorkspaceDetails] : []),
  ].join("\n");
}

function buildToolEnabledAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [buildAgentInstructions(workspace)].join("\n");
}

function buildDirectAnswerInstructions(workspace: DashboardAgentWorkspaceContext, note?: string) {
  return [
    buildAgentInstructions(workspace),
    "Answer directly from the provided workspace context.",
    "Do not call tools in this pass.",
    "If the context is incomplete, say what is missing instead of returning an empty response.",
    ...(note ? [note] : []),
  ].join("\n");
}

function buildAskInstructions(
  workspace: DashboardAgentWorkspaceContext,
  toolingUnavailable = false,
) {
  const scopedWorkspace = hasScopedWorkspace(workspace);

  return [
    buildToolEnabledAgentInstructions(workspace),
    toolingUnavailable
      ? "The selected model cannot call tools in this pass, so answer directly from the provided context and say when deeper inspection would require a tools-capable model."
      : "Start from the provided workspace context. If you need inspection, prefer one compact list, search, or summary detail tool before answering.",
    "Ask mode is read-only. Do not create, rename, update, or delete nodes, tabs, or blocks.",
    "Avoid full raw node, tab, block, or marketplace payloads unless the answer is blocked or you are preparing a replace mutation.",
    "If you inspect a block, use get_block_details and rely on its summary and editGuide instead of guessing field names.",
    "For block edits, prefer patch_block for targeted field updates and bulk nested changes.",
    ...(scopedWorkspace
      ? [
          "SCOPE WORKFLOW: The user is inside a specific node. Inspect the scoped node's data first before looking elsewhere. Use the provided nodeId and tabId to target your inspection tools.",
        ]
      : []),
  ].join("\n");
}

function buildAgentOnlyInstructions(
  workspace: DashboardAgentWorkspaceContext,
  toolingUnavailable = false,
) {
  const scopedWorkspace = hasScopedWorkspace(workspace);

  return [
    buildToolEnabledAgentInstructions(workspace),
    toolingUnavailable
      ? "The selected model cannot call tools in this pass, so explain that deep inspection is limited and answer from the provided context only."
      : "Inspect the workspace before concluding. Start with list, search, or summary detail tools to verify specifics before you answer.",
    "When the user asks you to create, rename, update, or delete nodes, tabs, or blocks, use the workspace mutation tools instead of only describing the change.",
    "Escalate to full raw node, tab, block, or marketplace payloads only when mutation prep or exact structural verification requires it.",
    'For block edits, search or inspect first, call get_block_details, use its editGuide with patch_block when possible, and only escalate to detailLevel: "full" plus replace_block when patch_block is not enough.',
    "If tools are available and the workspace has nodes, do at least one inspection step before your final answer.",
    ...(scopedWorkspace
      ? [
          "",
          "SCOPED MUTATION WORKFLOW — follow these steps in order:",
          "1. IDENTIFY SCOPE: The user is inside a specific node. The CURRENT SCOPE section above provides the target nodeId, tabId, and optionally blockId. All mutations default to these IDs.",
          "2. READ BEFORE WRITE: Call get_block_details or get_tab_details on the scoped target to understand its current state before mutating.",
          "3. APPLY MUTATIONS TO SCOPE: Use the scoped nodeId and tabId for create_block, patch_block, create_tab, etc. Do NOT create a new node unless the user explicitly asks to create a new node.",
          '4. RESOLVE REFERENCES: When the user says "here", "this tab", "this node", "this block", or "current", always resolve to the scoped IDs provided above.',
          "",
          "ANTI-PATTERNS — never do these when scoped:",
          "- NEVER call create_node when the user asks to add a block or content. Use create_block with the scoped nodeId and tabId instead.",
          '- NEVER create a new tab when the user says "add a block to this tab". Use the active tabId from the scope.',
          "- NEVER guess node/tab/block IDs. Use the exact IDs provided in CURRENT SCOPE and MUTATION TARGET IDs.",
        ]
      : []),
  ].join("\n");
}

function normalizeMessages(messages: AgentMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
}

function resolveAgentExecutionConfig(
  workspace: DashboardAgentWorkspaceContext,
  toolPreset: DashboardAgentToolPreset,
  supportsTools: boolean,
) {
  switch (toolPreset) {
    case "agent":
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools
          ? buildAgentOnlyInstructions(workspace)
          : buildDirectAnswerInstructions(
              workspace,
              "Deep inspection is limited because the selected model cannot call tools.",
            ),
        fallbackInstructions: buildDirectAnswerInstructions(
          workspace,
          "Deep inspection is limited because the selected model cannot call tools.",
        ),
        maxSteps: 10,
        maxOutputTokens: 1_200,
        shouldRetryForInspection: supportsTools && workspace.nodes.length > 0,
      };
    case "ask":
    default:
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools
          ? buildAskInstructions(workspace)
          : buildDirectAnswerInstructions(
              workspace,
              "Tooling is unavailable for the selected model, so this answer is limited to the provided workspace context.",
            ),
        fallbackInstructions: buildDirectAnswerInstructions(
          workspace,
          "Tooling is unavailable for the selected model, so this answer is limited to the provided workspace context.",
        ),
        maxSteps: 6,
        maxOutputTokens: undefined,
        shouldRetryForInspection: false,
      };
  }
}

async function runToolEnabledPass(args: {
  model: string;
  workspace: DashboardAgentWorkspaceContext;
  workspaceRuntime: DashboardAgentWorkspaceRuntime;
  toolPreset: DashboardAgentToolPreset;
  agencyRuntime?: DashboardAgentConfig["agencyRuntime"];
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  instructions: string;
  maxSteps: number;
  temperature?: number;
  maxOutputTokens?: number;
  contextLength: number | null;
}) {
  const tools =
    args.workspace.surface === "agency" && args.agencyRuntime
      ? buildAgencyAgentTools(args.agencyRuntime)
      : buildDashboardAgentTools(
          args.workspaceRuntime,
          args.workspace.marketplaceItems ?? [],
          args.toolPreset,
        );
  const calls = new Map<string, AgentToolCall>();
  const callOrder: string[] = [];
  const result = createOpenRouterClient().callModel({
    model: args.model,
    instructions: args.instructions,
    input: args.normalizedMessages,
    tools,
    stopWhen: [stepCountIs(args.maxSteps)],
    ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
    ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
  });

  const recordToolStream = (async () => {
    try {
      for await (const message of result.getNewMessagesStream()) {
        if (message.type === "function_call") {
          const callId = message.callId ?? message.id ?? `call_${callOrder.length}`;
          let parsedInput: unknown = message.arguments;
          try {
            parsedInput = JSON.parse(message.arguments);
          } catch {
            // keep raw string if not JSON
          }
          if (!calls.has(callId)) {
            callOrder.push(callId);
          }
          const existing = calls.get(callId);
          calls.set(callId, {
            id: callId,
            name: message.name,
            input: parsedInput,
            output: existing?.output,
            status: existing?.status === "error" ? "error" : "in_progress",
            error: existing?.error ?? null,
          });
        } else if (message.type === "function_call_output") {
          const callId = message.callId;
          let parsedOutput: unknown = message.output;
          if (typeof message.output === "string") {
            try {
              parsedOutput = JSON.parse(message.output);
            } catch {
              parsedOutput = message.output;
            }
          }

          // Heuristic: detect tool errors when output payload has an `error` field.
          const rawErrorMessage =
            parsedOutput &&
            typeof parsedOutput === "object" &&
            !Array.isArray(parsedOutput) &&
            "error" in parsedOutput &&
            typeof (parsedOutput as { error?: unknown }).error === "string"
              ? (parsedOutput as { error?: string }).error?.trim() || null
              : null;
          const errorMessage =
            rawErrorMessage && rawErrorMessage.length > 2000
              ? `${rawErrorMessage.slice(0, 1999)}…`
              : rawErrorMessage;

          if (!calls.has(callId)) {
            callOrder.push(callId);
            calls.set(callId, {
              id: callId,
              name: "unknown_tool",
              output: parsedOutput,
              status: errorMessage ? "error" : "completed",
              error: errorMessage,
            });
          } else {
            const existing = calls.get(callId)!;
            calls.set(callId, {
              ...existing,
              output: parsedOutput,
              status: errorMessage ? "error" : "completed",
              error: errorMessage,
            });
          }
        }
      }
    } catch {
      // streaming errors are surfaced by getResponse rejection below
    }
  })();

  const [responseText, response] = await Promise.all([
    result.getText(),
    result.getResponse(),
    recordToolStream,
  ]);

  const orderedCalls = callOrder
    .map((id) => calls.get(id))
    .filter((call): call is AgentToolCall => Boolean(call));

  return {
    responseText: responseText.trim(),
    toolCalls: orderedCalls,
    usage: normalizeUsage(response.usage, args.model, args.contextLength),
  };
}

function normalizeUsage(
  usage: OpenRouterUsage | null | undefined,
  modelId: string,
  contextLength: number | null,
): DashboardConversationUsageLatest | null {
  if (!usage) {
    return null;
  }

  return {
    modelId,
    contextLength,
    inputTokens: usage.inputTokens,
    cachedTokens: usage.inputTokensDetails?.cachedTokens ?? 0,
    outputTokens: usage.outputTokens,
    reasoningTokens: usage.outputTokensDetails?.reasoningTokens ?? 0,
    totalTokens: usage.totalTokens,
    costUsd: usage.cost ?? null,
  };
}

export async function runDashboardAgent(
  messages: AgentMessage[],
  workspace: DashboardAgentWorkspaceContext,
  config: DashboardAgentConfig = {},
): Promise<AgentChatResponse> {
  const client = createOpenRouterClient();
  const toolCalls: AgentToolCall[] = [];
  const normalizedMessages = normalizeMessages(messages);
  const workspaceRuntime = createDashboardAgentWorkspaceRuntime({
    nodes: workspace.nodes,
    updatedAt: workspace.updatedAt,
  });
  const selectedModel = await resolveOpenRouterModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;
  const surface = workspace.surface ?? "canvas";
  const toolPreset = surface === "agency" ? "ask" : (config.toolPreset ?? "ask");
  const supportsTools = selectedModel?.supportsTools ?? true;
  const executionConfig = resolveAgentExecutionConfig(
    { ...workspace, surface },
    toolPreset,
    supportsTools,
  );
  let usage: DashboardConversationUsageLatest | null = null;

  let responseText = "";

  if (executionConfig.shouldUseTools) {
    try {
      const initialPass = await runToolEnabledPass({
        model,
        workspace: { ...workspace, surface },
        workspaceRuntime,
        toolPreset,
        agencyRuntime: config.agencyRuntime,
        normalizedMessages,
        instructions: executionConfig.instructions,
        maxSteps: executionConfig.maxSteps,
        temperature: config.temperature,
        maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
        contextLength: selectedModel?.contextLength ?? null,
      });

      responseText = initialPass.responseText;
      usage = initialPass.usage;
      toolCalls.push(...initialPass.toolCalls);

      if (
        executionConfig.shouldRetryForInspection &&
        toolCalls.length === 0 &&
        workspace.nodes.length > 0 &&
        surface !== "agency"
      ) {
        const retryPass = await runToolEnabledPass({
          model,
          workspace: { ...workspace, surface },
          workspaceRuntime,
          toolPreset,
          agencyRuntime: config.agencyRuntime,
          normalizedMessages,
          instructions: `${executionConfig.instructions}\nYou have not inspected the workspace yet. Call a relevant tool before answering.`,
          maxSteps: executionConfig.maxSteps,
          temperature: config.temperature,
          maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
          contextLength: selectedModel?.contextLength ?? null,
        });

        if (retryPass.responseText) {
          responseText = retryPass.responseText;
        }

        if (retryPass.usage) {
          usage = retryPass.usage;
        }

        toolCalls.push(...retryPass.toolCalls);
      }
    } catch {
      responseText = "";
      toolCalls.length = 0;
    }
  }

  let finalResponse = responseText.trim();

  if (!finalResponse) {
    const toolsWereCalled = toolCalls.length > 0;
    const runtimeHasChanges = workspaceRuntime.hasChanges();
    const fallbackMaxOutputTokens = executionConfig.maxOutputTokens ?? config.maxOutputTokens;

    const fallbackInstructions = toolsWereCalled
      ? [
          buildAgentInstructions(workspace),
          runtimeHasChanges
            ? "You already called tools and applied mutations to the workspace. Summarize the completed actions for the user. Do not say that tools are unavailable — you already used them successfully."
            : "You called tools but the mutations did not complete. Explain what you attempted and what went wrong. Do not say that tools are unavailable — you did call tools but encountered errors.",
        ].join("\n")
      : executionConfig.fallbackInstructions;

    const fallbackResult = client.callModel({
      model,
      instructions: fallbackInstructions,
      input: normalizedMessages,
      ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
      ...(fallbackMaxOutputTokens === undefined
        ? {}
        : { maxOutputTokens: fallbackMaxOutputTokens }),
    });
    const [fallbackText, fallbackResponse] = await Promise.all([
      fallbackResult.getText(),
      fallbackResult.getResponse(),
    ]);

    finalResponse = fallbackText.trim();
    usage = normalizeUsage(fallbackResponse.usage, model, selectedModel?.contextLength ?? null);
  }

  return {
    response: finalResponse || "I couldn't generate a response.",
    messagesCount: normalizedMessages.length + 1,
    model,
    toolsCalled: toolCalls,
    workspaceNodeCount: workspaceRuntime.getNodes().length,
    usage,
    workspaceSnapshot: workspaceRuntime.hasChanges() ? workspaceRuntime.toSnapshot() : null,
  };
}

export async function runTaskAgent(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  context: {
    taskTitle: string;
    taskStatus: string;
    projectName: string;
    clientName: string;
    assigneeName: string | null;
    recentMessages: Array<{ role: "user" | "assistant"; content: string }>;
  },
  config: {
    model?: string;
    maxOutputTokens?: number;
  } = {},
) {
  const client = createOpenRouterClient();
  const selectedModel = await resolveOpenRouterModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;

  const instructions = [
    "You are Orch's agency task assistant.",
    "Answer questions about the task using only the task context and recent messages provided.",
    "You are read-only in this version: do not edit task status, assignee, or due date.",
    "Be concise and concrete.",
    "",
    "Task context:",
    `- Title: ${context.taskTitle}`,
    `- Status: ${context.taskStatus}`,
    `- Project: ${context.projectName}`,
    `- Client: ${context.clientName}`,
    context.assigneeName ? `- Assignee: ${context.assigneeName}` : "- Assignee: unassigned",
    "",
    "Recent messages in this thread:",
    ...context.recentMessages.map((m) => `${m.role}: ${m.content}`),
  ].join("\n");

  const normalizedMessages = messages.map((m) => ({
    role: m.role,
    content: m.content.trim(),
  }));

  const result = client.callModel({
    model,
    instructions,
    input: normalizedMessages,
    ...(config.maxOutputTokens === undefined ? {} : { maxOutputTokens: config.maxOutputTokens }),
  });

  const [text, response] = await Promise.all([result.getText(), result.getResponse()]);

  return {
    response: text.trim() || "I couldn't generate a response.",
    model,
    usage: normalizeUsage(response.usage, model, selectedModel?.contextLength ?? null),
  };
}

export * from "./models";
export * from "./model-routing";
export * from "./types";
export { listAgentToolCatalog } from "./tool-catalog";
