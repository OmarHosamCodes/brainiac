import { Check, Clock, CornerDownLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { AgencyMemberAvatar } from "@/components/agency/agency-member-avatar";
import { AgencyMiniTimerContainer } from "@/lib/agency/work/containers/agency-mini-timer-container";
import type { TaskTrackingState } from "@/lib/agency/work/task-tracking-state";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import { Input } from "@/components/ui/input";
import {
  agencyAvatarStackRingClass,
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyTaskRowCheckboxCheckedClass,
  agencyTaskRowCheckboxClass,
  agencyTaskRowCompleteClass,
  agencyTaskRowClass,
  agencyTaskRowContentClass,
  agencyTaskRowDoneClass,
  agencyTaskRowNestedContentClass,
  agencyTaskRowNeedsDescriptionClass,
  agencyTaskRowProjectPillClass,
  agencyTaskRowSelectedClass,
} from "@/lib/utils/agency-ui";
import { isTaskOverdue } from "@/lib/utils/agency-task-utils";
import { isJourneyMilestoneTask } from "@/lib/utils/agency-task-journey";
import { cn } from "@/lib/utils";

const STACK_AVATAR_LIMIT = 4;

export { statusLabel } from "@/lib/utils/agency-task-status";

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
      {checked ? <Check className="size-2" strokeWidth={3} aria-hidden /> : null}
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
  /** Done section: reopen this task into Active. */
  onReopenToActive?: (task: AgencyProjectTask) => void;
  onDelete?: (task: AgencyProjectTask) => void;
  blueprintId?: string | null;
  blueprintDescription?: string;
  showAllAssignees?: boolean;
  nested?: boolean;
  trackingState?: TaskTrackingState;
  onBlueprintDescriptionChange?: (value: string) => void;
  onTrackerDescriptionChange?: (value: string) => void;
  onAssociateTrackerForDescription?: (task: AgencyProjectTask) => void;
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
  onReopenToActive,
  onDelete,
  blueprintId = null,
  blueprintDescription = "",
  showAllAssignees = false,
  nested = false,
  trackingState,
  onBlueprintDescriptionChange,
  onTrackerDescriptionChange,
  onAssociateTrackerForDescription,
}: AgencyTaskRowViewProps) {
  const project = projects.find((p) => p.id === task.projectId);
  const projectName = project?.name ?? "Project";
  const isSelected = task.id === selectedTaskId;
  const memberStatus = task.viewerStatus;
  const completionCount = task.viewerCompletionCount ?? 0;
  const isDone = readOnly || memberStatus === "done";
  const overdue = isTaskOverdue(task.dueDate);
  const dueLabel = task.dueDate ? formatDueDate(task.dueDate) : "";
  const showCompletionMultiplier = readOnly && completionCount >= 1;
  const showAssigneeStack = showAllAssignees || isJourneyMilestoneTask(task);
  const assigneeStack = task.assignees.slice(0, STACK_AVATAR_LIMIT);
  const assigneeOverflow = task.assignees.length - assigneeStack.length;
  const inlineAssigneeStack = nested && showAssigneeStack && task.assignees.length > 0;

  const canDelete = !readOnly && Boolean(onDelete) && !isJourneyMilestoneTask(task);
  const canEditBlueprint = Boolean(blueprintId && onBlueprintDescriptionChange && !readOnly);
  const canEditTracker = Boolean(!readOnly && onTrackerDescriptionChange);
  const [editingDescription, setEditingDescription] = useState(false);
  const descriptionInputRef = useRef<HTMLInputElement>(null);
  const descriptionInputValue = canEditBlueprint
    ? blueprintDescription
    : (trackingState?.trackerDescription ?? "");
  const hasDescription = Boolean(descriptionInputValue.trim());
  const showDescriptionInput = editingDescription && !readOnly;

  useEffect(() => {
    if (editingDescription) {
      descriptionInputRef.current?.focus();
    }
  }, [editingDescription]);
  const showDescriptionRow = readOnly
    ? Boolean(blueprintDescription.trim())
    : hasDescription || showDescriptionInput;
  const showSecondaryMeta =
    !readOnly &&
    (Boolean(dueLabel) ||
      (showAssigneeStack && task.assignees.length > 0 && !inlineAssigneeStack) ||
      (!nested && Boolean(onSelectProject)));
  const isSingleLineRow = !showDescriptionRow && !showSecondaryMeta;
  const alignRowCenter = isSingleLineRow;
  const showDescriptionTrigger = !readOnly && !hasDescription && !showDescriptionInput;

  const beginDescriptionEdit = () => {
    if (!canEditBlueprint) {
      onAssociateTrackerForDescription?.(task);
    }
    setEditingDescription(true);
  };

  const rowActions = (
    <div className="pointer-events-auto flex shrink-0 items-center gap-1">
      {showDescriptionTrigger ? (
        <button
          type="button"
          aria-label={`Add note for ${task.title}`}
          disabled={isRowPending}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted",
            "opacity-0 transition-[opacity,colors] group-hover/task-row:opacity-100 group-focus-within/task-row:opacity-100",
            isSelected && "opacity-100",
            "hover:bg-default hover:text-highlighted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            isRowPending && "cursor-not-allowed opacity-50",
          )}
          onClick={(event) => {
            event.stopPropagation();
            beginDescriptionEdit();
          }}
        >
          <CornerDownLeft className="size-3.5" strokeWidth={2.25} aria-hidden />
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          aria-label={`Delete ${task.title}`}
          disabled={isRowPending}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted",
            "opacity-0 transition-[opacity,colors] group-hover/task-row:opacity-100 group-focus-within/task-row:opacity-100",
            isSelected && "opacity-100",
            "hover:bg-default hover:text-error",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            isRowPending && "cursor-not-allowed opacity-50",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onDelete?.(task);
          }}
        >
          <Trash2 className="size-3.5" strokeWidth={2} aria-hidden />
        </button>
      ) : null}
      {showCompletionMultiplier ? (
        <span
          className="inline-flex h-6 shrink-0 items-center rounded-full bg-muted px-1.5 text-[10px] font-semibold leading-none text-muted"
          aria-label={`Completed ${completionCount} times`}
        >
          ×{completionCount}
        </span>
      ) : null}
      {readOnly && onReopenToActive ? (
        <button
          type="button"
          aria-label={`Add ${task.title} to open tasks`}
          disabled={isRowPending}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-md text-muted",
            "transition-colors hover:bg-default hover:text-highlighted",
            agencyFocusRingClass,
            "motion-reduce:transition-none",
            isRowPending && "cursor-not-allowed opacity-50",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onReopenToActive(task);
          }}
        >
          <Plus className="size-3.5" strokeWidth={2.5} aria-hidden />
        </button>
      ) : null}
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
  );

  const rowSurface = (
    <div
      className={cn(
        nested ? agencyTaskRowNestedContentClass : agencyTaskRowContentClass,
        "items-center",
        isSelected && "ring-1 ring-inset ring-primary/30",
      )}
    >
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

      <div className="pointer-events-none relative z-10 flex w-full min-w-0 items-center gap-1.5">
        <div className={cn("pointer-events-auto shrink-0", !alignRowCenter && "self-start")}>
          <AgencyTaskRowCheckbox
            title={task.title}
            checked={isDone}
            disabled={isRowPending || readOnly}
            onToggle={() => onStatusChange?.(task, "done")}
          />
        </div>

        <div
          className={cn(
            "min-w-0 flex-1",
            !isSingleLineRow && cn("flex flex-col", nested ? "gap-0.5" : "gap-1.5"),
          )}
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-sm leading-tight",
                nested ? "font-medium" : "font-semibold",
                readOnly ? "text-muted line-through decoration-muted/50" : "text-highlighted",
              )}
            >
              {task.title}
            </span>
            {inlineAssigneeStack ? (
              <span className="inline-flex shrink-0 items-center">
                {assigneeStack.map((member, index) => (
                  <span
                    key={member.userId}
                    className={cn("relative", index > 0 && "-ml-1.5")}
                    style={{ zIndex: index + 1 }}
                  >
                    <AgencyMemberAvatar
                      name={member.userName}
                      avatarUrl={member.userAvatar}
                      size="sm"
                      className={cn("size-5 rounded-full", agencyAvatarStackRingClass)}
                    />
                  </span>
                ))}
                {assigneeOverflow > 0 ? (
                  <span
                    className={cn(
                      "relative z-10 -ml-1.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                      "bg-muted text-[9px] font-bold text-foreground",
                      agencyAvatarStackRingClass,
                    )}
                    aria-hidden
                  >
                    +{assigneeOverflow}
                  </span>
                ) : null}
              </span>
            ) : null}
          </div>

          {showSecondaryMeta ? (
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              {onSelectProject && !nested ? (
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
              ) : !nested ? (
                <span className={cn(agencyTaskRowProjectPillClass, "truncate")}>{projectName}</span>
              ) : null}

              {dueLabel ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px]",
                    overdue ? "text-error" : "text-muted",
                  )}
                >
                  <Clock className="size-3 shrink-0" aria-hidden />
                  <span className="font-mono tabular-nums">{overdue ? "Overdue" : dueLabel}</span>
                </span>
              ) : null}

              {showAssigneeStack && task.assignees.length > 0 ? (
                <span className="inline-flex shrink-0 items-center">
                  {assigneeStack.map((member, index) => (
                    <span
                      key={member.userId}
                      className={cn("relative", index > 0 && "-ml-1.5")}
                      style={{ zIndex: index + 1 }}
                    >
                      <AgencyMemberAvatar
                        name={member.userName}
                        avatarUrl={member.userAvatar}
                        size="sm"
                        className={cn("rounded-full", agencyAvatarStackRingClass)}
                      />
                    </span>
                  ))}
                  {assigneeOverflow > 0 ? (
                    <span
                      className={cn(
                        "relative z-10 -ml-1.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                        "bg-muted text-[9px] font-bold text-foreground",
                        agencyAvatarStackRingClass,
                      )}
                      aria-hidden
                    >
                      +{assigneeOverflow}
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          ) : null}

          {showDescriptionRow ? (
            <div className="pointer-events-auto min-w-0">
              {showDescriptionInput ? (
                <Input
                  ref={descriptionInputRef}
                  value={descriptionInputValue}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (canEditBlueprint) {
                      onBlueprintDescriptionChange?.(value);
                      return;
                    }
                    if (canEditTracker) {
                      onTrackerDescriptionChange?.(value);
                    }
                  }}
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    event.stopPropagation();
                    if (event.key === "Escape") {
                      setEditingDescription(false);
                      event.currentTarget.blur();
                    }
                  }}
                  onBlur={() => setEditingDescription(false)}
                  placeholder="What are you working on?"
                  className={cn(
                    "h-6 min-w-0 border-0 bg-transparent px-0 text-[11px] leading-tight shadow-none focus-visible:ring-0",
                    agencyInputPlaceholderClass,
                    trackingState?.needsDescription ? "text-warning" : "text-muted",
                  )}
                  aria-label="Task note"
                />
              ) : descriptionInputValue.trim() ? (
                readOnly ? (
                  <span className="block truncate text-[11px] leading-tight text-muted/80">
                    {descriptionInputValue}
                  </span>
                ) : (
                  <button
                    type="button"
                    className={cn(
                      "block w-full truncate text-left text-[11px] leading-tight text-muted",
                      (canEditBlueprint || canEditTracker) && "hover:text-highlighted",
                      agencyFocusRingClass,
                    )}
                    onClick={(event) => {
                      event.stopPropagation();
                      if (!canEditBlueprint && !canEditTracker) return;
                      beginDescriptionEdit();
                    }}
                  >
                    {descriptionInputValue}
                  </button>
                )
              ) : null}
            </div>
          ) : null}
        </div>

        {rowActions}
      </div>
    </div>
  );

  return (
    <li
      className={cn(
        "group/task-row",
        agencyTaskRowClass,
        isSelected && agencyTaskRowSelectedClass,
        readOnly && agencyTaskRowDoneClass,
        highlight && agencyTaskRowCompleteClass,
        trackingState?.needsDescription && !readOnly && agencyTaskRowNeedsDescriptionClass,
      )}
    >
      {rowSurface}
    </li>
  );
}
