import { describe, expect, test } from "bun:test";

import {
  MAX_QUEUED_AGENT_MESSAGES,
  canEnqueueAgentMessage,
  cancelQueuedAgentMessage,
  dequeueAgentMessage,
  enqueueAgentMessage,
} from "./workspace-agent-message-queue";

describe("canEnqueueAgentMessage", () => {
  test("queues only while streaming and under the cap", () => {
    expect(canEnqueueAgentMessage({ isStreaming: false, queueLength: 0 })).toBe(false);
    expect(canEnqueueAgentMessage({ isStreaming: true, queueLength: 0 })).toBe(true);
    expect(
      canEnqueueAgentMessage({ isStreaming: true, queueLength: MAX_QUEUED_AGENT_MESSAGES }),
    ).toBe(false);
  });
});

describe("enqueueAgentMessage", () => {
  test("appends FIFO and ignores empty text without attachments", () => {
    const first = enqueueAgentMessage([], { text: "  hello  " });
    expect(first).toHaveLength(1);
    expect(first[0]?.text).toBe("hello");
    expect(enqueueAgentMessage(first, { text: "   " })).toEqual(first);
  });
});

describe("cancelQueuedAgentMessage", () => {
  test("removes one id", () => {
    const queued = enqueueAgentMessage([], { text: "a" });
    const id = queued[0]?.id ?? "";
    expect(cancelQueuedAgentMessage(queued, id)).toEqual([]);
  });
});

describe("dequeueAgentMessage", () => {
  test("pops the head", () => {
    const queued = enqueueAgentMessage(enqueueAgentMessage([], { text: "a" }), { text: "b" });
    const { next, rest } = dequeueAgentMessage(queued);
    expect(next?.text).toBe("a");
    expect(rest).toHaveLength(1);
    expect(rest[0]?.text).toBe("b");
  });
});
