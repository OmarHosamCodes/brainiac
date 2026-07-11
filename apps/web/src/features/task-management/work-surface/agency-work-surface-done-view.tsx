import { AlertTriangle, Calendar, CircleDot, MoreHorizontal, Timer } from "lucide-react";

import { AgencyWorkSurfacePaginationFooter } from "@/features/task-management/work-surface/agency-work-surface-pagination-footer";
import { AgencyWorkSurfaceTableHeaderView } from "@/features/task-management/work-surface/agency-work-surface-table-header-view";
import type { RenderAgencyWorkSurfaceTaskTableRow } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import type { AgencyWorkSurfaceDoneViewModel } from "@/features/task-management/work-surface/hooks/use-agency-work-surface-done";
import { cn } from "@/lib/utils";
import {
  agencyMutedSectionHeaderClass,
  agencyWorkTableBodyScrollClass,
  agencyWorkTableListClass,
  agencyWorkTableStackClass,
  agencyWorkSurfaceStateClass,
} from "@/features/shared/agency-ui";

type AgencyWorkSurfaceDoneViewProps = {
  viewModel: AgencyWorkSurfaceDoneViewModel;
  renderTaskTableRow: RenderAgencyWorkSurfaceTaskTableRow;
};

export function AgencyWorkSurfaceDoneView({
  viewModel,
  renderTaskTableRow,
}: AgencyWorkSurfaceDoneViewProps) {
  const { view, sections, visibleCount } = viewModel;

  if (view.doneTasksQueryError) {
    return (
      <div className={cn(agencyWorkSurfaceStateClass, "gap-3")}>
        <AlertTriangle className="size-5 text-warning" aria-hidden />
        <p className="text-sm text-muted">{view.doneTasksErrorMessage}</p>
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
              <Skeleton key={index} className="h-14 w-full rounded-none" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className={agencyWorkSurfaceStateClass}>
            <p className="text-sm text-muted">No completed tasks yet.</p>
          </div>
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
                </div>
                {section.tasks.map((task) =>
                  renderTaskTableRow({
                    task,
                    projects: view.projects,
                    teamId: view.teamId,
                    variant: "done",
                    highlight: task.id === view.recentlyCompletedTaskId,
                    isRowPending: view.isRowPending(task.id),
                    currentUserId: view.currentUserId,
                    teamMembers: view.create.members,
                    onSelect: (taskId) => view.onSelect(taskId),
                    onDescriptionChange: view.onTaskDescriptionChange,
                    onReopenToActive: view.onReopenDoneTask,
                  }),
                )}
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
