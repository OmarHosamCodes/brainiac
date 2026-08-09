import { describe, expect, test } from "bun:test";

import { buildActiveTimerTaskUpdateInput } from "./active-timer-task-update";

describe("buildActiveTimerTaskUpdateInput", () => {
  test("omits draft projectId when a task is selected", () => {
    expect(
      buildActiveTimerTaskUpdateInput({
        teamId: "team-1",
        taskId: "task-b",
        draftProjectId: "proj-a",
      }),
    ).toEqual({ teamId: "team-1", taskId: "task-b" });
  });

  test("sends projectId only when clearing the task", () => {
    expect(
      buildActiveTimerTaskUpdateInput({
        teamId: "team-1",
        taskId: "",
        draftProjectId: "proj-a",
      }),
    ).toEqual({ teamId: "team-1", taskId: null, projectId: "proj-a" });
  });

  test("allows fully unbound timer", () => {
    expect(
      buildActiveTimerTaskUpdateInput({
        teamId: "team-1",
        taskId: null,
        draftProjectId: "  ",
      }),
    ).toEqual({ teamId: "team-1", taskId: null });
  });
});
