import { describe, expect, test } from "bun:test";

import {
  flattenCollapsedGroupsForBulkEdit,
  flattenTimeEntryWeeksForVirtualization,
  type CollapsedEntryGroup,
  type TimeEntryRecord,
  type TimeEntryWeekGroup,
} from "@/features/time-tracking/group-time-entries";

function makeEntry(
  overrides: Partial<TimeEntryRecord> & Pick<TimeEntryRecord, "id">,
): TimeEntryRecord {
  return {
    teamId: "team-1",
    userId: "user-1",
    userName: "Alex",
    projectId: "project-1",
    projectName: "Portal",
    clientId: "client-1",
    clientName: "Acme",
    taskId: "task-1",
    taskTitle: "Peeling",
    source: "manual",
    description: "Mesh Madrasa",
    startedAt: "2026-07-16T10:00:00.000Z",
    endedAt: "2026-07-16T11:00:00.000Z",
    durationSeconds: 3_600,
    createdAt: "2026-07-16T10:00:00.000Z",
    updatedAt: "2026-07-16T11:00:00.000Z",
    ...overrides,
  };
}

function makeGroup(
  entries: TimeEntryRecord[],
  collapseKey = "task-1||Mesh Madrasa",
): CollapsedEntryGroup {
  return {
    collapseKey,
    projectId: entries[0]!.projectId,
    taskId: entries[0]!.taskId,
    taskTitle: entries[0]!.taskTitle ?? "",
    projectName: entries[0]!.projectName,
    clientName: entries[0]!.clientName,
    description: entries[0]!.description,
    totalSeconds: entries.reduce((sum, entry) => sum + entry.durationSeconds, 0),
    entries,
  };
}

describe("flattenCollapsedGroupsForBulkEdit", () => {
  test("leaves single-entry groups unchanged", () => {
    const group = makeGroup([makeEntry({ id: "e1" })]);
    expect(flattenCollapsedGroupsForBulkEdit([group])).toEqual([group]);
  });

  test("expands multi-entry groups into one selectable row per entry", () => {
    const group = makeGroup([
      makeEntry({ id: "e1", durationSeconds: 1_800 }),
      makeEntry({ id: "e2", durationSeconds: 900 }),
    ]);

    const flattened = flattenCollapsedGroupsForBulkEdit([group]);
    expect(flattened).toHaveLength(2);
    expect(flattened.map((row) => row.entries.map((entry) => entry.id))).toEqual([["e1"], ["e2"]]);
    expect(flattened.map((row) => row.totalSeconds)).toEqual([1_800, 900]);
    expect(flattened[0]?.collapseKey).toContain("e1");
    expect(flattened[1]?.collapseKey).toContain("e2");
  });
});

describe("flattenTimeEntryWeeksForVirtualization", () => {
  test("keeps each week header on its first virtual day", () => {
    const day = {
      dateKey: "2026-07-16",
      totalSeconds: 3_600,
      groups: [makeGroup([makeEntry({ id: "e1" })])],
    };
    const weeks: TimeEntryWeekGroup[] = [
      {
        weekStartKey: "2026-07-13",
        label: "This week",
        totalSeconds: 5_400,
        days: [day, { ...day, dateKey: "2026-07-15" }],
      },
    ];

    const virtualDays = flattenTimeEntryWeeksForVirtualization(weeks);

    expect(virtualDays).toHaveLength(2);
    expect(virtualDays[0]?.week).toEqual({
      weekStartKey: "2026-07-13",
      label: "This week",
      totalSeconds: 5_400,
    });
    expect(virtualDays[1]?.week).toBeNull();
  });
});
