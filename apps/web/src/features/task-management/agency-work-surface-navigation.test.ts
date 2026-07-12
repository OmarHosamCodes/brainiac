import { describe, expect, it } from "bun:test";

import {
  normalizeAgencyWorkSurfaceTaskSelection,
  openAgencyWorkSurfaceTasks,
  selectAgencyWorkSurfaceTask,
} from "./agency-work-surface-navigation";
import { normalizeAgencyWorkSurfaceTabParam, parseAgencyWorkSurfaceTab } from "./agency-work";

describe("Agency work-surface tab parse", () => {
  it("maps legacy tabs to tasks", () => {
    expect(parseAgencyWorkSurfaceTab("my-tasks")).toBe("tasks");
    expect(parseAgencyWorkSurfaceTab("done")).toBe("tasks");
    expect(parseAgencyWorkSurfaceTab("delegated")).toBe("tasks");
    expect(parseAgencyWorkSurfaceTab("tasks")).toBe("tasks");
    expect(parseAgencyWorkSurfaceTab("sessions")).toBe("sessions");
    expect(parseAgencyWorkSurfaceTab(null)).toBe("sessions");
  });

  it("rewrites legacy tab query params", () => {
    const next = normalizeAgencyWorkSurfaceTabParam(
      new URLSearchParams("section=work&tab=done&task=task-1"),
    );
    expect(next?.toString()).toBe("section=work&tab=tasks&task=task-1");
  });
});

describe("Agency work-surface task navigation", () => {
  it("keeps the Tasks board selected when no task is present", () => {
    const current = new URLSearchParams("section=work&tab=tasks");
    expect(normalizeAgencyWorkSurfaceTaskSelection(current)).toBeNull();
  });

  it("normalizes a task selected from Sessions to Tasks", () => {
    const next = normalizeAgencyWorkSurfaceTaskSelection(
      new URLSearchParams("section=work&tab=sessions&task=task-1"),
    );

    expect(next?.toString()).toBe("section=work&tab=tasks&task=task-1");
  });

  it("opens a task on Tasks and retains unrelated query state", () => {
    const next = selectAgencyWorkSurfaceTask(
      new URLSearchParams("section=work&tab=sessions&filter=mine"),
      "task-1",
    );

    expect(next.toString()).toBe("section=work&tab=tasks&filter=mine&task=task-1");
  });

  it("closes a task thread without discarding the Tasks location", () => {
    const next = selectAgencyWorkSurfaceTask(
      new URLSearchParams("section=work&tab=tasks&filter=mine&task=task-1"),
      "",
    );

    expect(next.toString()).toBe("section=work&tab=tasks&filter=mine");
  });

  it("opens Tasks without selecting a task thread", () => {
    const next = openAgencyWorkSurfaceTasks(
      new URLSearchParams("section=work&tab=sessions&task=task-1&filter=mine"),
    );

    expect(next.toString()).toBe("section=work&tab=tasks&filter=mine");
  });
});
