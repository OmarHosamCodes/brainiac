import { describe, expect, test } from "bun:test";

import type { AgencyTaskMessage } from "@orch/api/routers/agency-ops/task-messages/schemas";

import { buildAgencyTaskThreadTimeline } from "./agency-task-thread-timeline";

function msg(id: string, createdAt: string): AgencyTaskMessage {
  return {
    id,
    teamId: "t",
    taskId: "task",
    userId: "u",
    userName: "Sam",
    userAvatar: null,
    content: id,
    createdAt,
    attachments: [],
  };
}

describe("buildAgencyTaskThreadTimeline", () => {
  test("inserts day separators when the calendar day changes", () => {
    const reference = new Date(2026, 7, 20, 18, 0, 0);
    const items = buildAgencyTaskThreadTimeline(
      [
        msg("a", new Date(2026, 7, 19, 10, 0, 0).toISOString()),
        msg("b", new Date(2026, 7, 20, 9, 0, 0).toISOString()),
        msg("c", new Date(2026, 7, 20, 11, 0, 0).toISOString()),
      ],
      reference,
    );

    expect(items.map((item) => item.kind)).toEqual(["day", "message", "day", "message", "message"]);
    expect(items[0]).toMatchObject({ kind: "day", label: "Yesterday" });
    expect(items[2]).toMatchObject({ kind: "day", label: "Today" });
  });
});
