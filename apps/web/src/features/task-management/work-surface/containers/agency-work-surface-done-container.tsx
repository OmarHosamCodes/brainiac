import type { AgencyTaskListViewModel } from "@/features/task-management/hooks/use-agency-task-list";
import { AgencyWorkSurfaceDoneView } from "@/features/task-management/work-surface/agency-work-surface-done-view";
import { useAgencyWorkSurfaceDone } from "@/features/task-management/work-surface/hooks/use-agency-work-surface-done";
import type { RenderAgencyWorkSurfaceTaskTableRow } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";

type AgencyWorkSurfaceDoneContainerProps = {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
  renderTaskTableRow: RenderAgencyWorkSurfaceTaskTableRow;
};

export function AgencyWorkSurfaceDoneContainer({
  view,
  renderTaskTableRow,
}: AgencyWorkSurfaceDoneContainerProps) {
  const viewModel = useAgencyWorkSurfaceDone(view);
  return (
    <AgencyWorkSurfaceDoneView viewModel={viewModel} renderTaskTableRow={renderTaskTableRow} />
  );
}
