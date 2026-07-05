import type { AgencyProjectTask, TaskStatus } from "@/lib/schemas/agency-work";
import type { AgencyTaskDisplayRow } from "@/lib/utils/agency-task-blueprints";

export const TASK_ROW_BASE_HEIGHT = 56;
export const TASK_ROW_WITH_DESC_HEIGHT = 88;

const STATUS_CHIP_BASE =
  "inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wide";

export function statusLabel(status: TaskStatus | undefined): string {
  if (!status) return "Open";
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    case "archived":
      return "Archived";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function statusDotClass(status: TaskStatus | undefined): string {
  if (!status) return "bg-muted-foreground/50";
  switch (status) {
    case "in_progress":
      return "bg-primary";
    case "done":
      return "bg-success";
    case "archived":
      return "bg-muted";
    case "open":
      return "bg-muted-foreground/50";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function statusChipClass(status: TaskStatus | undefined): string {
  switch (status) {
    case "in_progress":
      return `${STATUS_CHIP_BASE} bg-primary/10 text-primary`;
    case "done":
      return `${STATUS_CHIP_BASE} bg-success/10 text-success`;
    case "archived":
      return `${STATUS_CHIP_BASE} bg-muted text-muted`;
    case "open":
      return `${STATUS_CHIP_BASE} bg-elevated text-muted`;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export type ResolveTaskDisplayStatusInput = {
  task: Pick<AgencyProjectTask, "status" | "viewerStatus">;
  readOnly?: boolean;
};

export function resolveTaskDisplayStatus({
  task,
  readOnly = false,
}: ResolveTaskDisplayStatusInput): TaskStatus {
  if (readOnly) return "done";
  if (task.status === "in_progress" || task.viewerStatus === "in_progress") {
    return "in_progress";
  }
  if (task.status === "archived") return "archived";
  return "open";
}

export function taskStatusDisplay(status: TaskStatus | undefined) {
  const label = statusLabel(status);
  return {
    label,
    dotClass: statusDotClass(status),
    chipClass: statusChipClass(status),
    ariaLabel: `${label} status`,
  };
}

export function estimateDisplayRowHeight(
  row: Pick<AgencyTaskDisplayRow, "blueprintId" | "blueprintDescription" | "rowKind">,
  needsDescription = false,
): number {
  if (row.rowKind === "journey_anchor") return TASK_ROW_BASE_HEIGHT;
  const hasDescriptionRow =
    Boolean(row.blueprintId) ||
    Boolean(row.blueprintDescription.trim()) ||
    needsDescription;
  return hasDescriptionRow ? TASK_ROW_WITH_DESC_HEIGHT : TASK_ROW_BASE_HEIGHT;
}

if (import.meta.env.DEV) {
  console.assert(
    resolveTaskDisplayStatus({
      task: { status: "open", viewerStatus: "in_progress" },
    }) === "in_progress",
  );
  console.assert(
    resolveTaskDisplayStatus({
      task: { status: "open", viewerStatus: "in_progress" },
      readOnly: true,
    }) === "done",
  );
  console.assert(estimateDisplayRowHeight({ blueprintId: "b1", blueprintDescription: "" }) === 88);
}
