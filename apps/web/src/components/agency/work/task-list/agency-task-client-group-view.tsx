import { ChevronDown } from "lucide-react";

import { AgencyTaskGroupRowView } from "@/components/agency/work/task-list/agency-task-group-row-view";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import type { TaskTrackingState } from "@/lib/agency/work/task-tracking-state";
import { groupTasksWithinClient } from "@/lib/utils/agency-task-utils";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskClientGroupHeaderClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyTaskClientGroupViewProps = {
  clientId: string;
  clientName: string;
  tasks: AgencyProjectTask[];
  expanded: boolean;
  projects: AgencyTaskProject[];
  teamId: string;
  currentUserId: string;
  selectedTaskId: string;
  isRowPending: (taskId: string) => boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
  onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
  onDelete?: (task: AgencyProjectTask) => void;
  highlightTaskId?: string;
  getTaskTrackingState?: (taskId: string) => TaskTrackingState;
  onTaskDescriptionChange?: (taskId: string, value: string) => void;
};

export function AgencyTaskClientGroupView({
  clientId,
  clientName,
  tasks,
  expanded,
  projects,
  teamId,
  currentUserId,
  selectedTaskId,
  isRowPending,
  onExpandedChange,
  onSelect,
  onSelectProject,
  onStatusChange,
  onDelete,
  highlightTaskId = "",
  getTaskTrackingState,
  onTaskDescriptionChange,
}: AgencyTaskClientGroupViewProps) {
  const panelId = `agency-task-client-group-${clientId}`;
  const taskGroups = groupTasksWithinClient(tasks);
  // Timer sets task.status; member completion uses viewerStatus. Count either.
  const inProgressCount = tasks.filter(
    (task) => task.status === "in_progress" || task.viewerStatus === "in_progress",
  ).length;

  return (
    <section aria-labelledby={`${panelId}-label`}>
      <button
        type="button"
        id={`${panelId}-label`}
        className={cn(
          agencyTaskClientGroupHeaderClass,
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => onExpandedChange(!expanded)}
      >
        <span className="flex min-w-0 items-center gap-1.5">
          <ChevronDown
            className={cn(
              "size-3.5 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200",
              expanded ? "" : "-rotate-90",
            )}
            aria-hidden
          />
          <span className="truncate font-semibold text-highlighted">{clientName}</span>
        </span>
        <span className={cn(agencyMetricClass, "shrink-0 text-[11px] text-muted")}>
          {inProgressCount}/{tasks.length}
        </span>
      </button>

      {expanded ? (
        <ul id={panelId} aria-label={`${clientName} tasks`}>
          {taskGroups.map((group) => (
            <AgencyTaskGroupRowView
              key={group.groupKey}
              group={group}
              mode="work"
              projects={projects}
              teamId={teamId}
              currentUserId={currentUserId}
              selectedTaskId={selectedTaskId}
              isRowPending={isRowPending}
              onSelect={onSelect}
              onSelectProject={onSelectProject}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              highlightTaskId={highlightTaskId}
              getTaskTrackingState={getTaskTrackingState}
              onTaskDescriptionChange={onTaskDescriptionChange}
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
