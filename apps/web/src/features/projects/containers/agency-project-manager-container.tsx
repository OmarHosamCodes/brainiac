import { useAgencyProjectManager } from "../hooks/use-agency-project-manager";
import { AgencyProjectManagerView } from "../agency-project-manager-view";

type AgencyProjectManagerContainerProps = {
  teamId: string;
};

export function AgencyProjectManagerContainer({ teamId }: AgencyProjectManagerContainerProps) {
  const viewModel = useAgencyProjectManager(teamId);
  return <AgencyProjectManagerView viewModel={viewModel} />;
}
