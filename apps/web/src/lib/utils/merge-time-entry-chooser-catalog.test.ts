import { describe, expect, it } from "bun:test";

import {
  isClockifyImportedId,
  mergeTimeEntryProjectsForChooser,
  mergeTimeEntryTasksForChooser,
} from "./merge-time-entry-chooser-catalog";
import type { TimeEntryRecord } from "./group-time-entries";

function sampleEntry(overrides: Partial<TimeEntryRecord> = {}): TimeEntryRecord {
  return {
    id: "clockify-entry-1",
    teamId: "team-1",
    userId: "user-1",
    userName: "User",
    projectId: "clockify-project-abc",
    taskId: "clockify-task-design",
    taskTitle: "Design",
    projectName: "Website",
    clientId: "clockify-client-acme",
    clientName: "Acme",
    source: "manual",
    description: "Wireframes",
    startedAt: "2026-01-01T09:00:00.000Z",
    endedAt: "2026-01-01T10:00:00.000Z",
    durationSeconds: 3600,
    createdAt: "2026-01-01T09:00:00.000Z",
    updatedAt: "2026-01-01T10:00:00.000Z",
    ...overrides,
  };
}

describe("mergeTimeEntryTasksForChooser", () => {
  it("adds imported entry tasks missing from the chooser list", () => {
    const entry = sampleEntry();
    const merged = mergeTimeEntryTasksForChooser([], [entry]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("clockify-task-design");
    expect(merged[0]?.title).toBe("Design");
    expect(merged[0]?.status).toBe("done");
  });

  it("does not duplicate tasks already loaded", () => {
    const entry = sampleEntry();
    const loaded = [
      {
        id: "clockify-task-design",
        teamId: "team-1",
        projectId: "clockify-project-abc",
        title: "Design",
        status: "open" as const,
        taskKind: "standard" as const,
        assignedToTeam: true,
        assignees: [],
        dueDate: null,
        createdAt: "2026-01-01T09:00:00.000Z",
        updatedAt: "2026-01-01T09:00:00.000Z",
      },
    ];

    const merged = mergeTimeEntryTasksForChooser(loaded, [entry]);
    expect(merged).toHaveLength(1);
    expect(merged[0]?.status).toBe("open");
  });
});

describe("mergeTimeEntryProjectsForChooser", () => {
  it("adds imported entry projects missing from the chooser list", () => {
    const entry = sampleEntry();
    const merged = mergeTimeEntryProjectsForChooser([], [entry]);

    expect(merged).toHaveLength(1);
    expect(merged[0]?.id).toBe("clockify-project-abc");
    expect(merged[0]?.name).toBe("Website");
  });
});

describe("isClockifyImportedId", () => {
  it("detects clockify-prefixed ids", () => {
    expect(isClockifyImportedId("clockify-task-abc")).toBe(true);
    expect(isClockifyImportedId("agency-task-abc")).toBe(false);
  });
});
