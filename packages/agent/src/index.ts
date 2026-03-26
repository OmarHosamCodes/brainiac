import { stepCountIs } from "@openrouter/sdk";

import { createOpenRouterClient } from "./client";
import { getOpenRouterFreeModel } from "./models";
import { buildDashboardAgentTools, buildWorkspaceOverview } from "./tools";
import {
  DEFAULT_AGENT_MODEL,
  type AgentChatResponse,
  type AgentMessage,
  type DashboardAgentConfig,
  type DashboardAgentWorkspaceContext,
} from "./types";

function buildAgentInstructions(workspace: DashboardAgentWorkspaceContext) {
  const updatedLabel = workspace.updatedAt
    ? `Workspace updated at ${workspace.updatedAt}.`
    : "Workspace update time is unavailable.";
  const userLabel = workspace.userName?.trim()
    ? `The current user is ${workspace.userName.trim()}.`
    : "The current user name is unavailable.";

  return [
    "You are Brainiac's dashboard agent.",
    "Help the user reason about the dashboard, prioritize work, and spot gaps.",
    "Ground every answer in the actual workspace data. If you need more detail, call a tool instead of guessing.",
    "Be concise, concrete, and action-oriented.",
    userLabel,
    updatedLabel,
    `The dashboard currently has ${workspace.nodes.length} nodes.`,
    "Dashboard overview:",
    buildWorkspaceOverview(workspace.nodes),
  ].join("\n");
}

function buildDirectAnswerInstructions(workspace: DashboardAgentWorkspaceContext) {
  return [
    buildAgentInstructions(workspace),
    "Answer directly from the provided workspace context.",
    "Do not call tools in this pass.",
    "If the context is incomplete, say what is missing instead of returning an empty response.",
  ].join("\n");
}

function normalizeMessages(messages: AgentMessage[]) {
  return messages.map((message) => ({
    role: message.role,
    content: message.content.trim(),
  }));
}

export async function runDashboardAgent(
  messages: AgentMessage[],
  workspace: DashboardAgentWorkspaceContext,
  config: DashboardAgentConfig = {},
): Promise<AgentChatResponse> {
  const client = createOpenRouterClient();
  const tools = buildDashboardAgentTools(workspace.nodes);
  const calledTools = new Set<string>();
  const normalizedMessages = normalizeMessages(messages);
  const model = config.model?.trim() || DEFAULT_AGENT_MODEL;
  const selectedModel = await getOpenRouterFreeModel(model).catch(() => null);
  const shouldUseTools = selectedModel?.supportsTools ?? true;

  let responseText = "";

  if (shouldUseTools) {
    try {
      const result = client.callModel({
        model,
        instructions: buildAgentInstructions(workspace),
        input: normalizedMessages,
        tools,
        stopWhen: [stepCountIs(8)],
        ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
        ...(config.maxOutputTokens === undefined
          ? {}
          : { maxOutputTokens: config.maxOutputTokens }),
      });

      const collectToolNames = (async () => {
        for await (const event of result.getFullResponsesStream()) {
          if (event.type === "response.function_call_arguments.done") {
            calledTools.add(event.name);
          }
        }
      })();

      [responseText] = await Promise.all([result.getText(), collectToolNames]);
    } catch {
      responseText = "";
      calledTools.clear();
    }
  }

  let finalResponse = responseText.trim();

  if (!finalResponse) {
    finalResponse = (
      await client
        .callModel({
          model,
          instructions: buildDirectAnswerInstructions(workspace),
          input: normalizedMessages,
          ...(config.temperature === undefined ? {} : { temperature: config.temperature }),
          ...(config.maxOutputTokens === undefined
            ? {}
            : { maxOutputTokens: config.maxOutputTokens }),
        })
        .getText()
    ).trim();
  }

  return {
    response: finalResponse || "I couldn't generate a response.",
    messagesCount: normalizedMessages.length + 1,
    model,
    toolsCalled: [...calledTools],
    workspaceNodeCount: workspace.nodes.length,
  };
}

export * from "./models";
export * from "./types";
