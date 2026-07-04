import { Check, Clock } from "lucide-react";

import { AgencyMiniTimerContainer } from "@/lib/agency/work/containers/agency-mini-timer-container";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import {
  agencyFocusRingClass,
  agencyTaskRowCheckboxCheckedClass,
  agencyTaskRowCheckboxClass,
  agencyTaskRowCompleteClass,
  agencyTaskRowClass,
  agencyTaskRowDoneClass,
  agencyTaskRowMetaColumnClass,
  agencyTaskRowProjectPillClass,
  agencyTaskRowSelectedClass,
  agencyTaskRowStatusDotClass,
} from "@/lib/utils/agency-ui";
import { isTaskOverdue } from "@/lib/utils/agency-task-utils";
import { cn } from "@/lib/utils";

function statusDotColor(status: TaskStatus) {
  switch (status) {
    case "open":
      return "bg-muted-foreground/50";
    case "in_progress":
      return "bg-primary";
    case "done":
      return "bg-success";
    case "archived":
      return "bg-muted";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function statusLabel(status: TaskStatus) {
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

function formatDueDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

type AgencyTaskRowCheckboxProps = {
  title: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
};

function AgencyTaskRowCheckbox({
  title,
  checked,
  disabled = false,
  onToggle,
}: AgencyTaskRowCheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={checked ? `${title} is done` : `Mark ${title} done`}
      disabled={disabled}
      className={cn(
        agencyTaskRowCheckboxClass,
        checked && agencyTaskRowCheckboxCheckedClass,
        disabled && "cursor-not-allowed opacity-50",
      )}
      onClick={(event) => {
        event.stopPropagation();
        if (!checked) onToggle();
      }}
    >
      {checked ? <Check className="size-2.5" strokeWidth={3} aria-hidden /> : null}
    </button>
  );
}

export type AgencyTaskRowViewProps = {
  task: AgencyProjectTask;
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  readOnly?: boolean;
  highlight?: boolean;
  isRowPending: boolean;
  onSelect: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
};

export function AgencyTaskRowView({
  task,
  projects,
  teamId,
  selectedTaskId,
  readOnly = false,
  highlight = false,
  isRowPending,
  onSelect,
  onSelectProject,
  onStatusChange,
}: AgencyTaskRowViewProps) {
  const project = projects.find((p) => p.id === task.projectId);
  const projectName = project?.name ?? "Project";
  const isSelected = task.id === selectedTaskId;
  const memberStatus = task.viewerStatus;
  const completionCount = task.viewerCompletionCount ?? 0;
  const isDone = readOnly || memberStatus === "done";
  const overdue = isTaskOverdue(task.dueDate);
  const dueLabel = task.dueDate ? formatDueDate(task.dueDate) : "";
  // Done section: always show ×N once there is at least one completion.
  const showCompletionMultiplier = readOnly && completionCount >= 1;
  // Active rail: member workflow status, never a stale project-level "done" from find-or-create.
  const statusForDot: TaskStatus = readOnly
    ? "done"
    : task.status === "in_progress" || memberStatus === "in_progress"
      ? "in_progress"
      : task.status === "archived"
        ? "archived"
        : "open";

  return (
    <li
      className={cn(
        agencyTaskRowClass,
        isSelected && agencyTaskRowSelectedClass,
        readOnly && agencyTaskRowDoneClass,
        highlight && agencyTaskRowCompleteClass,
      )}
    >
      <div className="relative flex items-center gap-2 px-3 py-2.5">
        <button
          type="button"
          className={cn(
            "absolute inset-0 z-0 rounded-none",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
          )}
          aria-current={isSelected ? "true" : undefined}
          aria-label={`Open thread for ${task.title}`}
          onClick={() => onSelect(task.id)}
        />

        <div className="pointer-events-none relative z-10 flex w-full min-w-0 items-center gap-2">
          <div className="pointer-events-auto">
            <AgencyTaskRowCheckbox
              title={task.title}
              checked={isDone}
              disabled={isRowPending || readOnly}
              onToggle={() => onStatusChange?.(task, "done")}
            />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-1.5">
              <span
                className={cn(
                  "block min-w-0 truncate text-sm font-semibold text-highlighted",
                  readOnly && "text-muted line-through",
                )}
              >
                {task.title}
              </span>
              {showCompletionMultiplier ? (
                <span
                  className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted"
                  aria-label={`Completed ${completionCount} times`}
                >
                  ×{completionCount}
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex min-w-0 flex-wrap items-center gap-2">
              {onSelectProject ? (
                <button
                  type="button"
                  className={cn(
                    agencyTaskRowProjectPillClass,
                    agencyFocusRingClass,
                    "pointer-events-auto motion-reduce:transition-none",
                  )}
                  onClick={() => onSelectProject(task.projectId)}
                >
                  <span className="truncate">{projectName}</span>
                </button>
              ) : (
                <span className={cn(agencyTaskRowProjectPillClass, "truncate")}>{projectName}</span>
              )}

              {dueLabel ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px]",
                    overdue ? "text-error" : "text-muted",
                  )}
                >
                  <Clock className="size-3 shrink-0" aria-hidden />
                  <span className="font-mono tabular-nums">
                    {overdue ? "Overdue" : dueLabel}
                  </span>
                </span>
              ) : null}
            </div>
          </div>

          <div className={cn(agencyTaskRowMetaColumnClass, "pointer-events-auto")}>
            <span
              className={cn(agencyTaskRowStatusDotClass, statusDotColor(statusForDot))}
              title={statusLabel(statusForDot)}
              aria-hidden
            />

            {!readOnly ? (
              <AgencyMiniTimerContainer
                variant="compact"
                teamId={teamId}
                taskId={task.id}
                projectId={task.projectId}
                taskTitle={task.title}
                projectName={projectName}
              />
            ) : null}
          </div>
        </div>
      </div>
    </li>
  );
}
