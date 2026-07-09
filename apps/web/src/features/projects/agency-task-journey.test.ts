import { describe, expect, it } from "bun:test";

import {
  dedupeAssignees,
  resolveFocusedJourneyStep,
  shouldShowJourneyAnchor,
  shouldShowJourneyAnchorForDiscovery,
  unlinkTimeEntriesFromJourneyStep,
} from "@/features/projects/agency-task-journey";
import type { AgencyProjectJourney, AgencyProjectTask } from "@/features/task-management/agency-work";

const baseTask = {
  teamId: "team-1",
  status: "open" as const,
  assignedToTeam: false,
  isWaste: false,
  createdByUserId: "u1",
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function task(
  overrides: Partial<AgencyProjectTask> &
    Pick<AgencyProjectTask, "id" | "projectId" | "title" | "taskKind">,
): AgencyProjectTask {
  return { ...baseTask, assignees: [], ...overrides };
}

describe("shouldShowJourneyAnchor", () => {
  it("hides anchor when viewer has no milestone on the project", () => {
    const anchor = task({
      id: "anchor",
      projectId: "proj-1",
      title: "Launch",
      taskKind: "journey_anchor",
    });
    const milestone = task({
      id: "ms-1",
      projectId: "proj-1",
      title: "Design",
      taskKind: "journey_milestone",
      assignees: [{ userId: "u2", userName: "Alex", userAvatar: null, status: "open" }],
    });

    expect(shouldShowJourneyAnchor(anchor, [anchor, milestone], "u1")).toBe(false);
    expect(shouldShowJourneyAnchor(anchor, [anchor, milestone], "u2")).toBe(true);
  });
});

describe("shouldShowJourneyAnchorForDiscovery", () => {
  it("shows anchor when viewer has no milestone on the project", () => {
    const anchor = task({
      id: "anchor",
      projectId: "proj-1",
      title: "Launch",
      taskKind: "journey_anchor",
    });
    const milestone = task({
      id: "ms-1",
      projectId: "proj-1",
      title: "Design",
      taskKind: "journey_milestone",
      assignees: [{ userId: "u2", userName: "Alex", userAvatar: null, status: "open" }],
    });

    expect(shouldShowJourneyAnchorForDiscovery(anchor, [anchor, milestone], "u1")).toBe(true);
    expect(shouldShowJourneyAnchorForDiscovery(anchor, [anchor, milestone], "u2")).toBe(false);
  });
});

describe("dedupeAssignees", () => {
  it("keeps the first assignee per user id", () => {
    const assignees = dedupeAssignees([
      { userId: "u1", userName: "One", userAvatar: null },
      { userId: "u1", userName: "Duplicate", userAvatar: null },
      { userId: "u2", userName: "Two", userAvatar: null },
    ]);

    expect(assignees).toHaveLength(2);
    expect(assignees[0]?.userName).toBe("One");
  });
});

describe("resolveFocusedJourneyStep", () => {
  const journey: AgencyProjectJourney = {
    id: "j1",
    projectId: "proj-1",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    completedSteps: 1,
    totalSteps: 3,
    steps: [
      {
        id: "s1",
        journeyId: "j1",
        sortOrder: 0,
        label: "Start",
        stepKind: "start",
        status: "done",
        taskId: null,
        timeEntryCount: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "s2",
        journeyId: "j1",
        sortOrder: 1,
        label: "Build",
        stepKind: "milestone",
        status: "active",
        taskId: "task-build",
        timeEntryCount: 2,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
      {
        id: "s3",
        journeyId: "j1",
        sortOrder: 2,
        label: "Ship",
        stepKind: "destination",
        status: "planned",
        taskId: null,
        timeEntryCount: 0,
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
  };

  it("selects the linked step for milestone tasks", () => {
    const focused = resolveFocusedJourneyStep(
      journey,
      task({
        id: "task-build",
        projectId: "proj-1",
        title: "Build",
        taskKind: "journey_milestone",
      }),
    );
    expect(focused?.id).toBe("s2");
  });

  it("selects the active step for anchor tasks", () => {
    const focused = resolveFocusedJourneyStep(
      journey,
      task({
        id: "anchor",
        projectId: "proj-1",
        title: "Launch",
        taskKind: "journey_anchor",
      }),
    );
    expect(focused?.label).toBe("Build");
  });
});

describe("unlinkTimeEntriesFromJourneyStep", () => {
  it("nulls journeyStepId on matching entries and keeps all rows", () => {
    const entries = [
      { id: "e1", journeyStepId: "step-a" as string | null, durationSeconds: 60 },
      { id: "e2", journeyStepId: "step-b" as string | null, durationSeconds: 120 },
      { id: "e3", journeyStepId: "step-a" as string | null, durationSeconds: 30 },
    ];

    const unlinked = unlinkTimeEntriesFromJourneyStep(entries, "step-a");

    expect(unlinked).toHaveLength(3);
    expect(unlinked.map((entry) => entry.id)).toEqual(["e1", "e2", "e3"]);
    expect(unlinked[0]?.journeyStepId).toBeNull();
    expect(unlinked[1]?.journeyStepId).toBe("step-b");
    expect(unlinked[2]?.journeyStepId).toBeNull();
    expect(unlinked[0]?.durationSeconds).toBe(60);
    expect(unlinked[2]?.durationSeconds).toBe(30);
  });
});
