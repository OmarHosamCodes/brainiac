import { describe, expect, test } from "bun:test";

import {
  createOrchEventToChunkMapper,
  dashboardMessagesToUIMessages,
  getLastUserText,
} from "./orch-ui-message";

describe("orch-ui-message", () => {
  test("getLastUserText reads trailing user text part", () => {
    expect(
      getLastUserText([
        { id: "1", role: "assistant", parts: [{ type: "text", text: "Hi" }] },
        { id: "2", role: "user", parts: [{ type: "text", text: "Hello world" }] },
      ]),
    ).toBe("Hello world");
  });

  test("maps Orch stream events into UI message chunks", () => {
    const mapEvent = createOrchEventToChunkMapper();
    const chunks = [
      ...mapEvent({
        type: "started",
        conversationId: "c1",
        createdConversation: true,
        userMessageId: "u1",
        assistantMessageId: "a1",
        model: "test-model",
      }),
      ...mapEvent({ type: "token", delta: "Hel" }),
      ...mapEvent({ type: "token", delta: "lo" }),
      ...mapEvent({
        type: "tool",
        tool: {
          id: "t1",
          name: "list_nodes",
          input: {},
          status: "in_progress",
          error: null,
        },
      }),
      ...mapEvent({
        type: "tool",
        tool: {
          id: "t1",
          name: "list_nodes",
          input: {},
          output: { nodes: [] },
          status: "completed",
          error: null,
        },
      }),
      ...mapEvent({
        type: "completed",
        conversation: {
          id: "c1",
          title: "Hello",
          model: "test-model",
          toolPreset: "ask",
          usageSummary: {
            latest: null,
            totals: {
              inputTokens: 0,
              cachedTokens: 0,
              outputTokens: 0,
              reasoningTokens: 0,
              totalTokens: 0,
              costUsd: 0,
            },
          },
          createdAt: "2026-07-26T00:00:00.000Z",
          updatedAt: "2026-07-26T00:00:00.000Z",
          lastMessageAt: "2026-07-26T00:00:00.000Z",
          lastMessagePreview: "Hello",
        },
        userMessage: {
          id: "u1",
          role: "user",
          content: "Hi",
          contextNodeTitles: [],
          model: "test-model",
          toolsCalled: [],
          createdAt: "2026-07-26T00:00:00.000Z",
        },
        assistantMessage: {
          id: "a1",
          role: "assistant",
          content: "Hello",
          contextNodeTitles: [],
          model: "test-model",
          toolsCalled: [],
          createdAt: "2026-07-26T00:00:00.000Z",
        },
        createdConversation: true,
        workspaceSnapshot: null,
        stopped: false,
      }),
    ];

    expect(chunks.map((chunk) => chunk.type)).toEqual([
      "start",
      "data-orchMeta",
      "text-start",
      "text-delta",
      "text-delta",
      "tool-input-start",
      "tool-input-available",
      "tool-output-available",
      "text-end",
      "data-orchCompleted",
      "finish",
    ]);
  });

  test("dashboardMessagesToUIMessages seeds text parts", () => {
    const messages = dashboardMessagesToUIMessages([
      {
        id: "u1",
        role: "user",
        content: "Hi",
        contextNodeTitles: [],
        model: null,
        toolsCalled: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
    ]);
    expect(messages[0]?.parts[0]).toEqual({ type: "text", text: "Hi", state: "done" });
  });
});
