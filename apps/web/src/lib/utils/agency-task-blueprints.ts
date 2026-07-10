import type { AgencyProjectTask } from "@/lib/schemas/agency-work";
import {
  isJourneyAnchorTask,
  isJourneyMilestoneTask,
  shouldShowJourneyAnchor,
  shouldShowJourneyAnchorForDiscovery,
  type JourneyProgressSummary,
} from "@/lib/utils/agency-task-journey";

export type AgencyTaskBlueprintEntry = {
  id: string;
  taskId: string;
  description: string;
};

/** Stable fallback for zustand selectors — never use inline `?? []`. */
export const EMPTY_TASK_BLUEPRINTS: AgencyTaskBlueprintEntry[] = [];

export type AgencyTaskDisplayRowKind = "standard" | "journey_anchor" | "journey_milestone";

export type AgencyTaskDisplayRow = {
  task: AgencyProjectTask;
  blueprintId: string | null;
  blueprintDescription: string;
  rowKey: string;
  rowKind: AgencyTaskDisplayRowKind;
  journeyProgress?: JourneyProgressSummary;
};

export type ExpandTasksWithBlueprintsOptions = {
  currentUserId?: string;
  allTasks?: AgencyProjectTask[];
  journeyProgressByProjectId?: Map<string, JourneyProgressSummary>;
  journeyAnchorMode?: "assigned" | "discovery";
};

export function collectTaskBlueprintsFromTasks(
  tasks: AgencyProjectTask[],
): AgencyTaskBlueprintEntry[] {
  const entries: AgencyTaskBlueprintEntry[] = [];
  for (const task of tasks) {
    for (const blueprint of task.viewerBlueprints ?? []) {
      entries.push({
        id: blueprint.id,
        taskId: task.id,
        description: blueprint.description,
      });
    }
  }
  return entries;
}

function resolveRowKind(task: AgencyProjectTask): AgencyTaskDisplayRowKind {
  if (isJourneyAnchorTask(task)) return "journey_anchor";
  if (isJourneyMilestoneTask(task)) return "journey_milestone";
  return "standard";
}

export function expandTasksWithBlueprints(
  tasks: AgencyProjectTask[],
  blueprints: AgencyTaskBlueprintEntry[],
  options: ExpandTasksWithBlueprintsOptions = {},
): AgencyTaskDisplayRow[] {
  const {
    currentUserId = "",
    allTasks = tasks,
    journeyProgressByProjectId,
    journeyAnchorMode = "assigned",
  } = options;
  const byTaskId = new Map<string, AgencyTaskBlueprintEntry[]>();

  for (const blueprint of blueprints) {
    const existing = byTaskId.get(blueprint.taskId) ?? [];
    existing.push(blueprint);
    byTaskId.set(blueprint.taskId, existing);
  }

  const rows: AgencyTaskDisplayRow[] = [];

  for (const task of tasks) {
    if (isJourneyAnchorTask(task)) {
      const showAnchor =
        journeyAnchorMode === "discovery"
          ? shouldShowJourneyAnchorForDiscovery(task, allTasks, currentUserId)
          : shouldShowJourneyAnchor(task, allTasks, currentUserId);
      if (!showAnchor) continue;
    }

    const rowKind = resolveRowKind(task);

    if (isJourneyAnchorTask(task)) {
      rows.push({
        task,
        blueprintId: null,
        blueprintDescription: "",
        rowKey: task.id,
        rowKind,
        journeyProgress: journeyProgressByProjectId?.get(task.projectId),
      });
      continue;
    }

    const entries = byTaskId.get(task.id) ?? [];
    if (entries.length === 0) {
      rows.push({
        task,
        blueprintId: null,
        blueprintDescription: "",
        rowKey: task.id,
        rowKind,
      });
      continue;
    }

    for (const blueprint of entries) {
      rows.push({
        task,
        blueprintId: blueprint.id,
        blueprintDescription: blueprint.description,
        rowKey: blueprint.id,
        rowKind,
      });
    }
  }

  return rows;
}
