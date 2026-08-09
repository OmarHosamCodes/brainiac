import { useNavigate, useParams } from "@/lib/navigation";

import { AgencyClientDetail } from "@/features/clients/agency-client-detail";
import { agencyProjectHref, agencySegmentHref } from "@/features/shared/agency-segments";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyClientDetailPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  const params = useParams<{ clientId: string }>();
  const navigate = useNavigate();

  return (
    <AgencyClientDetail
      teamId={teamId}
      clientId={params.clientId}
      onBack={() => navigate(agencySegmentHref("clients"))}
      onSelectProject={(projectId) => navigate(agencyProjectHref(projectId))}
    />
  );
}
