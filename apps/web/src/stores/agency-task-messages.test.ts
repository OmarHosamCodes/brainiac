import { describe, expect, it } from "bun:test";

import { mergeListWithOverlay, createEmptyListOverlay } from "@/lib/utils/agency-optimistic-merge";
import {
  buildAgentPendingMessage,
  isAgentPendingMessageId,
} from "@/lib/utils/agency-thread-motion";

describe("agency-task-messages helpers", () => {
  it("marks agent pending ids", () => {
    const pending = buildAgentPendingMessage("team-1", "task-1");
    expect(isAgentPendingMessageId(pending.id)).toBe(true);
    expect(isAgentPendingMessageId("agency-task-message-123")).toBe(false);
  });

  it("builds agent pending message as agent sender", () => {
    const pending = buildAgentPendingMessage("team-1", "task-1");
    expect(pending.senderType).toBe("agent");
    expect(pending.userName).toBe("Agent");
    expect(pending.content).toBe("");
  });
});

describe("optimistic task message attachments", () => {
  it("prepends attachment-bearing upserts in desc-ordered merge", () => {
    const serverItems = [
      { id: "msg-2", content: "older" },
      { id: "msg-1", content: "newer" },
    ];
    const overlay = createEmptyListOverlay<{
      id: string;
      content: string;
      attachments?: Array<{ id: string; fileName: string }>;
    }>();
    overlay.upserts["opt-1"] = {
      id: "opt-1",
      content: "pending",
      attachments: [{ id: "att-1", fileName: "shot.png" }],
    };

    const merged = mergeListWithOverlay(serverItems, overlay);
    expect(merged[0]?.id).toBe("opt-1");
    expect(merged[0]?.attachments).toHaveLength(1);
  });
});
