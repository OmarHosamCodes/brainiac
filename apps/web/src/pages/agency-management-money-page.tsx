import { AgencyMoneySurface } from "@/features/money/agency-money-surface";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyManagementMoneyPage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  return <AgencyMoneySurface teamId={teamId} />;
}
