import { ChevronDown } from "lucide-react";

import { AgencyTaskRowView } from "@/components/agency/work/task-list/agency-task-row-view";
import type { AgencyTaskClientDisplayGroup } from "@/lib/agency/work/hooks/use-agency-task-list";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import type { TaskTrackingState } from "@/lib/agency/work/task-tracking-state";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskClientGroupHeaderClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type AgencyTaskClientGroupViewProps = {
  group: AgencyTaskClientDisplayGroup;
  expanded: boolean;
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
};

export function AgencyTaskClientGroupView({
  group,
  expanded,
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
}: AgencyTaskClientGroupViewProps) {
  const panelId = `agency-task-client-group-${group.clientId}`;
  const inProgressCount = group.tasks.filter(
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
          <span className="truncate font-semibold text-highlighted">{group.clientName}</span>
        </span>
        <span className={cn(agencyMetricClass, "shrink-0 text-[11px] text-muted")}>
          {inProgressCount}/{group.displayRows.length}
        </span>
      </button>

      {expanded ? (
        <ul id={panelId} aria-label={`${group.clientName} tasks`}>
          {group.displayRows.map((row) => (
            <AgencyTaskRowView
              key={row.rowKey}
              task={row.task}
              projects={projects}
              teamId={teamId}
              selectedTaskId={selectedTaskId}
              highlight={row.blueprintId === highlightBlueprintId}
              isRowPending={isRowPending(row.task.id)}
              blueprintId={row.blueprintId}
              blueprintDescription={row.blueprintDescription}
              trackingState={getTaskTrackingState?.(row.task.id, row.blueprintDescription)}
              onSelect={(taskId) => onSelect(taskId, row.blueprintId)}
              onSelectProject={onSelectProject}
              onStatusChange={onStatusChange}
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
