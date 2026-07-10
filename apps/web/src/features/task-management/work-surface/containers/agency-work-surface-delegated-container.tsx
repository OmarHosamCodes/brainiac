import { AgencyWorkSurfaceDelegatedView } from "../agency-work-surface-delegated-view";
import { useAgencyWorkSurfaceDelegated } from "../hooks/use-agency-work-surface-delegated";
import type { AgencyTaskListViewModel } from "@/features/task-management/hooks/use-agency-task-list";
import type { RenderAgencyWorkSurfaceTaskTableRow } from "@/features/task-management/work-surface/agency-work-surface-task-table-row-model";

export function AgencyWorkSurfaceDelegatedContainer({
  view,
  renderTaskTableRow,
}: {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
  renderTaskTableRow: RenderAgencyWorkSurfaceTaskTableRow;
}) {
  const viewModel = useAgencyWorkSurfaceDelegated({ view });
  return (
    <AgencyWorkSurfaceDelegatedView
      viewModel={{ ...viewModel, view }}
      renderTaskTableRow={renderTaskTableRow}
    />
  );
}
