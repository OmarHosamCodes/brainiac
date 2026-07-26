import { describe, expect, test } from "bun:test";

import { agentChatTurnStreamEventSchema } from "./types";

describe("agentChatTurnStreamEventSchema", () => {
  test("accepts token and completed events", () => {
    expect(
      agentChatTurnStreamEventSchema.parse({
        type: "token",
        delta: "Hello",
      }).type,
    ).toBe("token");

    const completed = agentChatTurnStreamEventSchema.parse({
      type: "completed",
      conversation: {
        id: "c1",
        title: "Hi",
        model: "m",
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
        lastMessagePreview: "Hi",
      },
      userMessage: {
        id: "u1",
        role: "user",
        content: "Hi",
        contextNodeTitles: [],
        model: "m",
        toolsCalled: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
      assistantMessage: {
        id: "a1",
        role: "assistant",
        content: "Hello",
        contextNodeTitles: [],
        model: "m",
        toolsCalled: [],
        createdAt: "2026-07-26T00:00:00.000Z",
      },
      createdConversation: true,
      workspaceSnapshot: null,
      stopped: false,
    });
    expect(completed.type).toBe("completed");
  });
});
