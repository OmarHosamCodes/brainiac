import { describe, expect, it } from "bun:test";

import {
  canStartAgencyTimer,
  canStopAgencyTimer,
  getAgencyTimerStopButtonPresentation,
  resolveAgencyTimerStartProject,
  resolveAgencyTimerTaskRef,
} from "@/features/time-tracking/timer-validation";

const projectA = { id: "proj-a", name: "Project A" };
const projectB = { id: "proj-b", name: "Project B" };
const task = { id: "task-1", title: "Task 1" };

describe("canStartAgencyTimer", () => {
  it("allows start with project and task", () => {
    expect(
      canStartAgencyTimer({ activeTimer: null, project: projectA, selectedTask: task }),
    ).toBe(true);
  });

  it("blocks start without a selected task", () => {
    expect(canStartAgencyTimer({ activeTimer: null, project: projectA })).toBe(false);
  });

  it("blocks start when active timer is not stoppable", () => {
    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: null, taskTitle: null, description: "" },
        project: projectA,
      }),
    ).toBe(false);

    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: "task-1", taskTitle: "Task 1", description: "" },
        project: projectA,
      }),
    ).toBe(false);

    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: null, taskTitle: null, description: "Work" },
        project: projectA,
      }),
    ).toBe(false);
  });

  it("allows start when active timer can be stopped (switch)", () => {
    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: "task-1", taskTitle: "Task 1", description: "Work" },
        project: projectA,
      }),
    ).toBe(true);
  });

  it("allows start when draft description and task make active timer stoppable", () => {
    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: null, taskTitle: null, description: "" },
        project: projectA,
        description: "Work",
        selectedTask: task,
      }),
    ).toBe(true);
  });

  it("blocks start when no project is available", () => {
    expect(
      canStartAgencyTimer({ activeTimer: null, project: null, selectedTask: task }),
    ).toBe(false);
  });
});

describe("canStopAgencyTimer", () => {
  it("requires description and task", () => {
    const activeTimer = { taskId: null, taskTitle: null, description: "" };

    expect(canStopAgencyTimer({ activeTimer, description: "", selectedTask: null })).toBe(false);
    expect(canStopAgencyTimer({ activeTimer, description: "Work", selectedTask: null })).toBe(
      false,
    );
    expect(canStopAgencyTimer({ activeTimer, description: "Work", selectedTask: task })).toBe(true);
  });

  it("allows stop when active timer already has a task", () => {
    expect(
      canStopAgencyTimer({
        activeTimer: { taskId: "task-1", taskTitle: "Task 1", description: "" },
        description: "Work",
        selectedTask: null,
      }),
    ).toBe(true);
  });

  it("allows stop for draft task not in assignee-filtered catalog", () => {
    expect(
      canStopAgencyTimer({
        activeTimer: { taskId: null, taskTitle: null, description: "" },
        description: "Delegated work",
        selectedTaskId: "task-delegated",
        selectedTaskTitle: "Planning & Analysis",
      }),
    ).toBe(true);
  });
});

describe("getAgencyTimerStopButtonPresentation", () => {
  it("keeps Choose task clickable so the tracker can open the chooser", () => {
    expect(
      getAgencyTimerStopButtonPresentation({
        isPending: false,
        canStop: false,
        descriptionTrimmed: true,
      }),
    ).toEqual({ label: "Choose task", disabled: false });
  });

  it("disables Add details until a description exists", () => {
    expect(
      getAgencyTimerStopButtonPresentation({
        isPending: false,
        canStop: false,
        descriptionTrimmed: false,
      }),
    ).toEqual({ label: "Add details", disabled: true });
  });

  it("shows Stop when the timer can be saved", () => {
    expect(
      getAgencyTimerStopButtonPresentation({
        isPending: false,
        canStop: true,
        descriptionTrimmed: true,
      }),
    ).toEqual({ label: "Stop", disabled: false });
  });
});

describe("resolveAgencyTimerTaskRef", () => {
  it("prefers active timer task over draft selection", () => {
    expect(
      resolveAgencyTimerTaskRef({
        activeTimer: { taskId: "task-1", taskTitle: "Running task", description: "" },
        selectedTaskId: "task-2",
        selectedTaskTitle: "Draft task",
      }),
    ).toEqual({ id: "task-1", title: "Running task" });
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
});

describe("resolveAgencyTimerStartProject", () => {
  const projects = [projectA, projectB];

  it("prefers selected task project over draft and recent entry", () => {
    expect(
      resolveAgencyTimerStartProject({
        projects,
        selectedTaskProjectId: "proj-b",
        draftProjectId: "proj-a",
        recentEntryProjectId: "proj-a",
      }),
    ).toEqual(projectB);
  });

  it("falls back to draft then recent entry then first project", () => {
    expect(
      resolveAgencyTimerStartProject({
        projects,
        selectedTaskProjectId: null,
        draftProjectId: "proj-b",
        recentEntryProjectId: "proj-a",
      }),
    ).toEqual(projectB);

    expect(
      resolveAgencyTimerStartProject({
        projects,
        selectedTaskProjectId: null,
        draftProjectId: "",
        recentEntryProjectId: "proj-b",
      }),
    ).toEqual(projectB);

    expect(
      resolveAgencyTimerStartProject({
        projects,
        selectedTaskProjectId: null,
        draftProjectId: "",
        recentEntryProjectId: null,
      }),
    ).toEqual(projectA);
  });
});
