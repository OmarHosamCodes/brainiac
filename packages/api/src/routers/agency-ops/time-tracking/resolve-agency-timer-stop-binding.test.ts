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

  test("honors mid-run task change on the same project", () => {
    expect(
      resolveAgencyTimerStopBinding({
        activeProjectId: "project-a",
        activeTaskId: "task-a",
        inputTaskId: "task-b",
        inputTaskProjectId: "project-a",
      }),
    ).toEqual({ projectId: "project-a", taskId: "task-b" });
  });

  test("honors mid-run cross-project task change", () => {
    expect(
      resolveAgencyTimerStopBinding({
        activeProjectId: "project-a",
        activeTaskId: "task-a",
        inputTaskId: "task-b",
        inputTaskProjectId: "project-b",
      }),
    ).toEqual({ projectId: "project-b", taskId: "task-b" });
  });

  test("falls back to active task when no input task is provided", () => {
    expect(
      resolveAgencyTimerStopBinding({
        activeProjectId: "project-a",
        activeTaskId: "task-a",
      }),
    ).toEqual({ projectId: "project-a", taskId: "task-a" });
  });

  test("returns null task when neither input nor active has a task", () => {
    expect(
      resolveAgencyTimerStopBinding({
        activeProjectId: "project-a",
        activeTaskId: null,
      }),
    ).toEqual({ projectId: "project-a", taskId: null });
  });

  test("returns null binding when the timer is still unbound", () => {
    expect(
      resolveAgencyTimerStopBinding({
        activeProjectId: null,
        activeTaskId: null,
      }),
    ).toEqual({ projectId: null, taskId: null });
  });
});
