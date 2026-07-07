import { describe, expect, it } from "bun:test";

import {
  canStartAgencyTimer,
  canStopAgencyTimer,
  resolveAgencyTimerStartProject,
} from "@/lib/agency/work/timer-validation";

const projectA = { id: "proj-a", name: "Project A" };
const projectB = { id: "proj-b", name: "Project B" };
const task = { id: "task-1", title: "Task 1" };

describe("canStartAgencyTimer", () => {
  it("allows start with project only", () => {
    expect(canStartAgencyTimer({ activeTimer: null, project: projectA })).toBe(true);
  });

  it("blocks start when a timer is already active", () => {
    expect(
      canStartAgencyTimer({
        activeTimer: { taskId: null, taskTitle: null, description: "" },
        project: projectA,
      }),
    ).toBe(false);
  });

  it("blocks start when no project is available", () => {
    expect(canStartAgencyTimer({ activeTimer: null, project: null })).toBe(false);
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
