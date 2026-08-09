import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { useParams } from "@/lib/navigation";

import { AgencyMemberProfile } from "@/features/member-profile/agency-member-profile";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { teamListQueryOptions } from "@/features/team/team-queries";
import { useTeamStore } from "@/features/team/team-store";
import { useCurrentAgencyTeam } from "@/features/time-tracking/stores/agency-timer";
import { useAuthSession } from "@/lib/auth-session";
import { cn } from "@/lib/utils";

export function AgencyMemberProfilePage() {
  const params = useParams<{ userId?: string }>();
  const { user, isPending } = useAuthSession();
  const selfId = user?.id ?? "";
  const subjectUserId = params.userId?.trim() || selfId;
  const teamsQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: Boolean(user),
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

  if (isPending) {
    return (
      <div className="h-full min-h-0 overflow-y-auto">
        <div className={cn(agencyEmptyPanelClass, "m-6")}>Loading profile…</div>
      </div>
    );
  }

  if (!subjectUserId) {
    return (
      <div className="h-full min-h-0 overflow-y-auto">
        <div className={cn(agencyErrorPanelClass, "m-6")}>Sign in to view your profile.</div>
      </div>
    );
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto bg-background text-foreground">
      <AgencyMemberProfile subjectUserId={subjectUserId} />
    </div>
  );
}
