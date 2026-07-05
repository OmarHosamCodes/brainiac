import { ChevronDown, Route } from "lucide-react";
import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { AgencyTaskDisplayRowView } from "@/components/agency/work/task-list/agency-task-display-row-view";
import type { AgencyTaskProjectDisplayGroup } from "@/lib/utils/agency-task-rail-grouping";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import type { TaskTrackingState } from "@/lib/agency/work/task-tracking-state";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskProjectGroupHeaderClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyTaskProjectGroupViewProps = {
  group: AgencyTaskProjectDisplayGroup;
  expanded: boolean;
  allTasks: AgencyProjectTask[];
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  isRowPending: (taskId: string) => boolean;
  onExpandedChange: (expanded: boolean) => void;
  onSelect: (taskId: string, blueprintId?: string | null) => void;
  onSelectProject: (projectId: string) => void;
  onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
  onDelete?: (task: AgencyProjectTask) => void;
  highlightBlueprintId?: string;
  getTaskTrackingState?: (taskId: string, blueprintDescription?: string) => TaskTrackingState;
  onBlueprintDescriptionChange?: (blueprintId: string, value: string) => void;
  readOnly?: boolean;
  onReopenToActive?: (task: AgencyProjectTask) => void;
  highlightTaskId?: string;
};

function formatProjectCounts(group: AgencyTaskProjectDisplayGroup): string {
  const parts: string[] = [];
  if (group.journeyCluster) parts.push("1 journey");
  const taskCount = group.standaloneRows.length;
  if (taskCount > 0) {
    parts.push(`${taskCount} ${taskCount === 1 ? "task" : "tasks"}`);
  }
  return parts.join(" · ");
}

export function AgencyTaskProjectGroupView({
  group,
  expanded,
  allTasks,
  projects,
  teamId,
  selectedTaskId,
  isRowPending,
  onExpandedChange,
  onSelect,
  onSelectProject,
  onStatusChange,
  onDelete,
  highlightBlueprintId = "",
  getTaskTrackingState,
  onBlueprintDescriptionChange,
  readOnly = false,
  onReopenToActive,
  highlightTaskId = "",
}: AgencyTaskProjectGroupViewProps) {
  const panelId = `agency-task-project-group-${group.projectId}`;
  const countLabel = formatProjectCounts(group);
  const displayRows = [
    ...(group.journeyCluster?.milestoneRows ?? []),
    ...group.standaloneRows,
  ];

  return (
    <section aria-labelledby={`${panelId}-label`}>
      <button
        type="button"
        id={`${panelId}-label`}
        className={cn(
          agencyTaskProjectGroupHeaderClass,
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
              "size-3 shrink-0 text-muted motion-safe:transition-transform motion-safe:duration-200",
              expanded ? "" : "-rotate-90",
            )}
            aria-hidden
          />
          {group.journeyCluster !== null ? (
            <Route className="size-3.5 shrink-0 text-info" strokeWidth={2.25} aria-hidden />
          ) : (
            <AgencyProjectHueDot projectId={group.projectId} />
          )}
          <span className="truncate font-semibold text-toned">{group.projectName}</span>
        </span>
        <span className={cn(agencyMetricClass, "shrink-0 text-[10px] font-medium text-muted")}>
          {countLabel}
        </span>
      </button>

      {expanded && displayRows.length > 0 ? (
        <ul id={panelId} aria-label={`${group.projectName} tasks`}>
          {displayRows.map((row) => (
            <AgencyTaskDisplayRowView
              key={row.rowKey}
              row={row}
              allTasks={allTasks}
              projects={projects}
              teamId={teamId}
              selectedTaskId={selectedTaskId}
              readOnly={readOnly}
              highlight={row.blueprintId === highlightBlueprintId || row.task.id === highlightTaskId}
              isRowPending={isRowPending(row.task.id)}
              nested
              trackingState={getTaskTrackingState?.(row.task.id, row.blueprintDescription)}
              onSelect={(taskId) => onSelect(taskId, row.blueprintId)}
              onSelectProject={onSelectProject}
              onStatusChange={onStatusChange}
              onReopenToActive={onReopenToActive}
              onDelete={onDelete}
              onBlueprintDescriptionChange={
                row.blueprintId
                  ? (value) => onBlueprintDescriptionChange?.(row.blueprintId!, value)
                  : undefined
              }
            />
          ))}
        </ul>
      ) : null}
    </section>
  );
}
