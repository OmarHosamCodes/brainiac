import { describe, expect, test } from "bun:test";

import { canPostTaskMessage } from "./task-message-authz";

describe("canPostTaskMessage", () => {
  test("allows any actor when assigned to team", () => {
    expect(
      canPostTaskMessage({
        assignedToTeam: true,
        assigneeUserIds: [],
        actorUserId: "anyone",
      }),
    ).toBe(true);
  });

  test("allows listed assignee", () => {
    expect(
      canPostTaskMessage({
        assignedToTeam: false,
        assigneeUserIds: ["a", "b"],
        actorUserId: "b",
      }),
    ).toBe(true);
  });

  test("denies creator who is not assigned", () => {
    expect(
      canPostTaskMessage({
        assignedToTeam: false,
        assigneeUserIds: ["assignee"],
        actorUserId: "creator",
      }),
    ).toBe(false);
  });

  test("denies when no assignees and not team-assigned", () => {
    expect(
      canPostTaskMessage({
        assignedToTeam: false,
        assigneeUserIds: [],
        actorUserId: "anyone",
      }),
    ).toBe(false);
  });
});
