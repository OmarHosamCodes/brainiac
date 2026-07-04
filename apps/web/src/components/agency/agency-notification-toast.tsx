import { toast } from "sonner";

import type { AgencyNotificationItem } from "@/stores/agency-notifications";

type ShowAgencyNotificationToastOptions = {
  notification: AgencyNotificationItem;
  onOpenTask: (taskId: string) => void;
};

export function showAgencyNotificationToast({
  notification,
  onOpenTask,
}: ShowAgencyNotificationToastOptions) {
  toast(notification.title, {
    description: `${notification.body}\n${notification.description}`,
    action: {
      label: "Open task",
      onClick: () => onOpenTask(notification.taskId),
    },
    duration: 8_000,
  });
}
