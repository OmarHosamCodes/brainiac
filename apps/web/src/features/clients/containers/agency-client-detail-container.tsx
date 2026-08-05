import { AgencyClientDetailView } from "../agency-client-detail-view";
import { useAgencyClientDetail } from "../hooks/use-agency-client-detail";

type AgencyClientDetailContainerProps = {
  teamId: string;
  clientId: string;
  onBack: () => void;
  onSelectProject: (projectId: string) => void;
};

export function AgencyClientDetailContainer({
  teamId,
  clientId,
  onBack,
  onSelectProject,
}: AgencyClientDetailContainerProps) {
  const viewModel = useAgencyClientDetail({
    teamId,
    clientId,
    onArchived: onBack,
  });
  return (
    <AgencyClientDetailView
      viewModel={viewModel}
      onBack={onBack}
      onSelectProject={onSelectProject}
    />
  );
}
