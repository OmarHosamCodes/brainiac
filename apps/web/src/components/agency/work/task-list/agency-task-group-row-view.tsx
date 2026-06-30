import { Check, ChevronDown, Trash2 } from "lucide-react";
import { useState } from "react";

import { AgencyTaskRowView } from "@/components/agency/work/task-list/agency-task-row-view";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import type { AgencyProjectTaskGroup } from "@/lib/utils/agency-task-utils";
import {
  agencyFocusRingClass,
  agencyTaskRowCheckboxCheckedClass,
  agencyTaskRowCheckboxClass,
} from "@/lib/utils/agency-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type MemberStatus = "open" | "in_progress" | "done";

function memberStatusLabel(status: MemberStatus) {
  switch (status) {
    case "open":
      return "Open";
    case "in_progress":
      return "In progress";
    case "done":
      return "Done";
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

function resolveViewerStatus(task: AgencyProjectTask): MemberStatus {
  return task.viewerStatus ?? (task.status === "done" || task.status === "archived" ? "done" : task.status);
}

function countDoneStatuses(group: AgencyProjectTaskGroup, currentUserId?: string): { done: number; total: number } {
  let done = 0;
  let total = 0;

  for (const instance of group.instances) {
    if (currentUserId) {
      if (instance.assignedToTeam) {
        total += 1;
        if (resolveViewerStatus(instance) === "done") done += 1;
        continue;
      }
      const assignee = instance.assignees.find((entry) => entry.userId === currentUserId);
      if (!assignee) continue;
      total += 1;
      if (assignee.status === "done") done += 1;
      continue;
    }

    if (instance.assignees.length === 0) {
      total += 1;
      if (instance.status === "done" || instance.status === "archived") done += 1;
      continue;
    }

    for (const assignee of instance.assignees) {
      total += 1;
      if (assignee.status === "done") done += 1;
    }
  }

  return { done, total };
}

export type AgencyTaskGroupRowViewProps = {
  group: AgencyProjectTaskGroup;
  mode: "work" | "project";
  projects?: AgencyTaskProject[];
  teamId?: string;
  currentUserId?: string;
  selectedTaskId?: string;
  isRowPending?: (taskId: string) => boolean;
  deletingTaskIds?: string[];
  onSelect?: (taskId: string) => void;
  onSelectProject?: (projectId: string) => void;
  onStatusChange?: (task: AgencyProjectTask, status: TaskStatus) => void;
  onDeleteInstance?: (task: AgencyProjectTask) => void;
  readOnly?: boolean;
  highlightTaskId?: string;
};

export function AgencyTaskGroupRowView({
  group,
  mode,
  projects = [],
  teamId = "",
  currentUserId,
  selectedTaskId = "",
  isRowPending = () => false,
  deletingTaskIds = [],
  onSelect,
  onSelectProject,
  onStatusChange,
  onDeleteInstance,
  readOnly = false,
  highlightTaskId = "",
}: AgencyTaskGroupRowViewProps) {
  const [expanded, setExpanded] = useState(group.instanceCount === 1);
  const progress = countDoneStatuses(group, mode === "work" ? currentUserId : undefined);
  const singleInstance = group.instanceCount === 1 ? group.instances[0] : null;

  if (singleInstance && mode === "work") {
    return (
      <AgencyTaskRowView
        task={singleInstance}
        projects={projects}
        teamId={teamId}
        selectedTaskId={selectedTaskId}
        readOnly={readOnly}
        highlight={singleInstance.id === highlightTaskId}
        isRowPending={isRowPending(singleInstance.id)}
        onSelect={onSelect ?? (() => undefined)}
        onSelectProject={onSelectProject}
        onStatusChange={onStatusChange}
      />
    );
  }

  return (
    <li className="border-b border-default last:border-b-0">
      <button
        type="button"
        className={cn(
          "flex w-full items-center gap-2 px-3 py-2.5 text-left transition-colors hover:bg-default/50",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        aria-expanded={expanded}
        onClick={() => setExpanded((value) => !value)}
      >
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200",
            expanded ? "" : "-rotate-90",
          )}
          aria-hidden
        />
        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
          {group.title}
        </span>
        <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-semibold text-muted">
          ×{group.instanceCount}
        </span>
        {progress.total > 0 ? (
          <span className="shrink-0 text-[10px] font-semibold text-muted">
            {progress.done}/{progress.total} done
          </span>
        ) : null}
      </button>

      {expanded ? (
        <ul className="border-t border-default bg-default/30">
          {group.instances.map((instance) => {
            const createdLabel = new Date(instance.createdAt).toLocaleDateString(undefined, {
              month: "short",
              day: "numeric",
            });

            if (mode === "work" && currentUserId) {
              const viewerDone = resolveViewerStatus(instance) === "done";
              return (
                <li
                  key={instance.id}
                  className="grid grid-cols-[auto_1fr_auto] items-center gap-2 border-b border-default/70 px-3 py-2 last:border-b-0"
                >
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={viewerDone}
                    aria-label={viewerDone ? `${group.title} is done` : `Mark ${group.title} done`}
                    disabled={isRowPending(instance.id) || readOnly || viewerDone}
                    className={cn(
                      agencyTaskRowCheckboxClass,
                      viewerDone && agencyTaskRowCheckboxCheckedClass,
                      (isRowPending(instance.id) || readOnly) && "cursor-not-allowed opacity-50",
                    )}
                    onClick={() => onStatusChange?.(instance, "done")}
                  >
                    {viewerDone ? <Check className="size-2.5" strokeWidth={3} aria-hidden /> : null}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "min-w-0 truncate text-left text-xs font-semibold text-highlighted",
                      agencyFocusRingClass,
                      instance.id === selectedTaskId && "text-primary",
                    )}
                    onClick={() => onSelect?.(instance.id)}
                  >
                    {createdLabel}
                    {instance.assignees.length > 0
                      ? ` · ${instance.assignees.map((a) => a.userName).join(", ")}`
                      : instance.assignedToTeam
                        ? " · Entire team"
                        : ""}
                  </button>
                </li>
              );
            }

            return (
              <li
                key={instance.id}
                className="border-b border-default/70 px-3 py-2 last:border-b-0"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] font-semibold text-muted">{createdLabel}</p>
                    <ul className="mt-1 space-y-1">
                      {instance.assignedToTeam ? (
                        <li className="text-xs text-highlighted">Entire team</li>
                      ) : instance.assignees.length === 0 ? (
                        <li className="text-xs text-muted">Unassigned</li>
                      ) : (
                        instance.assignees.map((assignee) => (
                          <li
                            key={assignee.userId}
                            className="flex items-center justify-between gap-2 text-xs"
                          >
                            <span className="truncate font-medium text-highlighted">
                              {assignee.userName}
                            </span>
                            <span className="shrink-0 text-[10px] font-semibold capitalize text-muted">
                              {memberStatusLabel(assignee.status)}
                            </span>
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                  {onDeleteInstance ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label="Delete task"
                      disabled={deletingTaskIds.includes(instance.id)}
                      onClick={() => onDeleteInstance(instance)}
                    >
                      <Trash2 />
                    </Button>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
