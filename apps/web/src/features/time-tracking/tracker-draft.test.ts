import { describe, expect, test } from "bun:test";

import { createRetainedTrackerDraftAfterStop } from "./tracker-draft";

describe("createRetainedTrackerDraftAfterStop", () => {
  test("keeps the complete working context after Stop", () => {
    expect(
      createRetainedTrackerDraftAfterStop({
        activeTimer: {
          projectId: "original-project",
          taskId: "original-task",
          tags: [{ id: "original-tag" }],
          isBillable: false,
        },
        previousDraft: {
          description: "Draft description",
          projectId: "selected-project",
          taskId: "selected-task",
          tagIds: ["selected-tag"],
          isBillable: true,
          syncedTimerId: "timer-1",
        },
        selectedTaskId: "confirmed-task",
        description: "Stopped entry",
      }),
    ).toEqual({
      description: "Stopped entry",
      projectId: "selected-project",
      taskId: "confirmed-task",
      tagIds: ["selected-tag"],
      isBillable: true,
      syncedTimerId: null,
    });
  });
});
