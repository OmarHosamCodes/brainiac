import { describe, expect, it } from "bun:test";

import {
  normalizeAgencyWorkSurfaceTaskSelection,
  openAgencyWorkSurfaceTasks,
  selectAgencyWorkSurfaceTask,
} from "./agency-work-surface-navigation";
import { normalizeAgencyWorkSurfaceQueryParams } from "./agency-work";

describe("Agency work-surface query normalize", () => {
  it("strips obsolete tab, task, and filter params", () => {
    const next = normalizeAgencyWorkSurfaceQueryParams(
      new URLSearchParams("section=work&tab=tasks&task=task-1&filter=mine"),
    );
    expect(next?.toString()).toBe("section=work");
  });

  it("strips legacy my-tasks style tabs", () => {
    const next = normalizeAgencyWorkSurfaceQueryParams(
      new URLSearchParams("section=work&tab=done&task=task-1"),
    );
    expect(next?.toString()).toBe("section=work");
  });

  it("returns null when already clean", () => {
    expect(
      normalizeAgencyWorkSurfaceQueryParams(new URLSearchParams("section=work")),
    ).toBeNull();
  });
});

describe("Agency work-surface task navigation helpers (kept for unwired board)", () => {
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
