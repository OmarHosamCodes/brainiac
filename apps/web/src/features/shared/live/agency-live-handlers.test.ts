import { describe, expect, test } from "bun:test";
import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";
import { QueryClient } from "@tanstack/react-query";

import { useAgencyOptimisticStore } from "@/features/shared/stores/agency-optimistic";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import { bindQueryClient } from "@/lib/query-client";
import { applyViewerTimerUpdated } from "./agency-live-handlers";

describe("viewer timer live reconciliation", () => {
  test("hydrates Zustand with the full timer and ignores older pub/sub events", () => {
    bindQueryClient(new QueryClient());
    const teamId = "timer-live-test-team";
    const timestamp = "2026-07-18T09:30:00.000Z";
    const timer = {
      id: "timer-live-1",
      teamId,
      userId: "user-1",
      projectId: "project-1",
      taskId: "task-1",
      taskTitle: "Confirmed task",
      projectName: "Orch",
      description: "Confirmed description",
      isBillable: false,
      tags: [
        {
          id: "tag-1",
          teamId,
          name: "Realtime",
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      links: [],
      startedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const confirmedEvent: Extract<AgencyLiveEvent, { type: "timer.updated" }> = {
      type: "timer.updated",
      teamId,
      userId: "user-1",
      updatedAt: "2026-07-18T09:30:01.000Z",
      timer,
    };

    applyViewerTimerUpdated(confirmedEvent);

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toEqual(timer);
    expect(useAgencyTimeTrackingStore.getState().trackerDraftsByTeam[teamId]).toMatchObject({
      description: "Confirmed description",
      projectId: "project-1",
      taskId: "task-1",
      tagIds: ["tag-1"],
      isBillable: false,
      syncedTimerId: "timer-live-1",
    });

    applyViewerTimerUpdated({
      ...confirmedEvent,
      updatedAt: "2026-07-18T09:29:59.000Z",
      timer: { ...timer, taskId: "stale-task", taskTitle: "Stale task" },
    });

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]?.taskId).toBe("task-1");

    applyViewerTimerUpdated({
      ...confirmedEvent,
      updatedAt: "2026-07-18T09:30:01.500Z",
      timer: {
        ...timer,
        projectId: "project-2",
        taskId: "task-2",
        taskTitle: "Authoritative task",
        isBillable: true,
        tags: [],
      },
    });

    expect(useAgencyTimeTrackingStore.getState().trackerDraftsByTeam[teamId]).toMatchObject({
      projectId: "project-2",
      taskId: "task-2",
      tagIds: [],
      isBillable: true,
    });

    applyViewerTimerUpdated({
      ...confirmedEvent,
      updatedAt: "2026-07-18T09:30:02.000Z",
      timer: null,
    });

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toBeNull();
    expect(
      useAgencyTimeTrackingStore.getState().trackerDraftsByTeam[teamId]?.syncedTimerId,
    ).toBeNull();
  });
});
