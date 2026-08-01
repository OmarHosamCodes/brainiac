import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams } from "react-router-dom";

import { AgencyMemberProfile } from "@/features/member-profile/agency-member-profile";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { teamListQueryOptions } from "@/features/team/team-queries";
import { useTeamStore } from "@/features/team/team-store";
import { useCurrentAgencyTeam } from "@/features/time-tracking/stores/agency-timer";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function AgencyMemberProfilePage() {
  const params = useParams<{ userId?: string }>();
  const session = authClient.useSession();
  const selfId = session.data?.user?.id ?? "";
  const subjectUserId = params.userId?.trim() || selfId;
  const teamsQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: Boolean(session.data?.user),
  });
  const teams = teamsQuery.data?.items ?? [];
  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const { setCurrentAgencyTeamId } = useCurrentAgencyTeam();

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  useEffect(() => {
    setCurrentAgencyTeamId(selectedTeamId || null);
  }, [selectedTeamId, setCurrentAgencyTeamId]);

  if (session.isPending) {
    return <div className={cn(agencyEmptyPanelClass, "m-6")}>Loading profile…</div>;
  }

  if (!subjectUserId) {
    return (
      <div className={cn(agencyErrorPanelClass, "m-6")}>Sign in to view your Agency profile.</div>
    );
  }

  return <AgencyMemberProfile subjectUserId={subjectUserId} />;
}
