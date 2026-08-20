import { describe, expect, test } from "bun:test";

import { canEditAgencyProjectTask } from "./task-edit-authz";

describe("canEditAgencyProjectTask", () => {
  test("allows owner even when not assigned", () => {
    expect(
      canEditAgencyProjectTask({
        assignedToTeam: false,
        assigneeUserIds: ["a"],
        actorUserId: "owner",
        actorRole: "owner",
      }),
    ).toBe(true);
  });

  test("allows editor even when not assigned", () => {
    expect(
      canEditAgencyProjectTask({
        assignedToTeam: false,
        assigneeUserIds: ["a"],
        actorUserId: "editor",
        actorRole: "editor",
      }),
    ).toBe(true);
  });

  test("allows listed assignee with viewer role", () => {
    expect(
      canEditAgencyProjectTask({
        assignedToTeam: false,
        assigneeUserIds: ["viewer"],
        actorUserId: "viewer",
        actorRole: "viewer",
      }),
    ).toBe(true);
  });

  test("allows any viewer when assigned to team", () => {
    expect(
      canEditAgencyProjectTask({
        assignedToTeam: true,
        assigneeUserIds: [],
        actorUserId: "viewer",
        actorRole: "viewer",
      }),
    ).toBe(true);
  });

  test("denies viewer who is not assigned", () => {
    expect(
      canEditAgencyProjectTask({
        assignedToTeam: false,
        assigneeUserIds: ["a"],
        actorUserId: "viewer",
        actorRole: "viewer",
      }),
    ).toBe(false);
  });
});
