import { describe, expect, test } from "bun:test";

import { normalizeTaskTitle } from "../../schemas/agency-ops";
import { planAssigneeMerge, preferMemberStatus } from "./task-title";

describe("normalizeTaskTitle", () => {
  test("trims, lowercases, and collapses whitespace", () => {
    expect(normalizeTaskTitle("  UX   Improvement  ")).toBe("ux improvement");
  });
});

describe("preferMemberStatus", () => {
  test("keeps the more progressed status", () => {
    expect(preferMemberStatus("open", "in_progress")).toBe("in_progress");
    expect(preferMemberStatus("in_progress", "done")).toBe("done");
    expect(preferMemberStatus("done", "open")).toBe("done");
    expect(preferMemberStatus("open", "open")).toBe("open");
  });
});

describe("planAssigneeMerge", () => {
  test("is noop when existing task is already team-assigned", () => {
    expect(
      planAssigneeMerge({
        existingAssignedToTeam: true,
        existingAssigneeIds: [],
        wantAssignedToTeam: false,
        wantAssigneeIds: ["u1"],
      }),
    ).toEqual({ kind: "noop" });
  });

  test("promotes to team when either side wants team assignment", () => {
    expect(
      planAssigneeMerge({
        existingAssignedToTeam: false,
        existingAssigneeIds: ["u1"],
        wantAssignedToTeam: true,
        wantAssigneeIds: [],
      }),
    ).toEqual({ kind: "team" });
  });

  test("adds only missing assignees", () => {
    expect(
      planAssigneeMerge({
        existingAssignedToTeam: false,
        existingAssigneeIds: ["u1"],
        wantAssignedToTeam: false,
        wantAssigneeIds: ["u1", "u2"],
      }),
    ).toEqual({ kind: "add", userIds: ["u2"] });
  });

  test("is noop when all assignees already present", () => {
    expect(
      planAssigneeMerge({
        existingAssignedToTeam: false,
        existingAssigneeIds: ["u1", "u2"],
        wantAssignedToTeam: false,
        wantAssigneeIds: ["u1"],
      }),
    ).toEqual({ kind: "noop" });
  });
});
