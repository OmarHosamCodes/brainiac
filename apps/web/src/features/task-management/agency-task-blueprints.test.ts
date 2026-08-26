import { describe, expect, it } from "bun:test";

import { expandTasksWithBlueprints } from "@/features/task-management/agency-task-blueprints";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";

const baseTask = {
  teamId: "team-1",
  projectId: "proj-1",
  title: "Meeting",
  status: "open" as const,
  taskKind: "standard" as const,
  assignedToTeam: false,
  isWaste: false,
  estimateMinutes: null,
  billableRateAmount: null,
  sourceBillableRateAmount: null,
  currency: "USD",
  projectBillableRateAmount: null,
  projectSourceBillableRateAmount: null,
  projectCurrency: "USD",
  clientBillableRateAmount: null,
  clientSourceBillableRateAmount: null,
  clientCurrency: "USD",
  createdByUserId: "user-1",
  assignees: [],
  dueDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

function task(id: string): AgencyProjectTask {
  return { ...baseTask, id };
}

describe("expandTasksWithBlueprints", () => {
  it("shows one row per blueprint for the same task id", () => {
    const rows = expandTasksWithBlueprints(
      [task("task-1")],
      [
        { id: "bp-1", taskId: "task-1", description: "Client call" },
        { id: "bp-2", taskId: "task-1", description: "Internal sync" },
      ],
    );

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.blueprintDescription)).toEqual(["Client call", "Internal sync"]);
  });

  it("falls back to a single row when no blueprints exist", () => {
    const rows = expandTasksWithBlueprints([task("task-1")], []);

    expect(rows).toEqual([
      {
        task: task("task-1"),
        blueprintId: null,
        blueprintDescription: "",
        rowKey: "task-1",
        rowKind: "standard",
      },
    ]);
  });
});
