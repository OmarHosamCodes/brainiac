import {
  Calendar,
  CalendarCheck,
  Check,
  Clock,
  MoreHorizontal,
  MoreVertical,
  Trash2,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import { AgencyMemberAvatar } from "@/components/agency/agency-member-avatar";
import { AgencyMiniTimerContainer } from "@/lib/agency/work/containers/agency-mini-timer-container";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import {
  agencyFocusRingClass,
  agencyTaskRowProjectPillClass,
  agencyTaskRowSelectedClass,
  agencyWorkTableGridClass,
  agencyWorkTableGridDelegatedClass,
  agencyWorkTableGridDoneClass,
} from "@/lib/utils/agency-ui";
import { resolveTaskDisplayStatus, statusChipClass } from "@/lib/utils/agency-task-status";
import { isTaskOverdue } from "@/lib/utils/agency-task-utils";
import {
  formatAgencyDayLabel,
  localDateKeyFromIso,
  todayLocalDateKey,
} from "@/lib/utils/format-agency-day-label";
import { projectHuePillStyle } from "@/lib/utils/project-palette";
import { useTheme } from "@/stores/theme";
import { cn } from "@/lib/utils";

export type AgencyWorkSurfaceTaskTableVariant = "active" | "done" | "delegated";

type AgencyWorkSurfaceTaskTableRowViewProps = {
  task: AgencyProjectTask;
  projects: AgencyTaskProject[];
  teamId: string;
  variant: AgencyWorkSurfaceTaskTableVariant;
  selected?: boolean;
  highlight?: boolean;
  isRowPending?: boolean;
  onSelect?: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
  onReopenToActive?: (task: AgencyProjectTask) => void;
  onDelete?: (task: AgencyProjectTask) => void;
};

const delegatedDateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatDueDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return { date: "—", time: "" };
  const dateKey = localDateKeyFromIso(iso);
  return {
    date: formatAgencyDayLabel(dateKey, new Date()),
    time: date
      .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
      .replace(/\sAM/g, " am")
      .replace(/\sPM/g, " pm"),
  };
}

function formatCompletedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const dateKey = localDateKeyFromIso(iso);
  const dayLabel = formatAgencyDayLabel(dateKey, new Date());
  const time = date
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\sAM/g, " am")
    .replace(/\sPM/g, " pm");
  return `${dayLabel} at ${time}`;
}

function formatDelegatedDue(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  const dateKey = localDateKeyFromIso(iso);
  const todayKey = todayLocalDateKey();
  const time = date
    .toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    .replace(/\sAM/g, " am")
    .replace(/\sPM/g, " pm");
  if (dateKey === todayKey) return `Today, ${time}`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKeyFromIso(yesterday.toISOString());
  if (dateKey === yesterdayKey) return `Yesterday, ${time}`;
  return delegatedDateFormatter.format(date);
}

function formatTrackedDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function resolveMyTasksStatusLabel(task: AgencyProjectTask): {
  label: string;
  className: string;
} {
  const displayStatus = resolveTaskDisplayStatus({ task });
  if (displayStatus === "in_progress") {
    return { label: "In Progress", className: statusChipClass("in_progress") };
  }
  if (isTaskOverdue(task.dueDate)) {
    return {
      label: "Due Soon",
      className:
        "inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning",
    };
  }
  return {
    label: "Planned",
    className:
      "inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary",
  };
}

function resolveDelegatedStatusLabel(task: AgencyProjectTask): {
  label: string;
  className: string;
} {
  if (task.status === "done" || task.viewerStatus === "done") {
    return {
      label: "Completed",
      className:
        "inline-flex rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success",
    };
  }

  const assigneeStatus = task.assignees[0]?.status;
  switch (assigneeStatus) {
    case "in_progress":
      return { label: "In Progress", className: statusChipClass("in_progress") };
    case "done":
      return {
        label: "Completed",
        className:
          "inline-flex rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success",
      };
    case "open":
      return {
        label: "Waiting",
        className:
          "inline-flex rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-medium text-warning",
      };
    default: {
      const _exhaustive: never | undefined = assigneeStatus;
      void _exhaustive;
      return {
        label: "In Review",
        className:
          "inline-flex rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary",
      };
    }
  }
}

function taskDescription(task: AgencyProjectTask): string {
  const blueprint = task.viewerBlueprints?.[0];
  return blueprint?.description?.trim() ?? "";
}

function LabeledCell({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-xs text-muted">{label}</p>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export function AgencyWorkSurfaceTaskTableRowView({
  task,
  projects,
  teamId,
  variant,
  selected = false,
  highlight = false,
  isRowPending = false,
  onSelect,
  onSelectProject,
  onStatusChange,
  onReopenToActive,
  onDelete,
}: AgencyWorkSurfaceTaskTableRowViewProps) {
  const { isDark } = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const project = projects.find((entry) => entry.id === task.projectId);
  const projectName = project?.name ?? "Project";
  const categoryLabel = project?.clientName ?? "General";
  const description = taskDescription(task);
  const due = formatDueDateTime(task.dueDate);
  const myTasksStatus = resolveMyTasksStatusLabel(task);
  const delegatedStatus = resolveDelegatedStatusLabel(task);
  const primaryAssignee = task.assignees[0] ?? null;
  const completedAt = formatCompletedAt(task.updatedAt);
  const isDoneTask = task.status === "done" || task.viewerStatus === "done";
  const canTrack =
    variant === "active" && !task.isWaste && task.status !== "archived" && Boolean(project);

  const gridClass =
    variant === "delegated"
      ? agencyWorkTableGridDelegatedClass
      : variant === "done"
        ? agencyWorkTableGridDoneClass
        : agencyWorkTableGridClass;

  const MenuIcon = variant === "active" ? MoreHorizontal : MoreVertical;

  return (
    <div
      className={cn(
        gridClass,
        "border-b border-default transition-colors hover:bg-elevated/45 motion-reduce:transition-none",
        selected && agencyTaskRowSelectedClass,
        highlight && "bg-success/10",
        isRowPending && "opacity-60",
      )}
    >
      <div className="min-w-0">
        <div className="flex min-w-0 items-start gap-2">
          {variant === "done" ? (
            <span
              className="mt-0.5 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-success/15 text-success"
              aria-hidden
            >
              <Check className="size-3" strokeWidth={3} />
            </span>
          ) : (
            <span
              className={cn(
                "mt-1.5 size-2.5 shrink-0 rounded-full",
                resolveTaskDisplayStatus({ task }) === "in_progress"
                  ? "bg-primary"
                  : isTaskOverdue(task.dueDate)
                    ? "bg-warning"
                    : "bg-muted-foreground/50",
              )}
              aria-hidden
            />
          )}
          <div className="min-w-0">
            <button
              type="button"
              className={cn(
                "block max-w-full truncate text-left text-sm font-semibold text-highlighted",
                agencyFocusRingClass,
              )}
              onClick={() => onSelect?.(task.id)}
            >
              {task.title}
            </button>
            {description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted">{description}</p>
            ) : null}
            {variant !== "delegated" ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5 lg:hidden">
                <span
                  className={cn(agencyTaskRowProjectPillClass, "max-w-[8rem] truncate")}
                  style={projectHuePillStyle(task.projectId, isDark)}
                >
                  {projectName}
                </span>
              </div>
            ) : (
              <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(agencyTaskRowProjectPillClass, "max-w-[9rem] truncate")}
                  style={projectHuePillStyle(task.projectId, isDark)}
                >
                  {projectName}
                </span>
                <span className="inline-flex max-w-[8rem] truncate rounded-full border border-default bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                  {categoryLabel}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {variant === "active" ? (
        <div className="hidden min-w-0 lg:block">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              className={cn(
                agencyTaskRowProjectPillClass,
                "max-w-[9rem] truncate",
                agencyFocusRingClass,
              )}
              style={projectHuePillStyle(task.projectId, isDark)}
              onClick={() => onSelectProject?.(task.projectId)}
            >
              {projectName}
            </button>
            <span className="inline-flex max-w-[8rem] truncate rounded-full border border-default bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {categoryLabel}
            </span>
          </div>
        </div>
      ) : null}

      {variant === "delegated" ? (
        <div className="hidden min-w-0 sm:block">
          <LabeledCell label="Assigned to">
            {primaryAssignee ? (
              <div className="flex min-w-0 items-center gap-2">
                <AgencyMemberAvatar
                  name={primaryAssignee.userName}
                  avatarUrl={primaryAssignee.userAvatar}
                  size="sm"
                  className="size-6 rounded-full"
                />
                <span className="truncate text-sm text-highlighted">
                  {primaryAssignee.userName}
                </span>
              </div>
            ) : (
              <span className="text-sm text-muted">Unassigned</span>
            )}
          </LabeledCell>
        </div>
      ) : null}

      <div className="hidden min-w-0 sm:block">
        {variant === "done" ? (
          <span className="text-sm text-highlighted">{completedAt}</span>
        ) : variant === "delegated" ? (
          <LabeledCell label={isDoneTask ? "Completed" : "Due"}>
            <div className="flex items-center gap-1.5 text-sm text-highlighted">
              {isDoneTask ? (
                <CalendarCheck className="size-3.5 shrink-0 text-muted" aria-hidden />
              ) : (
                <Calendar className="size-3.5 shrink-0 text-muted" aria-hidden />
              )}
              <span className="truncate">
                {isDoneTask
                  ? delegatedDateFormatter.format(new Date(task.updatedAt))
                  : formatDelegatedDue(task.dueDate)}
              </span>
            </div>
          </LabeledCell>
        ) : (
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-sm text-highlighted">
              <Calendar className="size-3.5 shrink-0 text-muted" aria-hidden />
              <span className="truncate">{due.date}</span>
            </div>
            {due.time ? (
              <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted">
                <Clock className="size-3 shrink-0" aria-hidden />
                <span>{due.time}</span>
              </div>
            ) : null}
          </div>
        )}
      </div>

      <div className="hidden min-w-0 sm:block">
        {variant === "done" ? (
          <span className="font-mono text-sm tabular-nums text-muted">
            {formatTrackedDuration(task.totalTrackedSeconds ?? 0)}
          </span>
        ) : null}
      </div>

      <div className="hidden min-w-0 sm:block">
        {variant === "done" ? (
          <span className="inline-flex rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-[11px] font-medium text-success">
            Completed
          </span>
        ) : variant === "delegated" ? (
          <LabeledCell label="Status">
            <span className={delegatedStatus.className}>{delegatedStatus.label}</span>
          </LabeledCell>
        ) : (
          <span className={myTasksStatus.className}>{myTasksStatus.label}</span>
        )}
      </div>

      <div className="flex items-center justify-end gap-1">
        {variant === "active" && canTrack ? (
          <AgencyMiniTimerContainer
            variant="compact"
            teamId={teamId}
            taskId={task.id}
            projectId={task.projectId}
            taskTitle={task.title}
            projectName={projectName}
          />
        ) : variant === "active" ? (
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-elevated text-muted/50"
            aria-hidden
          >
            <MoreHorizontal className="size-3.5" />
          </span>
        ) : null}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
              aria-label={`Actions for ${task.title}`}
            >
              <MenuIcon className="size-3.5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-44 p-1">
            {variant === "active" && onStatusChange ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                disabled={isRowPending}
                onClick={() => {
                  setMenuOpen(false);
                  onStatusChange(task, "done");
                }}
              >
                <Check className="size-3.5" />
                Mark done
              </Button>
            ) : null}
            {variant === "done" && onReopenToActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                disabled={isRowPending}
                onClick={() => {
                  setMenuOpen(false);
                  onReopenToActive(task);
                }}
              >
                Reopen task
              </Button>
            ) : null}
            {onDelete ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-error"
                disabled={isRowPending}
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(task);
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </Button>
            ) : null}
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
