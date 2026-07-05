import { describe, expect, it } from "bun:test";

import { resolveTaskTrackingState } from "@/lib/agency/work/task-tracking-state";

const taskId = "task-1";
const activeTimer = { taskId: null as string | null, projectId: "proj-a" };

describe("resolveTaskTrackingState", () => {
  it("links row via draft task id", () => {
    const state = resolveTaskTrackingState({
      taskId,
      activeTimer,
      trackerDraft: { taskId, description: "Design review" },
    });

    expect(state.isTrackingTask).toBe(true);
    expect(state.description).toBe("Design review");
    expect(state.hasDescription).toBe(true);
    expect(state.needsDescription).toBe(false);
    expect(state.canEditDescription).toBe(true);
  });

  it("links row via active timer task id", () => {
    const state = resolveTaskTrackingState({
      taskId,
      activeTimer: { taskId, projectId: "proj-a" },
      trackerDraft: { taskId, description: "" },
    });

    expect(state.isTrackingTask).toBe(true);
    expect(state.needsDescription).toBe(true);
    expect(state.canEditDescription).toBe(true);
  });

  it("does not edit when no active timer", () => {
    const state = resolveTaskTrackingState({
      taskId,
      activeTimer: null,
      trackerDraft: { taskId, description: "Prefilled" },
    });

    expect(state.isTrackingTask).toBe(true);
    expect(state.hasDescription).toBe(true);
    expect(state.needsDescription).toBe(false);
    expect(state.canEditDescription).toBe(false);
  });

  it("returns default state for unrelated tasks", () => {
    const state = resolveTaskTrackingState({
      taskId: "other-task",
      activeTimer,
      trackerDraft: { taskId, description: "Work" },
    });

    expect(state).toEqual({
      isTrackingTask: false,
      description: "",
      hasDescription: false,
      needsDescription: false,
      canEditDescription: false,
    });
  });
});
