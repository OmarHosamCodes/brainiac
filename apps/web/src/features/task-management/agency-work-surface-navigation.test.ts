import { describe, expect, it } from "bun:test";

import {
  normalizeAgencyWorkSurfaceTaskSelection,
  selectAgencyWorkSurfaceTask,
} from "./agency-work-surface-navigation";

describe("Agency work-surface task navigation", () => {
  it("keeps the My Tasks table selected when no task is present", () => {
    const current = new URLSearchParams("section=work&tab=my-tasks");
    expect(normalizeAgencyWorkSurfaceTaskSelection(current)).toBeNull();
  });

  it("normalizes a task selected from another tab to My Tasks", () => {
    const next = normalizeAgencyWorkSurfaceTaskSelection(
      new URLSearchParams("section=work&tab=done&task=task-1"),
    );

    expect(next?.toString()).toBe("section=work&tab=my-tasks&task=task-1");
  });

  it("opens a task in My Tasks and retains unrelated query state", () => {
    const next = selectAgencyWorkSurfaceTask(
      new URLSearchParams("section=work&tab=delegated&filter=mine"),
      "task-1",
    );

    expect(next.toString()).toBe("section=work&tab=my-tasks&filter=mine&task=task-1");
  });

  it("closes a task thread without discarding the My Tasks location", () => {
    const next = selectAgencyWorkSurfaceTask(
      new URLSearchParams("section=work&tab=my-tasks&filter=mine&task=task-1"),
      "",
    );

    expect(next.toString()).toBe("section=work&tab=my-tasks&filter=mine");
  });
});
