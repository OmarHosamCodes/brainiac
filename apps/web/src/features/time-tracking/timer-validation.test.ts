import { describe, expect, it } from "bun:test";

import {
  canStartAgencyTimer,
  canStopAgencyTimer,
  getAgencyTimerStartBlockedMessage,
  getAgencyTimerStopBlockedMessage,
  getAgencyTimerStopButtonPresentation,
  isAgencyLocalDraftTimer,
  resolveAgencyTimerStartProject,
  resolveAgencyTimerStopDescription,
  resolveAgencyTimerTaskRef,
} from "@/features/time-tracking/timer-validation";

const projectA = { id: "proj-a", name: "Project A" };
const projectB = { id: "proj-b", name: "Project B" };
const task = { id: "task-1", title: "Task 1" };

describe("canStartAgencyTimer", () => {
  it("allows idle start without a selected task", () => {
    expect(canStartAgencyTimer({ activeTimer: null, project: null })).toBe(true);
  });

  it("allows start with project and task", () => {
    expect(canStartAgencyTimer({ activeTimer: null, project: projectA, selectedTask: task })).toBe(
      true,
    );
  });

  it("allows switch even when active timer has no task yet", () => {
    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: null, taskTitle: null, description: "" },
        project: projectA,
      }),
    ).toBe(true);
  });

  it("allows switch when active timer has task even with empty description", () => {
    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: "task-1", taskTitle: "Task 1", description: "" },
        project: projectA,
      }),
    ).toBe(true);
  });

  it("allows start when active timer can be stopped (switch)", () => {
    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: "task-1", taskTitle: "Task 1", description: "Work" },
        project: projectA,
      }),
    ).toBe(true);
  });
});

describe("getAgencyTimerStartBlockedMessage", () => {
  it("allows idle start without a project", () => {
    expect(getAgencyTimerStartBlockedMessage({ activeTimer: null, project: null })).toBeNull();
  });
});

describe("getAgencyTimerStopBlockedMessage", () => {
  it("requires a task when the timer has no project binding", () => {
    expect(
      getAgencyTimerStopBlockedMessage({
        activeTimer: { taskId: null, taskTitle: null, description: "", projectId: "" },
        description: "",
      }),
    ).toBe("Choose a task before stopping the timer.");
  });

  it("allows stop for a project-only server timer", () => {
    expect(
      getAgencyTimerStopBlockedMessage({
        activeTimer: {
          taskId: null,
          taskTitle: null,
          description: "",
          projectId: "proj-a",
        },
        description: "Work",
      }),
    ).toBeNull();
  });
});

describe("isAgencyLocalDraftTimer", () => {
  it("detects local draft timers by id prefix", () => {
    expect(isAgencyLocalDraftTimer({ id: "agency-active-timer-local-123" })).toBe(true);
    expect(isAgencyLocalDraftTimer({ id: "agency-active-timer-123" })).toBe(false);
  });
});

describe("canStopAgencyTimer", () => {
  it("allows stop for any running timer (task optional)", () => {
    const activeTimer = { taskId: null, taskTitle: null, description: "" };

    expect(canStopAgencyTimer({ activeTimer, description: "", selectedTask: null })).toBe(true);
    expect(canStopAgencyTimer({ activeTimer, description: "Work", selectedTask: null })).toBe(true);
    expect(canStopAgencyTimer({ activeTimer, description: "Work", selectedTask: task })).toBe(true);
  });

  it("blocks stop when no timer is running", () => {
    expect(canStopAgencyTimer({ activeTimer: null, description: "Work", selectedTask: task })).toBe(
      false,
    );
  });
});

describe("resolveAgencyTimerStopDescription", () => {
  it("prefers typed description over task title", () => {
    expect(resolveAgencyTimerStopDescription("  Note  ", "Task 1")).toBe("Note");
  });

  it("falls back to task title then project name", () => {
    expect(resolveAgencyTimerStopDescription("   ", "Task 1")).toBe("Task 1");
    expect(resolveAgencyTimerStopDescription("", null, "Project A")).toBe("Project A");
    expect(resolveAgencyTimerStopDescription("", null, null)).toBe("");
  });
});

describe("getAgencyTimerStopButtonPresentation", () => {
  it("disables Stop when no timer is running", () => {
    expect(
      getAgencyTimerStopButtonPresentation({
        isPending: false,
        hasActiveTimer: false,
      }),
    ).toEqual({ label: "Stop", disabled: true });
  });

  it("shows Stop when a timer is running", () => {
    expect(
      getAgencyTimerStopButtonPresentation({
        isPending: false,
        hasActiveTimer: true,
      }),
    ).toEqual({ label: "Stop", disabled: false });
  });
});

describe("resolveAgencyTimerTaskRef", () => {
  it("prefers draft selection over active timer task so mid-run changes stick", () => {
    expect(
      resolveAgencyTimerTaskRef({
        activeTimer: { taskId: "task-1", taskTitle: "Running task", description: "" },
        selectedTaskId: "task-2",
        selectedTaskTitle: "Draft task",
      }),
    ).toEqual({ id: "task-2", title: "Draft task" });
  });

  it("falls back to draft id and title when task is absent from catalog", () => {
    expect(
      resolveAgencyTimerTaskRef({
        activeTimer: { taskId: null, taskTitle: null, description: "" },
        selectedTaskId: "task-delegated",
        selectedTaskTitle: "Planning & Analysis",
        catalogTasks: [task],
      }),
    ).toEqual({ id: "task-delegated", title: "Planning & Analysis" });
  });

  it("uses active timer task when draft has no selection", () => {
    expect(
      resolveAgencyTimerTaskRef({
        activeTimer: { taskId: "task-1", taskTitle: "Running task", description: "" },
        selectedTaskId: "",
      }),
    ).toEqual({ id: "task-1", title: "Running task" });
  });
});

describe("resolveAgencyTimerStartProject", () => {
  const projects = [projectA, projectB];

  it("returns the selected task project when one is chosen", () => {
    expect(
      resolveAgencyTimerStartProject({
        projects,
        selectedTaskProjectId: "proj-b",
      }),
    ).toEqual(projectB);
  });

  it("returns null when no task is selected", () => {
    expect(
      resolveAgencyTimerStartProject({
        projects,
        selectedTaskProjectId: null,
      }),
    ).toBeNull();
  });
});
