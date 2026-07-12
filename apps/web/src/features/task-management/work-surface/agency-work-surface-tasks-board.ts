import { resolveTaskDisplayStatus } from "@/features/task-management/agency-task-status";
import type { AgencyProjectTask, TaskStatus } from "@/features/task-management/agency-work";

export const AGENCY_WORK_BOARD_COLUMNS = ["open", "in_progress", "done"] as const;
export type AgencyWorkBoardColumnId = (typeof AGENCY_WORK_BOARD_COLUMNS)[number];

export const AGENCY_WORK_BOARD_SWIMLANES = ["mine", "delegated"] as const;
export type AgencyWorkBoardSwimlaneId = (typeof AGENCY_WORK_BOARD_SWIMLANES)[number];

export type AgencyWorkBoardCard = {
  task: AgencyProjectTask;
  swimlane: AgencyWorkBoardSwimlaneId;
  column: AgencyWorkBoardColumnId;
};

export type AgencyWorkBoardCellKey = `${AgencyWorkBoardColumnId}:${AgencyWorkBoardSwimlaneId}`;

export function agencyWorkBoardCellKey(
  column: AgencyWorkBoardColumnId,
  swimlane: AgencyWorkBoardSwimlaneId,
): AgencyWorkBoardCellKey {
  return `${column}:${swimlane}`;
}

export function boardColumnLabel(column: AgencyWorkBoardColumnId): string {
  switch (column) {
    case "open":
      return "Open";
    case "in_progress":
      return "In Progress";
    case "done":
      return "Done";
    default: {
      const _exhaustive: never = column;
      return _exhaustive;
    }
  }
}

export function boardSwimlaneLabel(swimlane: AgencyWorkBoardSwimlaneId): string {
  switch (swimlane) {
    case "mine":
      return "Mine";
    case "delegated":
      return "Delegated";
    default: {
      const _exhaustive: never = swimlane;
      return _exhaustive;
    }
  }
}

export function columnIdToTaskStatus(column: AgencyWorkBoardColumnId): TaskStatus {
  return column;
}

function mineColumnForTask(task: AgencyProjectTask): AgencyWorkBoardColumnId {
  if (task.status === "done" || task.viewerStatus === "done") {
    return "done";
  }
  const display = resolveTaskDisplayStatus({ task });
  if (display === "in_progress") return "in_progress";
  if (display === "archived") return "done";
  return "open";
}

function delegatedColumnForTask(task: AgencyProjectTask): AgencyWorkBoardColumnId {
  if (task.status === "done" || task.status === "archived") return "done";
  if (task.status === "in_progress") return "in_progress";
  return "open";
}

export type BuildAgencyWorkBoardCardsInput = {
  mineActiveTasks: AgencyProjectTask[];
  mineDoneTasks: AgencyProjectTask[];
  delegatedActiveTasks: AgencyProjectTask[];
  delegatedDoneTasks: AgencyProjectTask[];
};

/** Compose Mine × Delegated swimlanes with Open / In Progress / Done columns. Mine wins on id overlap. */
export function buildAgencyWorkBoardCards({
  mineActiveTasks,
  mineDoneTasks,
  delegatedActiveTasks,
  delegatedDoneTasks,
}: BuildAgencyWorkBoardCardsInput): AgencyWorkBoardCard[] {
  const cards: AgencyWorkBoardCard[] = [];
  const seen = new Set<string>();

  function pushMine(task: AgencyProjectTask) {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    cards.push({
      task,
      swimlane: "mine",
      column: mineColumnForTask(task),
    });
  }

  function pushDelegated(task: AgencyProjectTask) {
    if (seen.has(task.id)) return;
    seen.add(task.id);
    cards.push({
      task,
      swimlane: "delegated",
      column: delegatedColumnForTask(task),
    });
  }

  for (const task of mineActiveTasks) pushMine(task);
  for (const task of mineDoneTasks) pushMine(task);
  for (const task of delegatedActiveTasks) pushDelegated(task);
  for (const task of delegatedDoneTasks) pushDelegated(task);

  return cards;
}

export function groupAgencyWorkBoardCards(
  cards: AgencyWorkBoardCard[],
): Record<AgencyWorkBoardCellKey, AgencyWorkBoardCard[]> {
  const cells = Object.fromEntries(
    AGENCY_WORK_BOARD_COLUMNS.flatMap((column) =>
      AGENCY_WORK_BOARD_SWIMLANES.map((swimlane) => [
        agencyWorkBoardCellKey(column, swimlane),
        [] as AgencyWorkBoardCard[],
      ]),
    ),
  ) as Record<AgencyWorkBoardCellKey, AgencyWorkBoardCard[]>;

  for (const card of cards) {
    cells[agencyWorkBoardCellKey(card.column, card.swimlane)].push(card);
  }

  for (const key of Object.keys(cells) as AgencyWorkBoardCellKey[]) {
    cells[key].sort((left, right) => {
      const leftDue = left.task.dueDate
        ? new Date(left.task.dueDate).getTime()
        : Number.POSITIVE_INFINITY;
      const rightDue = right.task.dueDate
        ? new Date(right.task.dueDate).getTime()
        : Number.POSITIVE_INFINITY;
      if (leftDue !== rightDue) return leftDue - rightDue;
      return left.task.title.localeCompare(right.task.title);
    });
  }

  return cells;
}

export function flattenAssignedClientGroupTasks(
  assignedClientGroups: Array<{
    projectGroups: Array<{
      standaloneRows: Array<{ task: AgencyProjectTask }>;
      journeyCluster: {
        anchorRow: { task: AgencyProjectTask };
        milestoneRows: Array<{ task: AgencyProjectTask }>;
      } | null;
    }>;
  }>,
): AgencyProjectTask[] {
  const tasks: AgencyProjectTask[] = [];
  const seen = new Set<string>();

  for (const group of assignedClientGroups) {
    for (const projectGroup of group.projectGroups) {
      for (const row of projectGroup.standaloneRows) {
        if (seen.has(row.task.id)) continue;
        seen.add(row.task.id);
        tasks.push(row.task);
      }
      if (projectGroup.journeyCluster) {
        const anchor = projectGroup.journeyCluster.anchorRow.task;
        if (!seen.has(anchor.id)) {
          seen.add(anchor.id);
          tasks.push(anchor);
        }
        for (const milestone of projectGroup.journeyCluster.milestoneRows) {
          if (seen.has(milestone.task.id)) continue;
          seen.add(milestone.task.id);
          tasks.push(milestone.task);
        }
      }
    }
  }

  return tasks;
}

export const AGENCY_WORK_BOARD_DND_MIME = "application/x-agency-work-task";

export type AgencyWorkBoardDragPayload = {
  taskId: string;
  swimlane: AgencyWorkBoardSwimlaneId;
};

export function encodeAgencyWorkBoardDragPayload(payload: AgencyWorkBoardDragPayload): string {
  return JSON.stringify(payload);
}

export function decodeAgencyWorkBoardDragPayload(raw: string): AgencyWorkBoardDragPayload | null {
  try {
    const parsed = JSON.parse(raw) as Partial<AgencyWorkBoardDragPayload>;
    if (
      typeof parsed.taskId !== "string" ||
      !parsed.taskId ||
      (parsed.swimlane !== "mine" && parsed.swimlane !== "delegated")
    ) {
      return null;
    }
    return { taskId: parsed.taskId, swimlane: parsed.swimlane };
  } catch {
    return null;
  }
}
