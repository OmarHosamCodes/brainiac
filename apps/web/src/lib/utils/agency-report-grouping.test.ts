import { describe, expect, test } from "bun:test";

import {
  aggregateSimilarReportRows,
  groupEntriesForDisplay,
  type AgencyReportEntry,
} from "@/lib/utils/agency-report-grouping";

function makeEntry(
  overrides: Partial<AgencyReportEntry> & Pick<AgencyReportEntry, "id">,
): AgencyReportEntry {
  return {
    teamId: "team-1",
    userId: "user-1",
    userName: "Alex",
    projectId: "project-1",
    projectName: "Portal",
    clientId: "client-1",
    clientName: "Acme",
    taskId: null,
    taskTitle: null,
    taskIsWaste: null,
    source: "manual",
    description: "Design review",
    startedAt: "2026-01-01T10:00:00.000Z",
    endedAt: "2026-01-01T11:00:00.000Z",
    durationSeconds: 3_600,
    createdAt: "2026-01-01T10:00:00.000Z",
    updatedAt: "2026-01-01T11:00:00.000Z",
    ...overrides,
  };
}

describe("aggregateSimilarReportRows", () => {
  test("merges rows with same project, task, assignee, and description", () => {
    const rows = aggregateSimilarReportRows([
      makeEntry({ id: "e1", description: "new peeling", durationSeconds: 1_800 }),
      makeEntry({ id: "e2", description: "new peeling", durationSeconds: 900 }),
      makeEntry({ id: "e3", description: "other work", durationSeconds: 600 }),
    ]);

    expect(rows).toHaveLength(2);
    const peeling = rows.find((row) => row.description === "new peeling");
    expect(peeling?.durationSeconds).toBe(2_700);
    expect(peeling?.entryCount).toBe(2);
    expect(peeling?.entries.map((entry) => entry.id).sort()).toEqual(["e1", "e2"]);
  });

  test("keeps rows separate when task or assignee differs", () => {
    const rows = aggregateSimilarReportRows([
      makeEntry({ id: "e1", taskId: "task-a", taskTitle: "Peeling", description: "prep" }),
      makeEntry({ id: "e2", taskId: "task-b", taskTitle: "QA", description: "prep" }),
      makeEntry({ id: "e3", userId: "user-2", userName: "Sam", description: "prep" }),
    ]);

    expect(rows).toHaveLength(3);
  });
});

describe("groupEntriesForDisplay", () => {
  test("groups by client and project before aggregating rows", () => {
    const groups = groupEntriesForDisplay([
      makeEntry({ id: "e1", clientId: "client-b", clientName: "Beta", description: "work" }),
      makeEntry({ id: "e2", clientId: "client-a", clientName: "Alpha", description: "work" }),
      makeEntry({ id: "e3", clientId: "client-a", clientName: "Alpha", description: "work" }),
    ]);

    expect(groups.map((group) => group.clientName)).toEqual(["Alpha", "Beta"]);
    expect(groups[0]?.projects[0]?.rows[0]?.durationSeconds).toBe(7_200);
    expect(groups[0]?.projects[0]?.rows[0]?.entryCount).toBe(2);
    expect(groups[0]?.totalSeconds).toBe(7_200);
    expect(groups[0]?.projects[0]?.totalSeconds).toBe(7_200);
  });

  test("sums project totals across multiple tasks and aggregated rows", () => {
    const groups = groupEntriesForDisplay([
      makeEntry({
        id: "e1",
        projectId: "project-a",
        projectName: "Soul In",
        taskId: "task-a",
        taskTitle: "CRM Management",
        description: "prep",
        durationSeconds: 1_800,
      }),
      makeEntry({
        id: "e2",
        projectId: "project-a",
        projectName: "Soul In",
        taskId: "task-b",
        taskTitle: "QA",
        description: "review",
        durationSeconds: 900,
      }),
      makeEntry({
        id: "e3",
        projectId: "project-a",
        projectName: "Soul In",
        taskId: "task-a",
        taskTitle: "CRM Management",
        description: "prep",
        durationSeconds: 600,
      }),
      makeEntry({
        id: "e4",
        projectId: "project-b",
        projectName: "Website",
        description: "other",
        durationSeconds: 300,
      }),
    ]);

    const soulIn = groups[0]?.projects.find((project) => project.projectName === "Soul In");
    expect(soulIn?.rows).toHaveLength(2);
    expect(soulIn?.totalSeconds).toBe(3_300);
    expect(groups[0]?.totalSeconds).toBe(3_600);
  });
});
