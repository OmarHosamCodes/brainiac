import { useAgencyBillingSurface } from "../hooks/use-agency-billing-surface";
import { AgencyBillingSurfaceView } from "../agency-billing-surface-view";

type AgencyBillingSurfaceContainerProps = {
  teamId: string;
};

export function AgencyBillingSurfaceContainer({ teamId }: AgencyBillingSurfaceContainerProps) {
  const viewModel = useAgencyBillingSurface(teamId);
  return <AgencyBillingSurfaceView viewModel={viewModel} />;
}
