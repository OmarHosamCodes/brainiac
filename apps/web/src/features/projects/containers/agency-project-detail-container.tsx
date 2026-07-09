import { useAgencyProjectDetail } from "../hooks/use-agency-project-detail";
import { AgencyProjectDetailView } from "../agency-project-detail-view";

type AgencyProjectDetailContainerProps = {
  teamId: string;
  projectId: string;
  onBack: () => void;
};

export function AgencyProjectDetailContainer({
  teamId,
  projectId,
  onBack,
}: AgencyProjectDetailContainerProps) {
  const viewModel = useAgencyProjectDetail({ teamId, projectId });
  return <AgencyProjectDetailView viewModel={viewModel} onBack={onBack} />;
}
