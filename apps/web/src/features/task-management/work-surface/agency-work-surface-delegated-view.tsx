import { AlertTriangle, Calendar, CircleDot, MoreHorizontal, UserRound } from "lucide-react";

import { AgencyWorkSurfacePaginationFooter } from "@/features/task-management/work-surface/agency-work-surface-pagination-footer";
import { AgencyWorkSurfaceTableHeaderView } from "@/features/task-management/work-surface/agency-work-surface-table-header-view";
import type { RenderAgencyWorkSurfaceTaskTableRow } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  agencyMutedSectionHeaderClass,
  agencyWorkTableBodyScrollClass,
  agencyWorkTableListClass,
  agencyWorkTableStackClass,
  agencyWorkSurfaceStateClass,
} from "@/features/shared/agency-ui";
import type { AgencyWorkSurfaceDelegatedViewModel } from "./hooks/use-agency-work-surface-delegated";

export function AgencyWorkSurfaceDelegatedView({
  viewModel,
  renderTaskTableRow,
}: {
  viewModel: AgencyWorkSurfaceDelegatedViewModel;
  renderTaskTableRow: RenderAgencyWorkSurfaceTaskTableRow;
}) {
  const { sections, totalLoaded, loading, queryError, errorMessage, retry } = viewModel;
  if (queryError)
    return (
      <div className="p-3 sm:p-4">
        <div className={cn(agencyWorkSurfaceStateClass, "gap-3")}>
          <AlertTriangle className="size-5 text-warning" aria-hidden />
          <p className="text-sm text-muted">{errorMessage}</p>
          <Button size="sm" variant="secondary" onClick={retry}>
            Retry
          </Button>
        </div>
      </div>
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={agencyWorkTableBodyScrollClass}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-none" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <div className={agencyWorkSurfaceStateClass}>
            <p className="text-sm text-muted">No delegated tasks yet.</p>
          </div>
        ) : (
          <div className={agencyWorkTableStackClass}>
            {sections.map((section, sectionIndex) => (
              <div key={section.id} className={agencyWorkTableListClass}>
                {sectionIndex === 0 ? (
                  <AgencyWorkSurfaceTableHeaderView
                    variant="delegated"
                    meta={[
                      { icon: UserRound, label: "Assigned To" },
                      { icon: Calendar, label: "Due" },
                      { icon: CircleDot, label: "Status" },
                      { icon: MoreHorizontal, label: "Actions" },
                    ]}
                  />
                ) : null}
                <div className={agencyMutedSectionHeaderClass}>
                  <div className="min-w-0">
                    <span className="font-semibold text-highlighted">{section.label}</span>
                  </div>
                </div>
                {section.tasks.map((task) =>
                  renderTaskTableRow({
                    task,
                    projects: viewModel.view.projects,
                    teamId: viewModel.view.teamId,
                    variant: "delegated",
                    isRowPending: viewModel.view.isRowPending(task.id),
                    onSelect: (taskId) => viewModel.view.onSelect(taskId),
                  }),
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      <AgencyWorkSurfacePaginationFooter
        rangeStart={totalLoaded === 0 ? 0 : 1}
        rangeEnd={totalLoaded}
        total={Math.max(viewModel.view.assignedTasksTotal, totalLoaded)}
        previousDisabled
        nextDisabled={!viewModel.view.hasMoreAssignedTasks}
        onNext={viewModel.view.onFetchMoreAssignedTasks}
      />
    </div>
  );
}
