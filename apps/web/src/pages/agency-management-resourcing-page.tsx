import { AgencyResourcingSurface } from "@/features/resourcing/agency-resourcing-surface";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyManagementResourcingPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  return <AgencyResourcingSurface teamId={teamId} />;
}
