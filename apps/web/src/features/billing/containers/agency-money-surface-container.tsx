import { AgencyMoneySurfaceView } from "../agency-money-surface-view";
import { useAgencyMoneySurface } from "../hooks/use-agency-money-surface";

type AgencyMoneySurfaceContainerProps = {
  teamId: string;
};

export function AgencyMoneySurfaceContainer({ teamId }: AgencyMoneySurfaceContainerProps) {
  const viewModel = useAgencyMoneySurface(teamId);
  return <AgencyMoneySurfaceView viewModel={viewModel} />;
}
