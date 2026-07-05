import { Check, Clock, Plus } from "lucide-react";

import { AgencyMemberAvatar } from "@/components/agency/agency-member-avatar";
import { AgencyTaskRowSwipeShell } from "@/components/agency/work/task-list/agency-task-row-swipe-shell";
import { AgencyMiniTimerContainer } from "@/lib/agency/work/containers/agency-mini-timer-container";
import type { TaskTrackingState } from "@/lib/agency/work/task-tracking-state";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import { Input } from "@/components/ui/input";
import {
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
  const inlineAssigneeStack =
    nested && showAssigneeStack && task.assignees.length > 0;

  const swipeEnabled = !readOnly && Boolean(onDelete) && !isJourneyMilestoneTask(task);
  const inlineNeedsDescriptionHint =
    nested &&
    Boolean(trackingState?.needsDescription) &&
    !blueprintId &&
    !blueprintDescription.trim();
  const showDescriptionRow =
    Boolean(blueprintId) ||
    Boolean(blueprintDescription.trim()) ||
    (Boolean(trackingState?.needsDescription) && !inlineNeedsDescriptionHint);
  const showSecondaryMeta =
    Boolean(dueLabel) ||
    (showAssigneeStack && task.assignees.length > 0 && !inlineAssigneeStack) ||
    (!nested && Boolean(onSelectProject));
  const isSingleLineRow = !showDescriptionRow && !showSecondaryMeta;

  return (
    <li
      className={cn(
        "group/task-row",
        agencyTaskRowClass,
        isSelected && agencyTaskRowSelectedClass,
        readOnly && agencyTaskRowDoneClass,
        highlight && agencyTaskRowCompleteClass,
        trackingState?.needsDescription && agencyTaskRowNeedsDescriptionClass,
      )}
    >
      <AgencyTaskRowSwipeShell
        enabled={swipeEnabled}
        disabled={isRowPending}
        deleteLabel={`Delete ${task.title}`}
        rowLabel={`Open thread for ${task.title}`}
        surfaceClassName={cn(isSelected && "ring-1 ring-inset ring-primary/30")}
        onDeleteRequest={() => onDelete?.(task)}
        onRowActivate={() => onSelect(task.id)}
      >
        <div
          className={cn(
            nested ? agencyTaskRowNestedContentClass : agencyTaskRowContentClass,
            isSingleLineRow ? "items-center" : "items-start",
          )}
        >
          {!swipeEnabled ? (
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
          ) : null}

          <div
            className={cn(
              "pointer-events-none relative z-10 flex w-full min-w-0 gap-1.5",
              isSingleLineRow ? "items-center" : "items-start",
            )}
          >
            <div className={cn("pointer-events-auto shrink-0", !isSingleLineRow && nested && "pt-px")}>
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
                    "min-w-0 flex-1 truncate text-sm leading-tight text-highlighted",
                    nested ? "font-medium" : "font-semibold",
                    readOnly && "text-muted line-through",
                  )}
                >
                  {task.title}
                </span>
                {inlineNeedsDescriptionHint ? (
                  <span
                    className="shrink-0 truncate text-[10px] font-medium text-warning"
                    title="Add a description in the tracker to stop"
                  >
                    Needs note
                  </span>
                ) : null}
                {showCompletionMultiplier ? (
                  <span
                    className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted"
                    aria-label={`Completed ${completionCount} times`}
                  >
                    ×{completionCount}
                  </span>
                ) : null}
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
                          className="size-5 rounded-full ring-2 ring-elevated"
                        />
                      </span>
                    ))}
                    {assigneeOverflow > 0 ? (
                      <span
                        className={cn(
                          "relative z-10 -ml-1.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                          "bg-muted text-[9px] font-bold text-highlighted ring-2 ring-elevated",
                        )}
                        aria-hidden
                      >
                        +{assigneeOverflow}
                      </span>
                    ) : null}
                  </span>
                ) : null}
                <div className="pointer-events-auto ml-auto flex shrink-0 items-center gap-1">
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
                    <span className={cn(agencyTaskRowProjectPillClass, "truncate")}>
                      {projectName}
                    </span>
                  ) : null}

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
                          className="rounded-full ring-2 ring-elevated"
                        />
                      </span>
                    ))}
                    {assigneeOverflow > 0 ? (
                      <span
                        className={cn(
                          "relative z-10 -ml-1.5 flex size-5 shrink-0 items-center justify-center rounded-full",
                          "bg-muted text-[9px] font-bold text-highlighted ring-2 ring-elevated",
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
                  {blueprintId && onBlueprintDescriptionChange ? (
                    <Input
                      value={blueprintDescription}
                      onChange={(e) => onBlueprintDescriptionChange(e.target.value)}
                      onClick={(event) => event.stopPropagation()}
                      onKeyDown={(event) => event.stopPropagation()}
                      placeholder="What are you working on?"
                      className={cn(
                        "h-6 min-w-0 border-0 bg-transparent px-0 text-[11px] leading-tight shadow-none focus-visible:ring-0",
                        agencyInputPlaceholderClass,
                        trackingState?.needsDescription ? "text-warning" : "text-muted",
                      )}
                      aria-label="Task blueprint description"
                    />
                  ) : blueprintDescription.trim() ? (
                    <p className="truncate text-[11px] leading-tight text-muted">{blueprintDescription}</p>
                  ) : trackingState?.needsDescription ? (
                    <p className="truncate text-[11px] leading-tight text-warning">
                      Add a description in the tracker to stop.
                    </p>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </AgencyTaskRowSwipeShell>
    </li>
  );
}
