import { describe, expect, it } from "bun:test";

import {
  taskMatchesDelegatedByFilter,
  taskMatchesJourneyDiscoveryFilter,
} from "./list-project-tasks-filters";

describe("taskMatchesDelegatedByFilter", () => {
  it("matches team-assigned tasks", () => {
    expect(taskMatchesDelegatedByFilter({ assignedToTeam: true, assignees: [] }, "user-1")).toBe(
      true,
    );
  });

  it("matches when another user is assignee", () => {
    expect(
      taskMatchesDelegatedByFilter(
        { assignedToTeam: false, assignees: [{ userId: "user-2" }] },
        "user-1",
      ),
    ).toBe(true);
  });

  it("rejects when only the delegator is assignee", () => {
    expect(
      taskMatchesDelegatedByFilter(
        { assignedToTeam: false, assignees: [{ userId: "user-1" }] },
        "user-1",
      ),
    ).toBe(false);
  });
});

describe("taskMatchesJourneyDiscoveryFilter", () => {
  const anchor = {
    projectId: "proj-1",
    taskKind: "journey_anchor" as const,
    assignees: [] as Array<{ userId: string }>,
  };
  const milestoneOther = {
    projectId: "proj-1",
    taskKind: "journey_milestone" as const,
    assignees: [{ userId: "user-2" }],
  };
  const milestoneMine = {
    projectId: "proj-1",
    taskKind: "journey_milestone" as const,
    assignees: [{ userId: "user-1" }],
  };

  it("includes journeys without a viewer milestone", () => {
    expect(taskMatchesJourneyDiscoveryFilter(anchor, [anchor, milestoneOther], "user-1")).toBe(
      true,
    );
  });

  it("excludes journeys where the viewer has a milestone", () => {
    expect(taskMatchesJourneyDiscoveryFilter(anchor, [anchor, milestoneMine], "user-1")).toBe(
      false,
    );
  });

  it("rejects standard tasks", () => {
    expect(
      taskMatchesJourneyDiscoveryFilter(
        { projectId: "proj-1", taskKind: "standard", assignees: [] },
        [],
        "user-1",
      ),
    ).toBe(false);
  });
});
