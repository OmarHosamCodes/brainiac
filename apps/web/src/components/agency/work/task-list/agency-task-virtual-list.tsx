import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";

import { AgencyTaskProjectGroupView } from "@/components/agency/work/task-list/agency-task-project-group-view";
import type { AgencyTaskProjectDisplayGroup } from "@/lib/utils/agency-task-rail-grouping";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import type { TaskTrackingState } from "@/lib/agency/work/task-tracking-state";
import { estimateDisplayRowHeight } from "@/lib/utils/agency-task-status";
import {
  AGENCY_TASK_PROJECT_HEADER_HEIGHT,
  estimateProjectGroupHeight,
} from "@/lib/utils/agency-task-rail-grouping";
import type { AgencyTaskDisplayRow } from "@/lib/utils/agency-task-blueprints";

type FlatRow =
  | { kind: "group"; key: string; group: AgencyTaskProjectDisplayGroup; expanded: boolean }
  | { kind: "spacer"; key: string };

type AgencyTaskVirtualListProps = {
  projectGroups: AgencyTaskProjectDisplayGroup[];
  allTasks: AgencyProjectTask[];
  collapsedProjects: Set<string>;
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  highlightBlueprintId: string;
  isRowPending: (taskId: string) => boolean;
  onProjectExpandedChange: (projectId: string, expanded: boolean) => void;
  onSelect: (taskId: string, blueprintId?: string | null) => void;
  onSelectProject: (projectId: string) => void;
  onStatusChange: (task: AgencyProjectTask, status: TaskStatus) => void;
  onDelete?: (task: AgencyProjectTask) => void;
  hasMore?: boolean;
  isFetchingMore?: boolean;
  onFetchMore?: () => void;
  getTaskTrackingState?: (taskId: string, blueprintDescription?: string) => TaskTrackingState;
  onBlueprintDescriptionChange?: (blueprintId: string, value: string) => void;
};

function estimateRowHeight(
  row: AgencyTaskDisplayRow,
  getTaskTrackingState?: (taskId: string, blueprintDescription?: string) => TaskTrackingState,
) {
  const tracking = getTaskTrackingState?.(row.task.id, row.blueprintDescription);
  return estimateDisplayRowHeight(row, tracking?.needsDescription, true);
}

function estimateGroupHeight(
  group: AgencyTaskProjectDisplayGroup,
  expanded: boolean,
  getTaskTrackingState?: (taskId: string, blueprintDescription?: string) => TaskTrackingState,
) {
  if (!expanded) return AGENCY_TASK_PROJECT_HEADER_HEIGHT;
  return estimateProjectGroupHeight({
    group,
    estimateRowHeight: (row) => estimateRowHeight(row, getTaskTrackingState),
  });
}

export function AgencyTaskVirtualList({
  projectGroups,
  allTasks,
  collapsedProjects,
  projects,
  teamId,
  selectedTaskId,
  highlightBlueprintId,
  isRowPending,
  onProjectExpandedChange,
  onSelect,
  onSelectProject,
  onStatusChange,
  onDelete,
  hasMore = false,
  isFetchingMore = false,
  onFetchMore,
  getTaskTrackingState,
  onBlueprintDescriptionChange,
}: AgencyTaskVirtualListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const flatRows = useMemo((): FlatRow[] => {
    const rows: FlatRow[] = projectGroups.map((group) => ({
      kind: "group",
      key: group.projectId,
      group,
      expanded: !collapsedProjects.has(group.projectId),
    }));
    if (hasMore) {
      rows.push({ kind: "spacer", key: "__fetch-more__" });
    }
    return rows;
  }, [projectGroups, collapsedProjects, hasMore]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = flatRows[index];
      if (!row || row.kind === "spacer") return 24;
      return estimateGroupHeight(row.group, row.expanded, getTaskTrackingState);
    },
    overscan: 4,
  });

  const virtualItems = virtualizer.getVirtualItems();

  useEffect(() => {
    if (!hasMore || isFetchingMore || !onFetchMore) return;
    const last = virtualItems.at(-1);
    if (!last) return;
    if (last.index >= flatRows.length - 2) {
      onFetchMore();
    }
  }, [flatRows.length, hasMore, isFetchingMore, onFetchMore, virtualItems]);

  return (
    <div
      ref={parentRef}
      className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto"
      aria-label="My tasks"
    >
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualItems.map((virtualRow) => {
          const row = flatRows[virtualRow.index];
          if (!row) return null;

          if (row.kind === "spacer") {
            return (
              <div
                key={row.key}
                className="absolute top-0 left-0 w-full px-3 py-1 text-center text-[11px] text-muted"
                style={{ transform: `translateY(${virtualRow.start}px)` }}
              >
                {isFetchingMore ? "Loading more…" : ""}
              </div>
            );
          }

          return (
            <div
              key={row.key}
              className="absolute top-0 left-0 w-full"
              style={{ transform: `translateY(${virtualRow.start}px)` }}
              ref={virtualizer.measureElement}
              data-index={virtualRow.index}
            >
              <AgencyTaskProjectGroupView
                group={row.group}
                expanded={row.expanded}
                allTasks={allTasks}
                projects={projects}
                teamId={teamId}
                selectedTaskId={selectedTaskId}
                isRowPending={isRowPending}
                onExpandedChange={(expanded) =>
                  onProjectExpandedChange(row.group.projectId, expanded)
                }
                onSelect={onSelect}
                onSelectProject={onSelectProject}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                highlightBlueprintId={highlightBlueprintId}
                getTaskTrackingState={getTaskTrackingState}
                onBlueprintDescriptionChange={onBlueprintDescriptionChange}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
