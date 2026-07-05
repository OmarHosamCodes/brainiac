import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";

import { AgencyTaskClientGroupView } from "@/components/agency/work/task-list/agency-task-client-group-view";
import type { AgencyTaskClientDisplayGroup } from "@/lib/agency/work/hooks/use-agency-task-list";
import type { AgencyProjectTask, AgencyTaskProject, TaskStatus } from "@/lib/schemas/agency-work";
import type { TaskTrackingState } from "@/lib/agency/work/task-tracking-state";

type FlatRow =
  | { kind: "group"; key: string; group: AgencyTaskClientDisplayGroup; expanded: boolean }
  | { kind: "spacer"; key: string };

type AgencyTaskVirtualListProps = {
  clientGroups: AgencyTaskClientDisplayGroup[];
  collapsedClients: Set<string>;
  projects: AgencyTaskProject[];
  teamId: string;
  selectedTaskId: string;
  highlightBlueprintId: string;
  isRowPending: (taskId: string) => boolean;
  onClientExpandedChange: (clientId: string, expanded: boolean) => void;
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

const GROUP_HEADER_HEIGHT = 40;
const GROUP_TASK_HEIGHT = 68;

function estimateGroupHeight(group: AgencyTaskClientDisplayGroup, expanded: boolean) {
  if (!expanded) return GROUP_HEADER_HEIGHT;
  return GROUP_HEADER_HEIGHT + Math.max(1, group.displayRows.length) * GROUP_TASK_HEIGHT;
}

export function AgencyTaskVirtualList({
  clientGroups,
  collapsedClients,
  projects,
  teamId,
  selectedTaskId,
  highlightBlueprintId,
  isRowPending,
  onClientExpandedChange,
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
    const rows: FlatRow[] = clientGroups.map((group) => ({
      kind: "group",
      key: group.clientId,
      group,
      expanded: !collapsedClients.has(group.clientId),
    }));
    if (hasMore) {
      rows.push({ kind: "spacer", key: "__fetch-more__" });
    }
    return rows;
  }, [clientGroups, collapsedClients, hasMore]);

  const virtualizer = useVirtualizer({
    count: flatRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: (index) => {
      const row = flatRows[index];
      if (!row || row.kind === "spacer") return 24;
      return estimateGroupHeight(row.group, row.expanded);
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
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
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
              <AgencyTaskClientGroupView
                group={row.group}
                expanded={row.expanded}
                projects={projects}
                teamId={teamId}
                selectedTaskId={selectedTaskId}
                isRowPending={isRowPending}
                onExpandedChange={(expanded) =>
                  onClientExpandedChange(row.group.clientId, expanded)
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
