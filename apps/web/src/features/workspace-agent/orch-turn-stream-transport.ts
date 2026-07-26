import type { AgentChatTurnInput } from "@orch/agent/types";
import type { ChatTransport } from "ai";

import { streamAgentChatTurn } from "@/features/workspace-agent/agent-turn-stream";
import {
  createOrchEventToChunkMapper,
  getLastUserText,
  type OrchUIMessage,
  type OrchUIMessageChunk,
} from "@/features/workspace-agent/orch-ui-message";

export type OrchTurnTransportBody = Omit<AgentChatTurnInput, "content">;

export class OrchTurnStreamTransport implements ChatTransport<OrchUIMessage> {
  async sendMessages({
    messages,
    abortSignal,
    body,
  }: Parameters<ChatTransport<OrchUIMessage>["sendMessages"]>[0]): Promise<
    ReadableStream<OrchUIMessageChunk>
  > {
    const content = getLastUserText(messages);
    if (!content) {
      throw new Error("Message is empty.");
    }

    const orchBody = (body ?? {}) as OrchTurnTransportBody;
    const input: AgentChatTurnInput = {
      ...orchBody,
      content,
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
