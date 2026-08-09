import { useNavigate } from "@/lib/navigation";

import { agencySegmentHref } from "@/features/shared/agency-segments";
import { agencyWorkSurfaceShellClass } from "@/features/shared/agency-ui";
import { AgencyWorkSurface } from "@/features/task-management/agency-work-surface";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyTrackerPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  const navigate = useNavigate();

  return (
    <div className={agencyWorkSurfaceShellClass}>
      <AgencyWorkSurface
        teamId={teamId}
        onSegmentChange={(segment) => navigate(agencySegmentHref(segment))}
      />
    </div>
  );
}
