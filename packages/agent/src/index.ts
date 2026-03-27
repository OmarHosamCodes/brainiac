import { stepCountIs } from "@openrouter/sdk";

import { createOpenRouterClient } from "./client";
import { resolveOpenRouterFreeModel } from "./models";
import {
  buildDashboardAgentTools,
  buildWorkspaceOverview,
  createDashboardAgentWorkspaceRuntime,
  type DashboardAgentWorkspaceRuntime,
} from "./tools";
import {
  DEFAULT_AGENT_MODEL,
  type AgentChatResponse,
  type AgentMessage,
  type DashboardAgentToolPreset,
  type DashboardAgentConfig,
  type DashboardAgentWorkspaceContext,
} from "./types";

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

  return [
    "Focused scope details:",
    `Node title: ${node.title}`,
    ...(node.label ? [`Node label: ${node.label}`] : []),
    ...(node.content ? [`Node context: ${node.content}`] : []),
    `Tab title: ${tab.title}`,
    `Block type: ${block.type}`,
    `Block title: ${block.title || "Untitled block"}`,
    `Block data JSON: ${JSON.stringify(block)}`,
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
    ...(focusedWorkspaceDetails ? [focusedWorkspaceDetails] : []),
  ].join("\n");
}

function buildToolEnabledAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [
    buildAgentInstructions(workspace),
    "When the user asks you to create, rename, update, or delete nodes, tabs, or blocks, use the workspace mutation tools instead of only describing the change.",
  ].join("\n");
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

function buildWorkspaceSearchInstructions(
  workspace: DashboardAgentWorkspaceContext,
  toolingUnavailable = false,
) {
  return [
    buildToolEnabledAgentInstructions(workspace),
    toolingUnavailable
      ? "The selected model cannot call tools in this pass, so answer directly and say when deeper workspace inspection would require a tools-capable model."
      : "When the user asks about the workspace, prefer listing or searching the workspace before synthesizing an answer.",
    "Ground claims in retrieved workspace details instead of broad summaries when possible.",
  ].join("\n");
}

function buildDeepInspectInstructions(
  workspace: DashboardAgentWorkspaceContext,
  toolingUnavailable = false,
) {
  return [
    buildToolEnabledAgentInstructions(workspace),
    toolingUnavailable
      ? "The selected model cannot call tools in this pass, so explain that deep inspection is limited and answer from the provided context only."
      : "Inspect the workspace before concluding. Use workspace tools to verify specifics, especially for prioritization, gaps, and recommendations.",
    "If tools are available and the workspace has nodes, do at least one inspection step before your final answer.",
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
    case "direct":
      return {
        shouldUseTools: false,
        instructions: buildDirectAnswerInstructions(workspace),
        fallbackInstructions: buildDirectAnswerInstructions(workspace),
        maxSteps: 0,
        maxOutputTokens: undefined,
        shouldRetryForInspection: false,
      };
    case "workspace-search":
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools
          ? buildWorkspaceSearchInstructions(workspace)
          : buildDirectAnswerInstructions(
              workspace,
              "Tooling is unavailable for the selected model, so this answer is limited to the provided workspace context.",
            ),
        fallbackInstructions: buildDirectAnswerInstructions(
          workspace,
          "Tooling is unavailable for the selected model, so this answer is limited to the provided workspace context.",
        ),
        maxSteps: 8,
        maxOutputTokens: undefined,
        shouldRetryForInspection: false,
      };
    case "deep-inspect":
      return {
        shouldUseTools: supportsTools,
        instructions: supportsTools
          ? buildDeepInspectInstructions(workspace)
          : buildDirectAnswerInstructions(
              workspace,
              "Deep inspection is limited because the selected model cannot call tools.",
            ),
        fallbackInstructions: buildDirectAnswerInstructions(
          workspace,
          "Deep inspection is limited because the selected model cannot call tools.",
        ),
        maxSteps: 12,
        maxOutputTokens: 1_200,
        shouldRetryForInspection: supportsTools && workspace.nodes.length > 0,
      };
    case "auto":
    default:
      return {
        shouldUseTools: supportsTools,
        instructions: buildToolEnabledAgentInstructions(workspace),
        fallbackInstructions: buildDirectAnswerInstructions(workspace),
        maxSteps: 8,
        maxOutputTokens: undefined,
        shouldRetryForInspection: false,
      };
  }
}

async function runToolEnabledPass(args: {
  model: string;
  workspace: DashboardAgentWorkspaceContext;
  workspaceRuntime: DashboardAgentWorkspaceRuntime;
  normalizedMessages: ReturnType<typeof normalizeMessages>;
  instructions: string;
  maxSteps: number;
  temperature?: number;
  maxOutputTokens?: number;
}) {
  const tools = buildDashboardAgentTools(args.workspaceRuntime, args.workspace.marketplaceItems ?? []);
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

  const [responseText] = await Promise.all([result.getText(), collectToolNames]);

  return {
    responseText: responseText.trim(),
    calledTools: [...calledTools],
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
  const selectedModel = await resolveOpenRouterFreeModel(config.model);
  const model = selectedModel?.id ?? config.model?.trim() ?? DEFAULT_AGENT_MODEL;
  const toolPreset = config.toolPreset ?? "auto";
  const supportsTools = selectedModel?.supportsTools ?? true;
  const executionConfig = resolveAgentExecutionConfig(workspace, toolPreset, supportsTools);

  let responseText = "";

  if (executionConfig.shouldUseTools) {
    try {
      const initialPass = await runToolEnabledPass({
        model,
        workspace,
        workspaceRuntime,
        normalizedMessages,
        instructions: executionConfig.instructions,
        maxSteps: executionConfig.maxSteps,
        temperature: config.temperature,
        maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
      });

      responseText = initialPass.responseText;
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
          normalizedMessages,
          instructions: `${executionConfig.instructions}\nYou have not inspected the workspace yet. Call a relevant tool before answering.`,
          maxSteps: executionConfig.maxSteps,
          temperature: config.temperature,
          maxOutputTokens: executionConfig.maxOutputTokens ?? config.maxOutputTokens,
        });

        if (retryPass.responseText) {
          responseText = retryPass.responseText;
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
    const fallbackMaxOutputTokens = executionConfig.maxOutputTokens ?? config.maxOutputTokens;

    finalResponse = (
      await client
        .callModel({
          model,
          instructions: executionConfig.fallbackInstructions,
          input: normalizedMessages,
          ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
          ...(fallbackMaxOutputTokens === undefined
            ? {}
            : { maxOutputTokens: fallbackMaxOutputTokens }),
        })
        .getText()
    ).trim();
  }

  return {
    response: finalResponse || "I couldn't generate a response.",
    messagesCount: normalizedMessages.length + 1,
    model,
    toolsCalled: [...calledTools],
    workspaceNodeCount: workspaceRuntime.getNodes().length,
    workspaceSnapshot: workspaceRuntime.hasChanges() ? workspaceRuntime.toSnapshot() : null,
  };
}

export * from "./models";
export * from "./types";
