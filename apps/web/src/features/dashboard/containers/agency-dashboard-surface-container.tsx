import type { AgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { useAgencyDashboardSurface } from "../hooks/use-agency-dashboard-surface";
import { AgencyDashboardSurfaceView } from "../agency-dashboard-surface-view";

type AgencyDashboardSurfaceContainerProps = {
  teamId: string;
  filters: AgencyTimeRangeFilters;
};

export function AgencyDashboardSurfaceContainer({
  teamId,
  filters,
}: AgencyDashboardSurfaceContainerProps) {
  const viewModel = useAgencyDashboardSurface({ teamId, filters });
  return <AgencyDashboardSurfaceView viewModel={viewModel} />;
}
