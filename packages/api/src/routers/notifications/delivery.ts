import type { NotificationRecord } from "../../schemas/notifications";

type PushHandler = (notification: NotificationRecord) => Promise<void>;

let pushHandler: PushHandler | null = null;

export function registerNotificationPushHandler(handler: PushHandler | null) {
  pushHandler = handler;
}

export async function deliverNotificationPush(notification: NotificationRecord) {
  if (!pushHandler) return;
  await pushHandler(notification);
}
