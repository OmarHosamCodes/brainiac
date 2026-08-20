import { describe, expect, test } from "bun:test";

import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";

import {
  buildThreadOrchAskPrompt,
  composeTaskMessageWithReply,
  contentMentionsOrch,
  ensureOrchMentionInDraft,
  parseTaskMessageReplyQuote,
  stripOrchMentions,
  taskMessageScopeLabel,
  truncateTaskMessagePreview,
} from "./agency-task-thread-message-actions";

const baseMessage: AgencyTaskMessage = {
  id: "msg-1",
  teamId: "team-1",
  taskId: "task-1",
  userId: "user-1",
  userName: "Sam",
  userAvatar: null,
  content: "Ship the cover slide for task threads today",
  createdAt: "2026-08-20T10:00:00.000Z",
  attachments: [],
};

describe("task message action helpers", () => {
  test("truncates long previews", () => {
    expect(truncateTaskMessagePreview("a".repeat(10), 8)).toBe("aaaaaaa…");
  });

  test("builds scope label from author and content", () => {
    expect(taskMessageScopeLabel(baseMessage)).toBe(
      "Sam · Ship the cover slide for task threads today",
    );
  });

  test("composes and parses WhatsApp-style reply quotes", () => {
    const composed = composeTaskMessageWithReply({
      content: "On it",
      replyTo: baseMessage,
    });
    expect(composed).toBe("> @Sam: Ship the cover slide for task threads today\n\nOn it");
    expect(parseTaskMessageReplyQuote(composed)).toEqual({
      authorName: "Sam",
      preview: "Ship the cover slide for task threads today",
      body: "On it",
    });
  });

  test("detects and strips @Orch mentions", () => {
    expect(contentMentionsOrch("hey @Orch what next")).toBe(true);
    expect(contentMentionsOrch("orch without at")).toBe(false);
    expect(ensureOrchMentionInDraft("help")).toBe("help @Orch ");
    expect(stripOrchMentions("hey @Orch what next")).toBe("hey what next");
  });

  test("builds in-thread Orch ask prompt", () => {
    expect(
      buildThreadOrchAskPrompt({
        taskTitle: "1 bet card",
        userContent: "@Orch summarize",
        replyTo: baseMessage,
      }),
    ).toContain("Task: 1 bet card");
  });
});
