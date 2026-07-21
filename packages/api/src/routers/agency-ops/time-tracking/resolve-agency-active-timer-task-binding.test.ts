import { describe, expect, test } from "bun:test";

import { resolveAgencyActiveTimerTaskBinding } from "./resolve-agency-active-timer-task-binding";

describe("resolveAgencyActiveTimerTaskBinding", () => {
  test("uses task project when a task is selected", () => {
    expect(
      resolveAgencyActiveTimerTaskBinding({
        taskId: "task-1",
        taskProjectId: "proj-1",
        projectId: "ignored",
      }),
    ).toEqual({ projectId: "proj-1", taskId: "task-1" });
  });

  test("allows unbound timer with null project", () => {
    expect(
      resolveAgencyActiveTimerTaskBinding({
        taskId: null,
        projectId: null,
      }),
    ).toEqual({ projectId: null, taskId: null });
  });

  test("allows project-only binding without a task", () => {
    expect(
      resolveAgencyActiveTimerTaskBinding({
        taskId: null,
        projectId: "proj-2",
      }),
    ).toEqual({ projectId: "proj-2", taskId: null });
  });

  test("trims empty projectId to null when unbound", () => {
    expect(
      resolveAgencyActiveTimerTaskBinding({
        taskId: null,
        projectId: "  ",
      }),
    ).toEqual({ projectId: null, taskId: null });
  });
});
