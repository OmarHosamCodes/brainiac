import type { AgencyProjectTask, TaskStatus } from "@/features/task-management/agency-work";

const STATUS_CHIP_BORDERED_BASE =
  "inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] font-medium";

export type AgencyWorkSurfaceStatusTone =
  | "completed"
  | "in_progress"
  | "planned"
  | "due_soon"
  | "waiting"
  | "in_review";

export function agencyWorkSurfaceStatusChipClass(tone: AgencyWorkSurfaceStatusTone): string {
  switch (tone) {
    case "completed":
      return `${STATUS_CHIP_BORDERED_BASE} border-success/40 bg-success/10 text-success`;
    case "in_progress":
      return `${STATUS_CHIP_BORDERED_BASE} border-primary/40 bg-primary/10 text-primary`;
    case "planned":
      return `${STATUS_CHIP_BORDERED_BASE} border-default bg-elevated text-toned`;
    case "due_soon":
      return `${STATUS_CHIP_BORDERED_BASE} border-warning/45 bg-warning/15 text-warning`;
    case "waiting":
      return `${STATUS_CHIP_BORDERED_BASE} border-info/40 bg-info/10 text-info`;
    case "in_review":
      return `${STATUS_CHIP_BORDERED_BASE} border-primary/25 bg-primary/5 text-primary`;
    default: {
      const _exhaustive: never = tone;
      return _exhaustive;
    }
  }
}

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
}
