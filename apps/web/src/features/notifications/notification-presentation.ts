import type { NotificationRecord } from "@orch/api/schemas/notifications";

export type NotificationSection = {
  label: "Needs action" | "Updates";
  items: NotificationRecord[];
};

export function formatRelativeTime(iso: string) {
  const deltaMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(deltaMs / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  return `${days}d`;
}

export function formatDigestHours(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

export function isNeedsActionNotification(notification: NotificationRecord) {
  if (notification.readAt) return false;
  if (notification.deliveryClass === "interrupt" || notification.deliveryClass === "breakpoint") {
    return true;
  }
  return notification.type === "task.assigned" || notification.type === "task.message";
}

export function groupNotificationSections(items: NotificationRecord[]): NotificationSection[] {
  const needsAction: NotificationRecord[] = [];
  const updates: NotificationRecord[] = [];

  for (const item of items) {
    if (isNeedsActionNotification(item)) {
      needsAction.push(item);
    } else {
      updates.push(item);
    }
  }

  const sections: NotificationSection[] = [];
  if (needsAction.length > 0) sections.push({ label: "Needs action", items: needsAction });
  if (updates.length > 0) sections.push({ label: "Updates", items: updates });
  return sections;
}

/** Agency Tracker segment id remains `work` (labeled Tracker in nav). */
export function buildNotificationSearchParams(notification: NotificationRecord) {
  const params = new URLSearchParams();
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
    case "task.message":
      params.set("section", "work");
      if (payload.taskId) params.set("task", payload.taskId);
      break;
    case "journey.milestone":
      params.set("section", "projects");
      if (payload.projectId) params.set("project", payload.projectId);
      break;
    case "timer.activity":
      params.set("section", "dashboard");
      break;
    case "team.digest":
      params.set("section", "reports");
      break;
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }

  return params;
}

export function notificationPreferenceLabel(type: NotificationRecord["type"]) {
  switch (type) {
    case "task.assigned":
      return "Task assignments";
    case "task.message":
      return "Task messages";
    case "journey.milestone":
      return "Milestones";
    case "timer.activity":
      return "Timer activity";
    case "team.digest":
      return "Daily digest";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}
