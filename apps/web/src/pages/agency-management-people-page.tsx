import { AgencySettingsTenurePane } from "@/features/people/agency-settings-tenure-pane";
import { useTeamStore } from "@/features/team/team-store";

export function AgencyManagementPeoplePage() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  return <AgencySettingsTenurePane teamId={teamId} active />;
}
