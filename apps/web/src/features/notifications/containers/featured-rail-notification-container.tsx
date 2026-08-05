import { useFeaturedRailNotification } from "@/features/notifications/hooks/use-featured-rail-notification";
import { FeaturedRailNotificationView } from "@/features/notifications/featured-rail-notification-view";

type FeaturedRailNotificationContainerProps = {
  forceExpanded?: boolean;
};

export function FeaturedRailNotificationContainer(props: FeaturedRailNotificationContainerProps) {
  const view = useFeaturedRailNotification(props);
  return <FeaturedRailNotificationView view={view} />;
}
