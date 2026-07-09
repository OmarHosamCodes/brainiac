import { AgencyWorkSurfaceDelegatedView } from "../agency-work-surface-delegated-view";
import { useAgencyWorkSurfaceDelegated } from "../hooks/use-agency-work-surface-delegated";
import type { AgencyTaskListViewModel } from "@/features/task-management/hooks/use-agency-task-list";

export function AgencyWorkSurfaceDelegatedContainer({
  view,
}: {
  view: Extract<AgencyTaskListViewModel, { status: "ready" }>;
}) {
  const viewModel = useAgencyWorkSurfaceDelegated({ view });
  return <AgencyWorkSurfaceDelegatedView viewModel={{ ...viewModel, view }} />;
}
