import { useAgencyNotifications } from "@/features/notifications/hooks/use-agency-notifications";
import { AgencyNotificationsView } from "@/features/notifications/agency-notifications-view";

type AgencyNotificationsContainerProps = {
  teamId: string;
  /** `icon` toolbar bell, or a full-width `sidebar` row shown only while unread. */
  variant?: "icon" | "sidebar";
};

export function AgencyNotificationsContainer(props: AgencyNotificationsContainerProps) {
  const view = useAgencyNotifications(props);
  return <AgencyNotificationsView view={view} />;
}
