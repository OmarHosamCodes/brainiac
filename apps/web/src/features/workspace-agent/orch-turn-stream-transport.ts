import type { AgentChatTurnInput, AgentTextAttachment } from "@orch/agent/types";
import type { ChatTransport } from "ai";

import { streamAgentChatTurn } from "@/features/workspace-agent/agent-turn-stream";
import {
  createOrchEventToChunkMapper,
  getLastUserText,
  type OrchUIMessage,
  type OrchUIMessageChunk,
} from "@/features/workspace-agent/orch-ui-message";

export type OrchTurnTransportBody = Omit<AgentChatTurnInput, "content" | "attachments"> & {
  content?: string;
  attachments?: AgentTextAttachment[];
};

export class OrchTurnStreamTransport implements ChatTransport<OrchUIMessage> {
  async sendMessages({
    messages,
    abortSignal,
    body,
  }: Parameters<ChatTransport<OrchUIMessage>["sendMessages"]>[0]): Promise<
    ReadableStream<OrchUIMessageChunk>
  > {
    const orchBody = (body ?? {}) as OrchTurnTransportBody;
    const content =
      typeof orchBody.content === "string" ? orchBody.content : getLastUserText(messages);
    const attachments = orchBody.attachments ?? [];

    if (!content.trim() && attachments.length === 0) {
      throw new Error("Message is empty.");
    }

    const input: AgentChatTurnInput = {
      ...orchBody,
      content,
      attachments,
      toolPreset: orchBody.toolPreset ?? "ask",
    };

    const mapEvent = createOrchEventToChunkMapper();
    const signal = abortSignal ?? new AbortController().signal;

    return new ReadableStream<OrchUIMessageChunk>({
      async start(controller) {
        try {
          await streamAgentChatTurn(input, {
            signal,
            onEvent: (event) => {
              for (const chunk of mapEvent(event)) {
                controller.enqueue(chunk);
              }
            },
          });
          if (signal.aborted) {
            controller.enqueue({ type: "abort", reason: "user" });
          }
          controller.close();
        } catch (error) {
          const errorText =
            error instanceof Error && error.message.trim()
              ? error.message.trim()
              : "Failed to reach the agent.";
          controller.enqueue({ type: "error", errorText });
          controller.close();
        }
      },
    });
  }

  async reconnectToStream(): Promise<ReadableStream<OrchUIMessageChunk> | null> {
    return null;
  }
}
