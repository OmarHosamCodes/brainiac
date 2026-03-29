import { WORKSPACE_HABIT_GRID_DAYS } from "./constants";
import { trimToEmpty } from "./shared";
import type {
  Workspace2x2MatrixBlock,
  WorkspaceChecklistBlock,
  WorkspaceHabitGridBlock,
  WorkspaceProcessBlock,
  WorkspaceProsConsBlock,
  WorkspaceSwotBlock,
  WorkspaceTableBlock,
} from "./types";

export function getTableSummary(block: WorkspaceTableBlock) {
  const filledCellCount = block.rows.reduce(
    (sum, row) =>
      sum +
      block.columns.filter((column) => trimToEmpty(row.cells[column.id]).length > 0).length,
    0,
  );

  return {
    columnCount: block.columns.length,
    rowCount: block.rows.length,
    filledCellCount,
  };
}

export function getChecklistProgress(block: WorkspaceChecklistBlock) {
  const total = block.items.length;
  const completed = block.items.filter((item) => item.completed).length;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

  return {
    total,
    completed,
    remaining: Math.max(0, total - completed),
    percent,
  };
}

export function getProsConsSummary(block: WorkspaceProsConsBlock) {
  const prosWeight = block.pros.reduce((sum, item) => sum + item.weight, 0);
  const consWeight = block.cons.reduce((sum, item) => sum + item.weight, 0);
  const totalScore = prosWeight - consWeight;

  return {
    prosWeight,
    consWeight,
    totalScore,
    verdict: totalScore > 0 ? "do-it" : totalScore < 0 ? "dont" : "tie",
  } as const;
}

export function getSwotSummary(block: WorkspaceSwotBlock) {
  const cells = Object.values(block.cells);
  const filledCellCount = cells.filter((value) => trimToEmpty(value).length > 0).length;

  return {
    filledCellCount,
    emptyCellCount: cells.length - filledCellCount,
  };
}

export function getHabitGridSummary(block: WorkspaceHabitGridBlock) {
  const totalHabits = block.habits.length;
  const possibleChecks = totalHabits * WORKSPACE_HABIT_GRID_DAYS.length;
  const completedChecks = block.habits.reduce(
    (sum, habit) =>
      sum + WORKSPACE_HABIT_GRID_DAYS.filter((day) => habit.days[day]).length,
    0,
  );
  const overallPercent = possibleChecks > 0 ? Math.round((completedChecks / possibleChecks) * 100) : 0;

  return {
    totalHabits,
    possibleChecks,
    completedChecks,
    overallPercent,
  };
}

export function getProcessSummary(block: WorkspaceProcessBlock) {
  const totalSteps = block.steps.length;
  const completedSteps = block.steps.filter((step) => step.completed).length;
  const percent = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return {
    totalSteps,
    completedSteps,
    percent,
  };
}

export function get2x2MatrixSummary(block: Workspace2x2MatrixBlock) {
  const itemCount =
    block.quadrants.topLeft.items.length +
    block.quadrants.topRight.items.length +
    block.quadrants.bottomLeft.items.length +
    block.quadrants.bottomRight.items.length;

  return {
    itemCount,
    quadrantCount: 4,
  };
}
