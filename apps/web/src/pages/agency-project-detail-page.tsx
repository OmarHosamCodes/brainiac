import { useNavigate, useParams } from "@/lib/navigation";

import { AgencyProjectDetail } from "@/features/projects/agency-project-detail";
import { agencyClientHref, agencySegmentHref } from "@/features/shared/agency-segments";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyProjectDetailPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  const params = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  return (
    <AgencyProjectDetail
      teamId={teamId}
      projectId={params.projectId}
      onBack={() => navigate(agencySegmentHref("projects"))}
      onSelectClient={(clientId) => navigate(agencyClientHref(clientId))}
    />
  );
}
