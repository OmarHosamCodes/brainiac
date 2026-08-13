import type {
  ChooserClientGroup,
  ChooserProjectGroup,
} from "@/features/time-tracking/agency-task-chooser-groups";

export type TaskChooserKeyboardItem =
  | { kind: "project"; key: string; projectId: string }
  | { kind: "task"; key: string; taskId: string; projectId: string };

export function taskChooserProjectOptionKey(scope: string, projectId: string): string {
  return `${scope}-project-${projectId}`;
}

export function taskChooserTaskOptionKey(scope: string, taskId: string): string {
  return `${scope}-task-${taskId}`;
}

export function taskChooserOptionDomId(key: string): string {
  return `agency-task-chooser-option-${key}`;
}

/**
 * Visible keyboard targets in Clockify-tree order: project rows, then tasks under
 * expanded projects. Clients are browse chrome only (click/toggle), not Enter targets.
 * When `includeProjects` is false (search mode), only tasks are keyboard targets so
 * Enter always commits a task.
 */
export function buildTaskChooserKeyboardItems(input: {
  favorites: ChooserProjectGroup[];
  clientGroups: ChooserClientGroup[];
  isProjectExpanded: (projectId: string) => boolean;
  isClientExpanded: (clientName: string) => boolean;
  includeProjects?: boolean;
}): TaskChooserKeyboardItem[] {
  const includeProjects = input.includeProjects ?? true;
  const items: TaskChooserKeyboardItem[] = [];

  function pushProjectGroup(entry: ChooserProjectGroup, keyPrefix: string) {
    if (includeProjects) {
      items.push({
        kind: "project",
        key: taskChooserProjectOptionKey(keyPrefix, entry.project.id),
        projectId: entry.project.id,
      });
    }
    if (!input.isProjectExpanded(entry.project.id)) return;
    for (const task of entry.tasks) {
      items.push({
        kind: "task",
        key: taskChooserTaskOptionKey(keyPrefix, task.id),
        taskId: task.id,
        projectId: entry.project.id,
      });
    }
  }

  for (const entry of input.favorites) {
    pushProjectGroup(entry, "fav");
  }

  for (const group of input.clientGroups) {
    if (!input.isClientExpanded(group.clientName)) continue;
    for (const entry of group.projects) {
      pushProjectGroup(entry, `client-${group.clientName}`);
    }
  }

  return items;
}

export function indexOfTaskChooserItem(
  items: TaskChooserKeyboardItem[],
  prefer: { taskId?: string | null; projectId?: string | null },
): number {
  if (prefer.taskId) {
    const taskIndex = items.findIndex(
      (item) => item.kind === "task" && item.taskId === prefer.taskId,
    );
    if (taskIndex >= 0) return taskIndex;
  }
  if (prefer.projectId) {
    const projectIndex = items.findIndex(
      (item) => item.kind === "project" && item.projectId === prefer.projectId,
    );
    if (projectIndex >= 0) return projectIndex;
  }
  return items.length > 0 ? 0 : -1;
}

/** Keep the highlight in place when expand/collapse changes the list length. */
export function clampTaskChooserActiveIndex(current: number, length: number): number {
  if (length === 0) return -1;
  if (current < 0) return current;
  return Math.min(current, length - 1);
}

export function taskChooserCreatePriority(input: {
  searchTerm: string;
  hasVisibleResults: boolean;
}): "default" | "demoted" | "elevated" {
  const query = input.searchTerm.trim();
  if (!query) return "default";
  if (input.hasVisibleResults) return "demoted";
  return "elevated";
}
