import { AgencyNotifications } from "@/features/notifications/agency-notifications";
import { useTeamStore } from "@/features/team/team-store";

/** Shell-level notifications for the current team, on every authenticated screen. */
export function AppShellNotifications() {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  if (!teamId) return null;
  return <AgencyNotifications teamId={teamId} />;
}
