import { ChevronDown } from "lucide-react";

import { AgencyTaskProjectGroupView } from "@/features/task-management/task-list/agency-task-project-group-view";
import type { AgencyTaskClientDisplayGroup } from "@/features/task-management/agency-task-rail-grouping";
import type {
  AgencyProjectTask,
  AgencyTaskProject,
  TaskStatus,
} from "@/features/task-management/agency-work";
import type { TaskTrackingState } from "@/features/time-tracking/task-tracking-state";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskClientGroupHeaderClass,
} from "@/features/shared/agency-ui";
import { countClientDisplayRows } from "@/features/task-management/agency-task-rail-grouping";
import { cn } from "@/lib/utils";

export type AgencyTaskClientGroupViewProps = {
  group: AgencyTaskClientDisplayGroup;
  expanded: boolean;
  collapsedProjects: Set<string>;
  allTasks: AgencyProjectTask[];
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  isRowPending: (taskId: string) => boolean;
  onExpandedChange: (expanded: boolean) => void;
  onProjectExpandedChange: (projectId: string, expanded: boolean) => void;
  onSelect: (taskId: string, blueprintId?: string | null) => void;
  onSelectProject: (projectId: string) => void;
  onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
  onDelete?: (task: AgencyProjectTask) => void;
  highlightBlueprintId?: string;
  getTaskTrackingState?: (taskId: string, blueprintDescription?: string) => TaskTrackingState;
  onBlueprintDescriptionChange?: (blueprintId: string, value: string) => void;
  onTrackerDescriptionChange?: (value: string) => void;
  onAssociateTrackerForDescription?: (task: AgencyProjectTask) => void;
  readOnly?: boolean;
  onReopenToActive?: (task: AgencyProjectTask) => void;
  highlightTaskId?: string;
};

export function AgencyTaskClientGroupView({
  group,
  expanded,
  collapsedProjects,
  allTasks,
  projects,
  teamId,
  selectedTaskId,
  isRowPending,
  onExpandedChange,
  onProjectExpandedChange,
  onSelect,
  onSelectProject,
  onStatusChange,
  onDelete,
  highlightBlueprintId = "",
  getTaskTrackingState,
  onBlueprintDescriptionChange,
  onTrackerDescriptionChange,
  onAssociateTrackerForDescription,
  readOnly = false,
  onReopenToActive,
  highlightTaskId = "",
}: AgencyTaskClientGroupViewProps) {
  const panelId = `agency-task-client-group-${group.clientId}`;
  const taskCount = countClientDisplayRows(group);

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
          <span className="truncate font-semibold text-muted">{group.clientName}</span>
        </span>
        <span className={cn(agencyMetricClass, "shrink-0 text-[11px] font-semibold text-muted")}>
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </span>
      </button>

      {expanded ? (
        <div id={panelId}>
          {group.projectGroups.map((projectGroup) => (
            <AgencyTaskProjectGroupView
              key={projectGroup.projectId}
              group={projectGroup}
              expanded={!collapsedProjects.has(projectGroup.projectId)}
              allTasks={allTasks}
              projects={projects}
              teamId={teamId}
              selectedTaskId={selectedTaskId}
              isRowPending={isRowPending}
              onExpandedChange={(nextExpanded) =>
                onProjectExpandedChange(projectGroup.projectId, nextExpanded)
              }
              onSelect={onSelect}
              onSelectProject={onSelectProject}
              onStatusChange={onStatusChange}
              onDelete={onDelete}
              highlightBlueprintId={highlightBlueprintId}
              getTaskTrackingState={getTaskTrackingState}
              onBlueprintDescriptionChange={onBlueprintDescriptionChange}
              onTrackerDescriptionChange={onTrackerDescriptionChange}
              onAssociateTrackerForDescription={onAssociateTrackerForDescription}
              readOnly={readOnly}
              onReopenToActive={onReopenToActive}
              highlightTaskId={highlightTaskId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
