import { describe, expect, it } from "bun:test";

import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import {
  agencyWorkBoardCellKey,
  buildAgencyWorkBoardCards,
  canCrossAgencyWorkBoardSwimlane,
  canDropOnAgencyWorkBoardCell,
  decodeAgencyWorkBoardDragPayload,
  encodeAgencyWorkBoardDragPayload,
  flattenAssignedClientGroupTasks,
  groupAgencyWorkBoardCards,
  isAgencyWorkBoardCardReadOnly,
} from "./agency-work-surface-tasks-board";

function task(
  overrides: Partial<AgencyProjectTask> &
    Pick<AgencyProjectTask, "id" | "title" | "status"> & {
      viewerStatus?: AgencyProjectTask["viewerStatus"];
    },
): AgencyProjectTask {
  return {
    teamId: "team-1",
    projectId: "project-1",
    assignedToTeam: false,
    isWaste: false,
    createdByUserId: "user-1",
    assignees: [],
    dueDate: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    taskKind: "standard",
    viewerStatus: "open",
    ...overrides,
  };
}

describe("agency work tasks board grouping", () => {
  it("places mine and delegated tasks into status columns", () => {
    const cards = buildAgencyWorkBoardCards({
      mineActiveTasks: [
        task({ id: "m1", title: "Mine open", status: "open", viewerStatus: "open" }),
        task({
          id: "m2",
          title: "Mine progress",
          status: "open",
          viewerStatus: "in_progress",
        }),
      ],
      mineDoneTasks: [task({ id: "m3", title: "Mine done", status: "done", viewerStatus: "done" })],
      delegatedActiveTasks: [
        task({ id: "d1", title: "Delegated open", status: "open", viewerStatus: "open" }),
      ],
      delegatedDoneTasks: [
        task({ id: "d2", title: "Delegated done", status: "done", viewerStatus: "done" }),
      ],
    });

    const cells = groupAgencyWorkBoardCards(cards);
    expect(cells[agencyWorkBoardCellKey("open", "mine")].map((c) => c.task.id)).toEqual(["m1"]);
    expect(cells[agencyWorkBoardCellKey("in_progress", "mine")].map((c) => c.task.id)).toEqual([
      "m2",
    ]);
    expect(cells[agencyWorkBoardCellKey("done", "mine")].map((c) => c.task.id)).toEqual(["m3"]);
    expect(cells[agencyWorkBoardCellKey("open", "delegated")].map((c) => c.task.id)).toEqual([
      "d1",
    ]);
    expect(cells[agencyWorkBoardCellKey("done", "delegated")].map((c) => c.task.id)).toEqual([
      "d2",
    ]);
  });

  it("prefers mine when the same task appears in both swimlanes", () => {
    const shared = task({
      id: "shared",
      title: "Both",
      status: "open",
      viewerStatus: "open",
    });
    const cards = buildAgencyWorkBoardCards({
      mineActiveTasks: [shared],
      mineDoneTasks: [],
      delegatedActiveTasks: [shared],
      delegatedDoneTasks: [],
    });
    expect(cards).toHaveLength(1);
    expect(cards[0]?.swimlane).toBe("mine");
  });

  it("flattens assigned client groups without duplicate ids", () => {
    const tasks = flattenAssignedClientGroupTasks([
      {
        projectGroups: [
          {
            standaloneRows: [{ task: task({ id: "a", title: "A", status: "open" }) }],
            journeyCluster: {
              anchorRow: { task: task({ id: "b", title: "B", status: "open" }) },
              milestoneRows: [
                { task: task({ id: "a", title: "A again", status: "open" }) },
                { task: task({ id: "c", title: "C", status: "in_progress" }) },
              ],
            },
          },
        ],
      },
    ]);
    expect(tasks.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  it("round-trips drag payloads", () => {
    const encoded = encodeAgencyWorkBoardDragPayload({ taskId: "t1", swimlane: "delegated" });
    expect(decodeAgencyWorkBoardDragPayload(encoded)).toEqual({
      taskId: "t1",
      swimlane: "delegated",
    });
    expect(decodeAgencyWorkBoardDragPayload("not-json")).toBeNull();
  });

  it("allows Mine↔Delegated cross-lane drops", () => {
    expect(canCrossAgencyWorkBoardSwimlane("mine", "mine")).toBe(true);
    expect(canCrossAgencyWorkBoardSwimlane("mine", "delegated")).toBe(true);
    expect(canCrossAgencyWorkBoardSwimlane("delegated", "mine")).toBe(true);
  });

  it("marks delegated in-progress and done cards as read-only", () => {
    expect(isAgencyWorkBoardCardReadOnly("delegated", "open")).toBe(false);
    expect(isAgencyWorkBoardCardReadOnly("delegated", "in_progress")).toBe(true);
    expect(isAgencyWorkBoardCardReadOnly("delegated", "done")).toBe(true);
    expect(isAgencyWorkBoardCardReadOnly("mine", "in_progress")).toBe(false);
    expect(isAgencyWorkBoardCardReadOnly("mine", "done")).toBe(false);
  });

  it("rejects drops onto delegated in-progress and done cells", () => {
    expect(canDropOnAgencyWorkBoardCell("delegated", "open")).toBe(true);
    expect(canDropOnAgencyWorkBoardCell("delegated", "in_progress")).toBe(false);
    expect(canDropOnAgencyWorkBoardCell("delegated", "done")).toBe(false);
    expect(canDropOnAgencyWorkBoardCell("mine", "in_progress")).toBe(true);
    expect(canDropOnAgencyWorkBoardCell("mine", "done")).toBe(true);
  });
});
