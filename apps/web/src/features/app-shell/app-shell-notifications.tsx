import { AgencyNotifications } from "@/features/notifications/agency-notifications";
import { useTeamStore } from "@/features/team/team-store";

type AppShellNotificationsProps = {
  /** `icon` toolbar bell, or a full-width `sidebar` row shown only while unread. */
  variant?: "icon" | "sidebar";
};

/** Shell-level notifications for the current team, on every authenticated screen. */
export function AppShellNotifications({ variant }: AppShellNotificationsProps) {
  const teamId = useTeamStore((s) => s.selectedTeamId);
  if (!teamId) return null;
  return <AgencyNotifications teamId={teamId} variant={variant} />;
}
