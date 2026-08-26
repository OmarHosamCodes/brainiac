import { describe, expect, test } from "bun:test";

import {
  composerStateFromExistingTask,
  composerSubmitCopy,
  composerSubmitKind,
  isRedundantMyTasksAdd,
  nextAssigneesForComposerSubmit,
  nextPillsAfterAdd,
  withActorMember,
} from "./agency-my-tasks-add";

describe("withActorMember", () => {
  test("prepends the actor when the roster has not loaded them", () => {
    expect(
      withActorMember([{ userId: "b", userName: "Bee" }], { userId: "a", userName: "Me" }),
    ).toEqual([
      { userId: "a", userName: "Me" },
      { userId: "b", userName: "Bee" },
    ]);
  });

  test("keeps the roster when the actor is already present", () => {
    const members = [{ userId: "a", userName: "Me" }];
    expect(withActorMember(members, { userId: "a", userName: "Me" })).toEqual(members);
  });
});

describe("nextPillsAfterAdd", () => {
  test("turns on Open so a newly assigned task is visible", () => {
    expect([...nextPillsAfterAdd(new Set(["done"]), "open")]).toEqual(["done", "open"]);
  });

  test("turns on Done when the added task is already done", () => {
    expect([...nextPillsAfterAdd(new Set(["open"]), "done")]).toEqual(["open", "done"]);
  });
});

describe("isRedundantMyTasksAdd", () => {
  const existing = {
    assignedToTeam: false,
    assignees: [{ userId: "me" }, { userId: "sam" }],
  };

  test("skips the network when the actor is already on the task", () => {
    expect(
      isRedundantMyTasksAdd({
        existing,
        nextAssignedToTeam: false,
        nextAssigneeUserIds: ["me", "sam"],
        estimateMinutes: null,
        billableRateAmount: null,
        currency: "USD",
        projectBillableRateAmount: null,
        clientBillableRateAmount: null,
        clientCurrency: "USD",
      }),
    ).toBe(true);
  });

  test("updates when a new assignee or estimate is included", () => {
    expect(
      isRedundantMyTasksAdd({
        existing,
        nextAssignedToTeam: false,
        nextAssigneeUserIds: ["me", "sam", "pat"],
        estimateMinutes: null,
        billableRateAmount: null,
        currency: "USD",
        projectBillableRateAmount: null,
        clientBillableRateAmount: null,
        clientCurrency: "USD",
      }),
    ).toBe(false);
    expect(
      isRedundantMyTasksAdd({
        existing,
        nextAssignedToTeam: false,
        nextAssigneeUserIds: ["me", "sam"],
        estimateMinutes: 60,
      }),
    ).toBe(false);
  });

  test("does not skip an uncached task", () => {
    expect(
      isRedundantMyTasksAdd({
        existing: null,
        nextAssignedToTeam: false,
        nextAssigneeUserIds: ["me"],
        estimateMinutes: null,
        billableRateAmount: null,
        currency: "USD",
        projectBillableRateAmount: null,
        clientBillableRateAmount: null,
        clientCurrency: "USD",
      }),
    ).toBe(false);
  });

  test("update is redundant only when assignees and estimate match exactly", () => {
    expect(
      isRedundantMyTasksAdd({
        existing: { ...existing, estimateMinutes: 60 },
        nextAssignedToTeam: false,
        nextAssigneeUserIds: ["me", "sam"],
        estimateMinutes: 60,
        kind: "update",
      }),
    ).toBe(true);
    expect(
      isRedundantMyTasksAdd({
        existing: { ...existing, estimateMinutes: 60 },
        nextAssignedToTeam: false,
        nextAssigneeUserIds: ["me"],
        estimateMinutes: 60,
        kind: "update",
      }),
    ).toBe(false);
  });
});

describe("composerSubmitKind", () => {
  const existing = {
    assignedToTeam: false,
    assignees: [{ userId: "me" }],
  };

  test("is add until a task is chosen", () => {
    expect(
      composerSubmitKind({
        composerTaskId: "",
        actorUserId: "me",
        railHasTask: false,
        existing: null,
      }),
    ).toBe("add");
  });

  test("is update when the task is already on My Tasks", () => {
    expect(
      composerSubmitKind({
        composerTaskId: "t1",
        actorUserId: "me",
        railHasTask: true,
        existing,
      }),
    ).toBe("update");
    expect(
      composerSubmitKind({
        composerTaskId: "t1",
        actorUserId: "me",
        railHasTask: false,
        existing,
      }),
    ).toBe("update");
  });

  test("is add when picking someone else's task", () => {
    expect(
      composerSubmitKind({
        composerTaskId: "t1",
        actorUserId: "me",
        railHasTask: false,
        existing: { assignedToTeam: false, assignees: [{ userId: "sam" }] },
      }),
    ).toBe("add");
  });

  test("labels Update when the task is already on the list", () => {
    expect(composerSubmitCopy("update").label).toBe("Update");
    expect(composerSubmitCopy("add").label).toBe("Add");
  });
});

describe("composerStateFromExistingTask", () => {
  test("hydrates assignees and estimate for update", () => {
    expect(
      composerStateFromExistingTask(
        {
          assignedToTeam: false,
          assignees: [{ userId: "sam" }, { userId: "me" }],
          estimateMinutes: 90,
        },
        "me",
      ),
    ).toEqual({
      assignedToTeam: false,
      assigneeUserIds: ["sam", "me"],
      estimateMinutes: 90,
    });
  });
});

describe("nextAssigneesForComposerSubmit", () => {
  test("add merges onto existing assignees", () => {
    expect(
      nextAssigneesForComposerSubmit({
        kind: "add",
        existing: { assignedToTeam: false, assignees: [{ userId: "sam" }] },
        composerAssignedToTeam: false,
        composerAssigneeIds: ["me"],
        actorUserId: "me",
      }),
    ).toEqual({ assignedToTeam: false, assigneeUserIds: ["sam", "me"] });
  });

  test("update replaces assignees from the composer", () => {
    expect(
      nextAssigneesForComposerSubmit({
        kind: "update",
        existing: { assignedToTeam: false, assignees: [{ userId: "sam" }, { userId: "me" }] },
        composerAssignedToTeam: false,
        composerAssigneeIds: ["me"],
        actorUserId: "me",
      }),
    ).toEqual({ assignedToTeam: false, assigneeUserIds: ["me"] });
  });
});
