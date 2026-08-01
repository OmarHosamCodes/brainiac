import { AgencyResourcingWorkloadView } from "@/features/resourcing/agency-resourcing-workload-view";
import { useAgencyResourcingWorkload } from "@/features/resourcing/hooks/use-agency-resourcing-workload";

type AgencyResourcingSurfaceProps = {
  teamId: string;
};

export function AgencyResourcingSurface({ teamId }: AgencyResourcingSurfaceProps) {
  const viewModel = useAgencyResourcingWorkload(teamId);
  return <AgencyResourcingWorkloadView viewModel={viewModel} />;
}
