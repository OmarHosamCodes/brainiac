import { stepCountIs } from "@openrouter/sdk/lib/stop-conditions";

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
    const activeTab = activeTabId
      ? node.tabs.find((tab) => tab.id === activeTabId)
      : node.tabs[0];

    const lines = [
      `CURRENT SCOPE: You are inside node "${node.title}" (nodeId: ${realNodeId}).`,
      ...(activeTab
        ? [`Active tab: "${activeTab.title}" (tabId: ${activeTab.id}) with ${activeTab.blocks.length} block${activeTab.blocks.length === 1 ? "" : "s"}.`]
        : []),
    ];

    if (parsedScope) {
      const focusedBlock = activeTab?.blocks.find((block) => block.id === parsedScope.focusedBlockId);

      if (focusedBlock) {
        lines.push(`Focused block: "${focusedBlock.title || "Untitled"}" (blockId: ${focusedBlock.id}, type: ${focusedBlock.type}).`);
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

function buildAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
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

  return [
    "You are Brainiac's dashboard agent.",
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
        '2. READ BEFORE WRITE: Call get_block_details or get_tab_details on the scoped target to understand its current state before mutating.',
        "3. APPLY MUTATIONS TO SCOPE: Use the scoped nodeId and tabId for create_block, patch_block, create_tab, etc. Do NOT create a new node unless the user explicitly asks to create a new node.",
        '4. RESOLVE REFERENCES: When the user says "here", "this tab", "this node", "this block", or "current", always resolve to the scoped IDs provided above.',
        "",
        "ANTI-PATTERNS — never do these when scoped:",
        "- NEVER call create_node when the user asks to add a block or content. Use create_block with the scoped nodeId and tabId instead.",
        "- NEVER create a new tab when the user says \"add a block to this tab\". Use the active tabId from the scope.",
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
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  instructions: string;
  maxSteps: number;
  temperature?: number;
  maxOutputTokens?: number;
  contextLength: number | null;
}) {
  const tools = buildDashboardAgentTools(
    args.workspaceRuntime,
    args.workspace.marketplaceItems ?? [],
    args.toolPreset,
  );
  const calledTools = new Set<string>();
  const result = createOpenRouterClient().callModel({
    model: args.model,
    instructions: args.instructions,
    input: args.normalizedMessages,
    tools,
    stopWhen: [stepCountIs(args.maxSteps)],
    ...(args.temperature === undefined ? {} : { temperature: args.temperature }),
    ...(args.maxOutputTokens === undefined ? {} : { maxOutputTokens: args.maxOutputTokens }),
  });

  const collectToolNames = (async () => {
    for await (const event of result.getFullResponsesStream()) {
      if (event.type === "response.function_call_arguments.done") {
        calledTools.add(event.name);
      }
    }
  })();

  const [responseText, response] = await Promise.all([
    result.getText(),
    result.getResponse(),
    collectToolNames,
  ]);

  return {
    responseText: responseText.trim(),
    calledTools: [...calledTools],
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
  const calledTools = new Set<string>();
  const normalizedMessages = normalizeMessages(messages);
  const workspaceRuntime = createDashboardAgentWorkspaceRuntime({
    nodes: workspace.nodes,
    updatedAt: workspace.updatedAt,
  });
  const selectedModel = await resolveOpenRouterModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;
  const toolPreset = config.toolPreset ?? "ask";
  const supportsTools = selectedModel?.supportsTools ?? true;
  const executionConfig = resolveAgentExecutionConfig(workspace, toolPreset, supportsTools);
  let usage: DashboardConversationUsageLatest | null = null;

  let responseText = "";

  if (executionConfig.shouldUseTools) {
    try {
      const initialPass = await runToolEnabledPass({
        model,
        workspace,
        workspaceRuntime,
        toolPreset,
        normalizedMessages,
        instructions: executionConfig.instructions,
        maxSteps: executionConfig.maxSteps,
        temperature: config.temperature,
        maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
        contextLength: selectedModel?.contextLength ?? null,
      });

      responseText = initialPass.responseText;
      usage = initialPass.usage;
      for (const toolName of initialPass.calledTools) {
        calledTools.add(toolName);
      }

      if (
        executionConfig.shouldRetryForInspection &&
        calledTools.size === 0 &&
        workspace.nodes.length > 0
      ) {
        const retryPass = await runToolEnabledPass({
          model,
          workspace,
          workspaceRuntime,
          toolPreset,
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

        for (const toolName of retryPass.calledTools) {
          calledTools.add(toolName);
        }
      }
    } catch {
      responseText = "";
      calledTools.clear();
    }
  }

  let finalResponse = responseText.trim();

  if (!finalResponse) {
    const toolsWereCalled = calledTools.size > 0;
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
    toolsCalled: [...calledTools],
    workspaceNodeCount: workspaceRuntime.getNodes().length,
    usage,
    workspaceSnapshot: workspaceRuntime.hasChanges() ? workspaceRuntime.toSnapshot() : null,
  };
}

export * from "./models";
export * from "./types";
