import {
  getWorkspaceTaskDomainLabel,
  type WorkspaceCollectedTask,
  type WorkspaceTaskPriority,
} from "@brainiac/workspace";

export function getWorkspaceTaskPriorityBadgeClass(
  priority: WorkspaceTaskPriority | null | undefined,
) {
  switch (priority) {
    case "high":
      return "border-error/40 bg-error/10 text-error";
    case "medium":
      return "border-warning/40 bg-warning/10 text-warning";
    case "low":
      return "border-success/40 bg-success/10 text-success";
    default:
      return "border-muted/60 bg-elevated/80 text-muted";
  }
}

export function formatWorkspaceRelativeTaskMeta(item: WorkspaceCollectedTask) {
  const fragments = [`${item.tabTitle} / ${item.blockTitle}`];

  if (item.task.domain) {
    fragments.push(getWorkspaceTaskDomainLabel(item.task.domain));
  }

  if (item.task.dueDate) {
    fragments.push(`Due ${item.task.dueDate}`);
  }

  if (item.task.priority) {
    fragments.push(`${item.task.priority} priority`);
  }

  fragments.push(`U${item.task.urgency}`);
  fragments.push(`I${item.task.importance}`);

  if (item.task.estimateMinutes > 0) {
    fragments.push(`${item.task.estimateMinutes} min`);
  }

  return fragments.join(" • ");
}

export function formatWorkspaceFormulaResult(value: number | null) {
  if (value === null) {
    return "Invalid formula";
  }

  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}
