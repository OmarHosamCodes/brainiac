import { getRouteApi } from "@tanstack/react-router";

import { useNavigate } from "@/lib/navigation";

import { AgencyProjectDetail } from "@/features/projects/agency-project-detail";
import { agencyClientHref, agencySegmentHref } from "@/features/shared/agency-segments";
import { useTeamStore } from "@/features/team/team-store";

const projectRouteApi = getRouteApi("/_authenticated/_agency-chrome/agency/projects/$projectId");

export function AgencyProjectDetailPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  const params = projectRouteApi.useParams();
  const { focusTask } = projectRouteApi.useSearch();
  const navigate = useNavigate();

  return (
    <AgencyProjectDetail
      teamId={teamId}
      projectId={params.projectId}
      focusTaskId={focusTask}
      onBack={() => navigate(agencySegmentHref("projects"))}
      onSelectClient={(clientId) => navigate(agencyClientHref(clientId))}
    />
  );
}
