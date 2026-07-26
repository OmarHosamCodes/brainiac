import type {
  AgentChatTurnStreamEvent,
  AgentToolCall,
  DashboardConversationMessage,
} from "@orch/agent/types";
import type { UIMessage, UIMessageChunk } from "ai";

export type OrchUIDataParts = {
  orchMeta: {
    conversationId: string;
    createdConversation: boolean;
    userMessageId: string;
    assistantMessageId: string;
    model: string;
  };
  orchCompleted: {
    conversationId: string;
    stopped: boolean;
    createdConversation: boolean;
    workspaceSnapshot: {
      nodes: unknown[];
      updatedAt: string | null;
    } | null;
    assistantMessageId: string;
    userMessageId: string;
  };
};

export type OrchUIMessage = UIMessage<unknown, OrchUIDataParts>;

export type OrchUIMessageChunk = UIMessageChunk<unknown, OrchUIDataParts>;

export function getLastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message?.role !== "user") continue;
    const text = message.parts
      .filter((part): part is { type: "text"; text: string } => part.type === "text")
      .map((part) => part.text)
      .join("")
      .trim();
    if (text) return text;
  }
  return "";
}

export function dashboardMessagesToUIMessages(
  messages: DashboardConversationMessage[],
): OrchUIMessage[] {
  return messages.map((message) => {
    const parts: OrchUIMessage["parts"] = [{ type: "text", text: message.content, state: "done" }];

    if (message.role === "assistant") {
      for (const entry of message.toolsCalled) {
        if (typeof entry === "string") {
          parts.push({
            type: "dynamic-tool",
            toolName: entry,
            toolCallId: `legacy-${entry}`,
            state: "output-available",
            input: {},
            output: null,
          });
          continue;
        }
        parts.push(toolCallToDynamicPart(entry));
      }
    }

    return {
      id: message.id,
      role: message.role,
      parts,
    };
  });
}

function toolCallToDynamicPart(tool: AgentToolCall): OrchUIMessage["parts"][number] {
  const toolCallId = tool.id ?? tool.name;
  if (tool.status === "error") {
    return {
      type: "dynamic-tool",
      toolName: tool.name,
      toolCallId,
      state: "output-error",
      input: tool.input,
      errorText: tool.error ?? "Tool failed",
    };
  }
  if (tool.status === "in_progress") {
    return {
      type: "dynamic-tool",
      toolName: tool.name,
      toolCallId,
      state: "input-available",
      input: tool.input ?? {},
    };
  }
  return {
    type: "dynamic-tool",
    toolName: tool.name,
    toolCallId,
    state: "output-available",
    input: tool.input ?? {},
    output: tool.output ?? null,
  };
}

export function createOrchEventToChunkMapper() {
  let textStarted = false;
  let textId = "orch-text";
  const startedTools = new Set<string>();

  return function mapEvent(event: AgentChatTurnStreamEvent): OrchUIMessageChunk[] {
    switch (event.type) {
      case "started": {
        textId = event.assistantMessageId;
        return [
          { type: "start", messageId: event.assistantMessageId },
          {
            type: "data-orchMeta",
            id: event.conversationId,
            data: {
              conversationId: event.conversationId,
              createdConversation: event.createdConversation,
              userMessageId: event.userMessageId,
              assistantMessageId: event.assistantMessageId,
              model: event.model,
            },
          },
        ];
      }
      case "token": {
        const chunks: OrchUIMessageChunk[] = [];
        if (!textStarted) {
          textStarted = true;
          chunks.push({ type: "text-start", id: textId });
        }
        chunks.push({ type: "text-delta", id: textId, delta: event.delta });
        return chunks;
      }
      case "tool": {
        const toolCallId = event.tool.id ?? event.tool.name;
        const chunks: OrchUIMessageChunk[] = [];
        if (!startedTools.has(toolCallId)) {
          startedTools.add(toolCallId);
          chunks.push({
            type: "tool-input-start",
            toolCallId,
            toolName: event.tool.name,
            dynamic: true,
          });
          chunks.push({
            type: "tool-input-available",
            toolCallId,
            toolName: event.tool.name,
            input: event.tool.input ?? {},
            dynamic: true,
          });
        }
        if (event.tool.status === "completed") {
          chunks.push({
            type: "tool-output-available",
            toolCallId,
            output: event.tool.output ?? null,
            dynamic: true,
          });
        } else if (event.tool.status === "error") {
          chunks.push({
            type: "tool-output-error",
            toolCallId,
            errorText: event.tool.error ?? "Tool failed",
            dynamic: true,
          });
        }
        return chunks;
      }
      case "error":
        return [{ type: "error", errorText: event.message }];
      case "completed": {
        const chunks: OrchUIMessageChunk[] = [];
        if (textStarted) {
          chunks.push({ type: "text-end", id: textId });
        }
        chunks.push({
          type: "data-orchCompleted",
          id: event.conversation.id,
          data: {
            conversationId: event.conversation.id,
            stopped: event.stopped,
            createdConversation: event.createdConversation,
            workspaceSnapshot: event.workspaceSnapshot,
            assistantMessageId: event.assistantMessage.id,
            userMessageId: event.userMessage.id,
          },
        });
        chunks.push({
          type: "finish",
          finishReason: "stop",
        });
        return chunks;
      }
      default: {
        const _exhaustive: never = event;
        return _exhaustive;
      }
    }
  };
}

export function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("");
}
