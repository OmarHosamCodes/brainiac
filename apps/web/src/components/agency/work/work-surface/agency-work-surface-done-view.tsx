import { AlertTriangle, Calendar, Timer } from "lucide-react";
import { useMemo } from "react";

import { AgencyWorkSurfacePaginationFooter } from "@/components/agency/work/work-surface/agency-work-surface-pagination-footer";
import { AgencyWorkSurfaceTaskTableRowView } from "@/components/agency/work/work-surface/agency-work-surface-task-table-row-view";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskListViewModel } from "@/lib/agency/work/hooks/use-agency-task-list";
import {
  agencyMutedSectionHeaderClass,
  agencyWorkTableGridDoneClass,
  agencyWorkTableHeaderClass,
} from "@/lib/utils/agency-ui";
import { groupTasksByRecency } from "@/lib/utils/group-tasks-by-recency";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { cn } from "@/lib/utils";

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
      <div
        className={cn(agencyWorkTableHeaderClass, agencyWorkTableGridDoneClass, "hidden sm:grid")}
      >
        <span>Task</span>
        <span className="inline-flex items-center gap-1.5">
          <Calendar className="size-3.5" aria-hidden />
          Completed At
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Timer className="size-3.5" aria-hidden />
          Duration
        </span>
        <span>Status</span>
        <span className="sr-only">Action</span>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {view.doneTasksLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted">No completed tasks yet.</p>
        ) : (
          sections.map((section) => (
            <section key={section.id}>
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
                  onReopenToActive={view.onReopenDoneTask}
                />
              ))}
            </section>
          ))
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
