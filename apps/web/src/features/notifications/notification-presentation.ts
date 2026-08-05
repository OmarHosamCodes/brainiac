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
  return (
    notification.type === "task.assigned" ||
    notification.type === "task.message" ||
    notification.type === "member.alert"
  );
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
    case "member.alert":
      break;
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }

  return params;
}

export function notificationHref(notification: NotificationRecord): string | null {
  if (notification.type === "member.alert" && notification.payload.subjectUserId) {
    return `/agency/members/${encodeURIComponent(notification.payload.subjectUserId)}`;
  }
  return null;
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
    case "member.alert":
      return "Profile alerts";
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export type FeaturedNotificationCta = {
  kind: "start-timer" | "open";
  label: string;
};

/** Newest unread Needs-action item first; count is the full Needs-action queue size. */
export function pickFeaturedNeedsAction(items: NotificationRecord[]): {
  featured: NotificationRecord | null;
  count: number;
} {
  const needsAction = items
    .filter(isNeedsActionNotification)
    .slice()
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return {
    featured: needsAction[0] ?? null,
    count: needsAction.length,
  };
}

export function featuredNotificationTitle(notification: NotificationRecord) {
  switch (notification.type) {
    case "task.assigned":
      return "Assigned task";
    case "task.message":
      return "New reply";
    case "member.alert":
      return "Profile alert";
    case "journey.milestone":
      return "Milestone";
    case "timer.activity":
      return "Timer activity";
    case "team.digest":
      return "Daily digest";
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

export function featuredNotificationCta(notification: NotificationRecord): FeaturedNotificationCta {
  const payload = notification.payload;
  if (
    notification.type === "task.assigned" &&
    payload.taskId &&
    payload.projectId &&
    payload.taskTitle &&
    payload.projectName
  ) {
    return { kind: "start-timer", label: "Start timer" };
  }
  if (notification.type === "task.message" && payload.taskId) {
    return { kind: "open", label: "Open task" };
  }
  if (notification.type === "member.alert") {
    return { kind: "open", label: "Review alert" };
  }
  return { kind: "open", label: "Open" };
}

/** Plain one-line body for the featured rail card. */
export function featuredNotificationBody(notification: NotificationRecord) {
  const actor = notification.actorName ?? "Someone";
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
      return `${actor} assigned you ${payload.taskTitle ?? "a task"}`;
    case "task.message": {
      const count = payload.messageCount ?? 1;
      if (count > 1) {
        return `${actor} sent ${count} messages in ${payload.taskTitle ?? "a task"}`;
      }
      return `${actor} replied in ${payload.taskTitle ?? "a task"}`;
    }
    case "member.alert": {
      const title = payload.alertTitle ?? "a profile alert";
      const note = payload.notePreview?.trim();
      return note ? `${actor} sent ${title}: ${note}` : `${actor} sent ${title}`;
    }
    case "journey.milestone":
      return `${payload.journeyStepLabel ?? "Milestone"} completed on ${payload.projectName ?? "a project"}`;
    case "timer.activity":
      return payload.timerAction === "stopped"
        ? `${actor} stopped tracking on ${payload.projectName ?? "a project"}`
        : `${actor} started tracking on ${payload.taskTitle ?? payload.projectName ?? "a project"}`;
    case "team.digest":
      return `Your team logged ${formatDigestHours(payload.digestHoursSeconds ?? 0)} yesterday`;
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

/** Inbox row quick-action kind (shared with featured CTA where applicable). */
export function notificationQuickAction(
  notification: NotificationRecord,
): "start-timer" | "reply" | null {
  if (
    notification.type === "task.assigned" &&
    notification.payload.taskId &&
    notification.payload.projectId
  ) {
    return "start-timer";
  }
  if (notification.type === "task.message" && notification.payload.taskId) {
    return "reply";
  }
  return null;
}
