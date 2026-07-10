import { describe, expect, test } from "bun:test";

import {
  buildDashboardConversationDeletionResult,
  buildDashboardConversationTitle,
  buildDashboardMessagePreview,
  normalizeDashboardConversationTitle,
} from "./conversation-contracts";

describe("dashboard conversation contracts", () => {
  test("creates an append title from the first user turn", () => {
    expect(buildDashboardConversationTitle("  Plan the launch  ")).toBe("Plan the launch");
    expect(buildDashboardConversationTitle("   ")).toBe("New conversation");
  });

  test("normalizes rename titles and message previews", () => {
    expect(normalizeDashboardConversationTitle("  Renamed thread  ")).toBe("Renamed thread");
    expect(buildDashboardMessagePreview("  first\nsecond\tthird  ")).toBe("first second third");
    expect(buildDashboardMessagePreview("   ")).toBeNull();
  });

  test("builds the delete command result", () => {
    expect(buildDashboardConversationDeletionResult("conversation-1")).toEqual({
      deleted: true,
      conversationId: "conversation-1",
    });
  });
});
