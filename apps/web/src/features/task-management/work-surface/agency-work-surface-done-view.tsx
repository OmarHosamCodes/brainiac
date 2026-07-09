import { AlertTriangle, Calendar, CircleDot, MoreHorizontal, Timer } from "lucide-react";
import { useMemo } from "react";

import { AgencyWorkSurfacePaginationFooter } from "@/features/task-management/work-surface/agency-work-surface-pagination-footer";
import { AgencyWorkSurfaceTableHeaderView } from "@/features/task-management/work-surface/agency-work-surface-table-header-view";
import { AgencyWorkSurfaceTaskTableRowView } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-view";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import type { AgencyTaskListViewModel } from "@/features/task-management/hooks/use-agency-task-list";
import {
  agencyMutedSectionHeaderClass,
  agencyWorkTableBodyScrollClass,
  agencyWorkTableListClass,
  agencyWorkTableStackClass,
} from "@/features/shared/agency-ui";
import { groupTasksByRecency } from "@/features/task-management/group-tasks-by-recency";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyWorkSurfaceDoneViewProps = {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
};

export function AgencyWorkSurfaceDoneView({ view }: AgencyWorkSurfaceDoneViewProps) {
  const sections = useMemo(
    () => groupTasksByRecency(view.doneTasks, (task) => task.updatedAt),
    [view.doneTasks],
  );
  const visibleCount = sections.reduce((sum, section) => sum + section.tasks.length, 0);

  if (view.doneTasksQueryError) {
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <AlertTriangle className="size-5 text-warning" aria-hidden />
        <p className="text-sm text-muted">
          {getErrorMessage(view.doneTasksErrorMessage, "Could not load done tasks.")}
        </p>
        <Button size="sm" variant="secondary" onClick={view.onRetryDoneTasks}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={agencyWorkTableBodyScrollClass}>
        {view.doneTasksLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No completed tasks yet.</p>
        ) : (
          <div className={agencyWorkTableStackClass}>
            {sections.map((section, sectionIndex) => (
              <div key={section.id} className={agencyWorkTableListClass}>
                {sectionIndex === 0 ? (
                  <AgencyWorkSurfaceTableHeaderView
                    variant="done"
                    meta={[
                      { icon: Calendar, label: "Completed At" },
                      { icon: Timer, label: "Duration" },
                      { icon: CircleDot, label: "Status" },
                      { icon: MoreHorizontal, label: "Actions" },
                    ]}
                  />
                ) : null}
                <div className={agencyMutedSectionHeaderClass}>
                  <span className="font-semibold text-highlighted">{section.label}</span>
                  <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold text-muted">
                    {section.tasks.length}
                  </span>
                </div>
                {section.tasks.map((task) => (
                  <AgencyWorkSurfaceTaskTableRowView
                    key={task.id}
                    task={task}
                    projects={view.projects}
                    teamId={view.teamId}
                    variant="done"
                    highlight={task.id === view.recentlyCompletedTaskId}
                    isRowPending={view.isRowPending(task.id)}
                    onSelect={(taskId) => view.onSelect(taskId)}
                    onDescriptionChange={view.onTaskDescriptionChange}
                    onReopenToActive={view.onReopenDoneTask}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      <AgencyWorkSurfacePaginationFooter
        rangeStart={visibleCount === 0 ? 0 : 1}
        rangeEnd={visibleCount}
        total={view.doneTasksTotal}
        previousDisabled
        nextDisabled={!view.hasMoreDoneTasks}
        onNext={view.onFetchMoreDoneTasks}
      />
    </div>
  );
}
