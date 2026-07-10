import {
  Calendar,
  CalendarCheck,
  Check,
  CircleCheck,
  MoreHorizontal,
  MoreVertical,
  Trash2,
} from "lucide-react";
import type { ReactNode } from "react";

import { AgencyMemberAvatar } from "@/features/shared/agency-member-avatar";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import {
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyTaskRowProjectPillClass,
  agencyTaskRowSelectedClass,
  agencyWorkTableGridClass,
  agencyWorkTableGridDelegatedClass,
  agencyWorkTableGridDoneClass,
  agencyTimeEntryTimeInputClass,
} from "@/features/shared/agency-ui";
import {
  resolveTaskDisplayStatus,
  agencyWorkSurfaceStatusChipClass,
} from "@/features/task-management/agency-task-status";
import { isTaskOverdue } from "@/features/task-management/agency-task-utils";
import {
  formatAgencyDayLabel,
  localDateKeyFromIso,
  todayLocalDateKey,
} from "@/features/time-tracking/format-agency-day-label";
import { projectHuePillStyle } from "@/features/shared/project-palette";
import type { AgencyWorkSurfaceTaskTableRowViewModel } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";
import { cn } from "@/lib/utils";

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
    return {
      label: "In Progress",
      className: agencyWorkSurfaceStatusChipClass("in_progress"),
    };
  }
  if (isTaskOverdue(task.dueDate)) {
    return {
      label: "Due Soon",
      className: agencyWorkSurfaceStatusChipClass("due_soon"),
    };
  }
  return {
    label: "Planned",
    className: agencyWorkSurfaceStatusChipClass("planned"),
  };
}

function resolveDelegatedStatusLabel(task: AgencyProjectTask): {
  label: string;
  className: string;
} {
  if (task.status === "done" || task.viewerStatus === "done") {
    return {
      label: "Completed",
      className: agencyWorkSurfaceStatusChipClass("completed"),
    };
  }

  const assigneeStatus = task.assignees[0]?.status;
  switch (assigneeStatus) {
    case "in_progress":
      return {
        label: "In Progress",
        className: agencyWorkSurfaceStatusChipClass("in_progress"),
      };
    case "done":
      return {
        label: "Completed",
        className: agencyWorkSurfaceStatusChipClass("completed"),
      };
    case "open":
      return {
        label: "Waiting",
        className: agencyWorkSurfaceStatusChipClass("waiting"),
      };
    default: {
      const _exhaustive: never | undefined = assigneeStatus;
      void _exhaustive;
      return {
        label: "In Review",
        className: agencyWorkSurfaceStatusChipClass("in_review"),
      };
    }
  }
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
  viewModel,
  miniTimer,
}: {
  viewModel: AgencyWorkSurfaceTaskTableRowViewModel;
  miniTimer: ReactNode;
}) {
  const {
    task,
    projects,
    variant,
    selected = false,
    highlight = false,
    isRowPending = false,
    onSelect,
    onSelectProject,
    onStatusChange,
    onDueDateChange,
    onReopenToActive,
    onDelete,
    isDark,
    menuOpen,
    dueEditorOpen,
    dueDraft,
    editingDescription,
    descriptionDraft,
    description,
    canEditDescription,
    descriptionInputRef,
    onMenuOpenChange,
    onDueEditorOpenChange,
    onDueDraftDateChange,
    onDueDraftTimeChange,
    onClearDueDate,
    onBeginDescriptionEdit,
    onDescriptionDraftChange,
    onDescriptionDraftKeyDown,
    onDescriptionDraftBlur,
    onMarkDone,
    onReopen,
    onRequestDelete,
  } = viewModel;
  const project = projects.find((entry) => entry.id === task.projectId);
  const projectName = project?.name ?? "Project";
  const categoryLabel = project?.clientName ?? "General";
  const due = formatDueDateTime(task.dueDate);
  const myTasksStatus = resolveMyTasksStatusLabel(task);
  const delegatedStatus = resolveDelegatedStatusLabel(task);
  const primaryAssignee = task.assignees[0] ?? null;
  const completedAt = formatCompletedAt(task.updatedAt);
  const dueLabel = due.time ? `${due.date}, ${due.time}` : due.date;
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
        <div className="flex min-w-0 items-center gap-2">
          {variant === "done" ? (
            <span
              className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary"
              aria-hidden
            >
              <CircleCheck className="size-4 stroke-3 stroke-primary" />
            </span>
          ) : null}
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
            {canEditDescription ? (
              editingDescription ? (
                <Input
                  ref={descriptionInputRef}
                  value={descriptionDraft}
                  onChange={(event) => onDescriptionDraftChange(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={onDescriptionDraftKeyDown}
                  onBlur={onDescriptionDraftBlur}
                  disabled={isRowPending}
                  placeholder="Add description"
                  className={cn(
                    "mt-0.5 h-6 min-w-0 border-0 bg-transparent px-0 text-xs leading-tight shadow-none focus-visible:ring-0",
                    agencyInputPlaceholderClass,
                    "text-muted",
                  )}
                  aria-label={`Description for ${task.title}`}
                />
              ) : description ? (
                <button
                  type="button"
                  className={cn(
                    "mt-0.5 block w-full truncate text-left text-xs leading-tight text-muted hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  disabled={isRowPending}
                  aria-label={`Edit description for ${task.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onBeginDescriptionEdit();
                  }}
                >
                  {description}
                </button>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "mt-0.5 block text-left text-xs leading-tight text-muted hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  disabled={isRowPending}
                  aria-label={`Add description for ${task.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    onBeginDescriptionEdit();
                  }}
                >
                  Add description
                </button>
              )
            ) : description && variant !== "delegated" ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-muted">{description}</p>
            ) : null}
            {variant === "active" ? (
              <div className="mt-1.5 flex flex-wrap gap-1.5 lg:hidden">
                <span
                  className={cn(agencyTaskRowProjectPillClass, "max-w-[8rem] truncate")}
                  style={projectHuePillStyle(task.projectId, isDark)}
                >
                  {projectName}
                </span>
              </div>
            ) : variant === "delegated" ? (
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
            ) : null}
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
          <Popover open={dueEditorOpen} onOpenChange={onDueEditorOpenChange}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-8 min-w-0 max-w-full items-center gap-1.5 rounded-lg px-2 text-left text-sm text-highlighted transition-colors hover:bg-elevated",
                  agencyFocusRingClass,
                )}
                disabled={!onDueDateChange || isRowPending}
                aria-label={`Set due date for ${task.title}, currently ${dueLabel}`}
              >
                <Calendar className="size-3.5 shrink-0 text-muted" aria-hidden />
                <span className="truncate">{dueLabel}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto min-w-[17rem] p-3">
              <div className="grid gap-3">
                <label className="grid gap-1 text-xs font-semibold text-muted">
                  <span>Date</span>
                  <Input
                    type="date"
                    value={dueDraft.date}
                    onChange={(event) => onDueDraftDateChange(event.target.value)}
                    disabled={isRowPending}
                    className="h-8 font-mono text-sm tabular-nums"
                    aria-label="Due date"
                  />
                </label>
                <label className="grid gap-1 text-xs font-semibold text-muted">
                  <span>Time</span>
                  <Input
                    type="time"
                    value={dueDraft.time}
                    onChange={(event) => onDueDraftTimeChange(event.target.value)}
                    disabled={isRowPending}
                    className={agencyTimeEntryTimeInputClass}
                    aria-label="Due time"
                  />
                </label>
                {task.dueDate ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="justify-start px-2"
                    disabled={isRowPending}
                    onClick={onClearDueDate}
                  >
                    Clear due date
                  </Button>
                ) : null}
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {variant === "done" ? (
        <div className="hidden min-w-0 sm:block">
          <span className="font-mono text-sm tabular-nums text-muted">
            {formatTrackedDuration(task.totalTrackedSeconds ?? 0)}
          </span>
        </div>
      ) : null}

      <div className="hidden min-w-0 sm:block">
        {variant === "done" ? (
          <span className={agencyWorkSurfaceStatusChipClass("completed")}>Completed</span>
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
          miniTimer
        ) : variant === "active" ? (
          <span
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-elevated text-muted/50"
            aria-hidden
          >
            <MoreHorizontal className="size-3.5" />
          </span>
        ) : null}
        <Popover open={menuOpen} onOpenChange={onMenuOpenChange}>
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
                onClick={onMarkDone}
              >
                <Check className="size-3.5" />
                Mark done
              </Button>
            ) : null}
            {canEditDescription ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                disabled={isRowPending}
                onClick={() => {
                  onMenuOpenChange(false);
                  onBeginDescriptionEdit();
                }}
              >
                {description ? "Edit description" : "Add description"}
              </Button>
            ) : null}
            {variant === "done" && onReopenToActive ? (
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
                disabled={isRowPending}
                onClick={onReopen}
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
                onClick={onRequestDelete}
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
