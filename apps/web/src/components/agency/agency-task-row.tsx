import { ChevronDown } from "lucide-react";
import { useState } from "react";

import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { AgencyMiniTimer } from "@/components/agency/agency-mini-timer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRowCompleteClass,
  agencyTaskRowClass,
  agencyTaskRowDoneClass,
  agencyTaskRowSelectedClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";
import { selectIsTaskRowPending, useAgencyOpsStore } from "@/stores/agency-ops";

type Project = {
  id: string;
  clientName: string;
  name: string;
};

export type AgencyProjectTask = {
  id: string;
  teamId: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeUserId: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  dueDate: string | null;
};

export type TaskStatus = AgencyProjectTask["status"];

const ACTIVE_STATUS_OPTIONS: Array<{ label: string; value: TaskStatus }> = [
  { label: "Open", value: "open" },
  { label: "In progress", value: "in_progress" },
  { label: "Done", value: "done" },
];

function statusDotColor(status: TaskStatus) {
  switch (status) {
    case "open":
      return "bg-muted";
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

function isOverdue(iso: string | null): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  return date.setHours(23, 59, 59, 999) < Date.now();
}

function isDueWithinDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return false;
  const endOfDue = new Date(date);
  endOfDue.setHours(23, 59, 59, 999);
  const horizon = Date.now() + days * 24 * 60 * 60 * 1_000;
  return endOfDue.getTime() <= horizon;
}

function shouldShowDueDate(iso: string | null): boolean {
  if (!iso) return false;
  return isOverdue(iso) || isDueWithinDays(iso, 7);
}

type AgencyTaskStatusPillProps = {
  status: TaskStatus;
  title: string;
  disabled?: boolean;
  onStatusChange: (status: TaskStatus) => void;
};

function AgencyTaskStatusPill({
  status,
  title,
  disabled = false,
  onStatusChange,
}: AgencyTaskStatusPillProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-default bg-default px-2 text-[11px] font-semibold text-muted",
            "transition-colors hover:bg-elevated hover:text-highlighted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            disabled && "cursor-not-allowed opacity-50",
          )}
          aria-label={`Status for ${title}: ${statusLabel(status)}`}
          onClick={(event) => event.stopPropagation()}
        >
          <span className={cn("size-1.5 rounded-full", statusDotColor(status))} aria-hidden />
          <span className="max-w-[4.5rem] truncate">{statusLabel(status)}</span>
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-40 p-1">
        <ul role="listbox" aria-label={`Status for ${title}`}>
          {ACTIVE_STATUS_OPTIONS.map((option) => (
            <li key={option.value}>
              <button
                type="button"
                role="option"
                aria-selected={option.value === status}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold",
                  "transition-colors hover:bg-elevated",
                  agencyFocusRingClass,
                  option.value === status ? "text-highlighted" : "text-muted",
                )}
                onClick={() => {
                  onStatusChange(option.value);
                  setOpen(false);
                }}
              >
                <span
                  className={cn("size-1.5 rounded-full", statusDotColor(option.value))}
                  aria-hidden
                />
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

export type AgencyTaskRowProps = {
  task: AgencyProjectTask;
  projects: Project[];
  teamId: string;
  selectedTaskId: string;
  readOnly?: boolean;
  highlight?: boolean;
  isRowPending: boolean;
  onSelect: (taskId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
};

export function AgencyTaskRow({
  task,
  projects,
  teamId,
  selectedTaskId,
  readOnly = false,
  highlight = false,
  isRowPending,
  onSelect,
  onStatusChange,
}: AgencyTaskRowProps) {
  const project = projects.find((p) => p.id === task.projectId);
  const projectName = project?.name ?? "Project";
  const isSelected = task.id === selectedTaskId;
  const showDue = shouldShowDueDate(task.dueDate);
  const overdue = isOverdue(task.dueDate);

  return (
    <li
      className={cn(
        agencyTaskRowClass,
        isSelected && agencyTaskRowSelectedClass,
        readOnly && agencyTaskRowDoneClass,
        highlight && agencyTaskRowCompleteClass,
      )}
    >
      <div className="flex items-center gap-2 px-3 py-2.5">
        <AgencyProjectHueDot projectId={task.projectId} className="mt-0.5 self-start" />

        <button
          type="button"
          className={cn(
            "min-w-0 flex-1 text-left",
            agencyFocusRingClass,
            "rounded-md motion-reduce:transition-none",
          )}
          aria-current={isSelected ? "true" : undefined}
          onClick={() => onSelect(task.id)}
        >
          <p className="truncate text-sm font-semibold text-highlighted">{task.title}</p>
          <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[11px] text-muted">
            <span className="truncate">{projectName}</span>
            {showDue ? (
              <span
                className={cn(
                  "shrink-0 font-mono tabular-nums",
                  overdue ? "text-error" : "text-muted",
                )}
              >
                {overdue ? "Overdue" : `Due ${formatDueDate(task.dueDate)}`}
              </span>
            ) : null}
          </div>
        </button>

        {!readOnly ? (
          <div className="flex shrink-0 items-center gap-1">
            <AgencyTaskStatusPill
              status={task.status}
              title={task.title}
              disabled={isRowPending}
              onStatusChange={(status) => onStatusChange?.(task, status)}
            />
            <AgencyMiniTimer
              variant="compact"
              teamId={teamId}
              taskId={task.id}
              projectId={task.projectId}
              taskTitle={task.title}
              projectName={projectName}
            />
          </div>
        ) : (
          <span className={cn(agencyMetricClass, "shrink-0 text-[11px] text-muted")}>
            {statusLabel(task.status)}
          </span>
        )}
      </div>
    </li>
  );
}

export function AgencyTaskRowWithPending(props: Omit<AgencyTaskRowProps, "isRowPending">) {
  const isRowPending = useAgencyOpsStore(selectIsTaskRowPending(props.task.id));
  return <AgencyTaskRow {...props} isRowPending={isRowPending} />;
}
