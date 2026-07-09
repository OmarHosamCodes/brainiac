import { AgencyDashboardSurfaceView } from "../agency-dashboard-surface-view";
import { useAgencyDashboardSurface } from "../hooks/use-agency-dashboard-surface";

type Props = Parameters<typeof useAgencyDashboardSurface>[0];

export function AgencyDashboardSurfaceContainer(props: Props) {
  const viewModel = useAgencyDashboardSurface(props);
  return <AgencyDashboardSurfaceView viewModel={viewModel} />;
}
