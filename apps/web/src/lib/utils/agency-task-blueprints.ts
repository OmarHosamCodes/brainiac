import type { AgencyProjectTask } from "@/lib/schemas/agency-work";

export type AgencyTaskBlueprintEntry = {
  id: string;
  taskId: string;
  description: string;
};

/** Stable fallback for zustand selectors — never use inline `?? []`. */
export const EMPTY_TASK_BLUEPRINTS: AgencyTaskBlueprintEntry[] = [];

export type AgencyTaskDisplayRow = {
  task: AgencyProjectTask;
  blueprintId: string | null;
  blueprintDescription: string;
  rowKey: string;
};

export function expandTasksWithBlueprints(
  tasks: AgencyProjectTask[],
  blueprints: AgencyTaskBlueprintEntry[],
): AgencyTaskDisplayRow[] {
  const byTaskId = new Map<string, AgencyTaskBlueprintEntry[]>();

  for (const blueprint of blueprints) {
    const existing = byTaskId.get(blueprint.taskId) ?? [];
    existing.push(blueprint);
    byTaskId.set(blueprint.taskId, existing);
  }

  const rows: AgencyTaskDisplayRow[] = [];

  for (const task of tasks) {
    const entries = byTaskId.get(task.id) ?? [];
    if (entries.length === 0) {
      rows.push({
        task,
        blueprintId: null,
        blueprintDescription: "",
        rowKey: task.id,
      });
      continue;
    }

    for (const blueprint of entries) {
      rows.push({
        task,
        blueprintId: blueprint.id,
        blueprintDescription: blueprint.description,
        rowKey: blueprint.id,
      });
    }
  }

  return rows;
}
