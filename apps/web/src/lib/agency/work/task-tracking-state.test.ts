import { describe, expect, it } from "bun:test";

import { resolveTaskTrackingState } from "@/lib/agency/work/task-tracking-state";

const taskId = "task-1";
const activeTimer = { taskId: null as string | null, projectId: "proj-a" };

describe("resolveTaskTrackingState", () => {
  it("shows blueprint description without mirroring tracker edits", () => {
    const state = resolveTaskTrackingState({
      taskId,
      activeTimer: { taskId, projectId: "proj-a" },
      trackerDraft: { taskId, description: "Live tracker text" },
      blueprintDescription: "Frozen blueprint",
    });

    expect(state.description).toBe("Frozen blueprint");
    expect(state.hasDescription).toBe(true);
    expect(state.needsDescription).toBe(false);
    expect(state.canEditDescription).toBe(false);
  });

  it("warns when the linked timer still lacks a description", () => {
    const state = resolveTaskTrackingState({
      taskId,
      activeTimer: { taskId, projectId: "proj-a" },
      trackerDraft: { taskId, description: "" },
      blueprintDescription: "Blueprint only",
    });

    expect(state.needsDescription).toBe(true);
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
      trackerDescription: "",
      hasDescription: false,
      needsDescription: false,
      canEditDescription: false,
    });
  });
});
