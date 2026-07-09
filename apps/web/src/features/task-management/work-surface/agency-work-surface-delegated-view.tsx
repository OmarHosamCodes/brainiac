import { AlertTriangle, Calendar, CircleDot, MoreHorizontal, UserRound } from "lucide-react";

import { AgencyWorkSurfacePaginationFooter } from "@/features/task-management/work-surface/agency-work-surface-pagination-footer";
import { AgencyWorkSurfaceTableHeaderView } from "@/features/task-management/work-surface/agency-work-surface-table-header-view";
import { AgencyWorkSurfaceTaskTableRowView } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-view";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import {
  agencyMutedSectionHeaderClass,
  agencyWorkTableBodyScrollClass,
  agencyWorkTableListClass,
  agencyWorkTableStackClass,
} from "@/features/shared/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import type { AgencyWorkSurfaceDelegatedViewModel } from "./hooks/use-agency-work-surface-delegated";

export function AgencyWorkSurfaceDelegatedView({
  viewModel,
}: {
  viewModel: AgencyWorkSurfaceDelegatedViewModel;
}) {
  const { sections, totalLoaded, loading, queryError, error, retry } = viewModel;
  if (queryError)
    return (
      <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
        <AlertTriangle className="size-5 text-warning" aria-hidden />
        <p className="text-sm text-muted">
          {getErrorMessage(error, "Could not load delegated tasks.")}
        </p>
        <Button size="sm" variant="secondary" onClick={retry}>
          Retry
        </Button>
      </div>
    );
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className={agencyWorkTableBodyScrollClass}>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-14 w-full rounded-lg" />
            ))}
          </div>
        ) : sections.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted">No delegated tasks yet.</p>
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
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="font-semibold text-highlighted">{section.label}</span>
                    <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold text-muted">
                      {section.tasks.length}
                    </span>
                  </div>
                </div>
                {section.tasks.map((task) => (
                  <AgencyWorkSurfaceTaskTableRowView
                    key={task.id}
                    task={task}
                    projects={viewModel.view.projects}
                    teamId={viewModel.view.teamId}
                    variant="delegated"
                    isRowPending={viewModel.view.isRowPending(task.id)}
                    onSelect={(taskId) => viewModel.view.onSelect(taskId)}
                  />
                ))}
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
