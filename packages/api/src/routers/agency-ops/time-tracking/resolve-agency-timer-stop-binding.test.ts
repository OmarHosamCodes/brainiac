import { describe, expect, test } from "bun:test";

import { resolveAgencyTimerStopBinding } from "./resolve-agency-timer-stop-binding";

describe("resolveAgencyTimerStopBinding", () => {
  test("adopts task project when timer has no bound task", () => {
    expect(
      resolveAgencyTimerStopBinding({
        activeProjectId: "project-a",
        activeTaskId: null,
        inputTaskId: "task-b",
        inputTaskProjectId: "project-b",
      }),
    ).toEqual({ projectId: "project-b", taskId: "task-b" });
  });

  test("keeps active task when timer already has one", () => {
    expect(
      resolveAgencyTimerStopBinding({
        activeProjectId: "project-a",
        activeTaskId: "task-a",
        inputTaskId: "task-b",
        inputTaskProjectId: "project-a",
      }),
    ).toEqual({ projectId: "project-a", taskId: "task-a" });
  });

  test("rejects cross-project task when timer already has one", () => {
    expect(
      resolveAgencyTimerStopBinding({
        activeProjectId: "project-a",
        activeTaskId: "task-a",
        inputTaskId: "task-b",
        inputTaskProjectId: "project-b",
      }),
    ).toEqual({ error: "task_project_mismatch" });
  });
});
