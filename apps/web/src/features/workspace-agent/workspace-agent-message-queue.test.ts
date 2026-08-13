import { describe, expect, test } from "bun:test";

import {
  canComposerSendWhileRunning,
  shouldShowComposerSendWhileRunning,
} from "./workspace-agent-composer-send-while-running";
import {
  MAX_QUEUED_AGENT_MESSAGES,
  canEnqueueAgentMessage,
  cancelQueuedAgentMessage,
  dequeueAgentMessage,
  enqueueAgentMessage,
  nextSendAction,
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

describe("shouldShowComposerSendWhileRunning", () => {
  test("shows only while running with a handler", () => {
    expect(
      shouldShowComposerSendWhileRunning({ isRunning: true, hasSendWhileRunningHandler: true }),
    ).toBe(true);
    expect(
      shouldShowComposerSendWhileRunning({ isRunning: false, hasSendWhileRunningHandler: true }),
    ).toBe(false);
    expect(
      shouldShowComposerSendWhileRunning({ isRunning: true, hasSendWhileRunningHandler: false }),
    ).toBe(false);
  });
});

describe("canComposerSendWhileRunning", () => {
  test("requires non-empty trimmed text", () => {
    expect(canComposerSendWhileRunning("  hi  ")).toBe(true);
    expect(canComposerSendWhileRunning("   ")).toBe(false);
    expect(canComposerSendWhileRunning("")).toBe(false);
  });
});

describe("nextSendAction", () => {
  test("sends immediately when idle", () => {
    expect(nextSendAction({ isStreaming: false, queueLength: 0, text: "hi" })).toBe("send");
  });

  test("queues when streaming", () => {
    expect(nextSendAction({ isStreaming: true, queueLength: 0, text: "hi" })).toBe("queue");
  });

  test("drops empty idle sends", () => {
    expect(nextSendAction({ isStreaming: false, queueLength: 0, text: "  " })).toBe("ignore");
  });

  test("sends attachment-only when idle", () => {
    expect(
      nextSendAction({ isStreaming: false, queueLength: 0, text: "  ", attachmentsLength: 1 }),
    ).toBe("send");
  });

  test("ignores attachment-only while streaming", () => {
    expect(
      nextSendAction({ isStreaming: true, queueLength: 0, text: "  ", attachmentsLength: 1 }),
    ).toBe("ignore");
  });

  test("queues text with attachments while streaming", () => {
    expect(
      nextSendAction({ isStreaming: true, queueLength: 0, text: "hi", attachmentsLength: 1 }),
    ).toBe("queue");
  });
});
