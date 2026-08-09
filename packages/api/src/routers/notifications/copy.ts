import type { NotificationRecord } from "../../schemas/notifications";
import { formatDigestHours } from "./fanout-helpers";

export function notificationPushCopy(notification: NotificationRecord) {
  const actor = notification.actorName ?? "Someone";
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
      return {
        title: "Task assigned",
        body: `${actor} assigned you "${payload.taskTitle ?? "a task"}"`,
        url: buildNotificationUrl(notification),
      };
    case "task.message": {
      const count = payload.messageCount ?? 1;
      const preview = payload.messagePreview?.trim();
      const body =
        count > 1
          ? `${actor} sent ${count} messages in "${payload.taskTitle ?? "a task"}"`
          : preview
            ? `${actor} in "${payload.taskTitle ?? "a task"}": ${preview}`
            : `${actor} replied in "${payload.taskTitle ?? "a task"}"`;
      return {
        title: "New thread reply",
        body,
        url: buildNotificationUrl(notification),
      };
    }
    case "journey.milestone":
      return {
        title: "Milestone reached",
        body: `${payload.journeyStepLabel ?? "A milestone"} completed on ${payload.projectName ?? "a project"}`,
        url: buildNotificationUrl(notification),
      };
    case "timer.activity":
      return {
        title: payload.timerAction === "stopped" ? "Timer stopped" : "Timer started",
        body:
          payload.timerAction === "stopped"
            ? `${actor} stopped tracking on ${payload.projectName ?? "a project"}`
            : `${actor} started tracking${payload.taskTitle ? ` on "${payload.taskTitle}"` : ` on ${payload.projectName ?? "a project"}`}`,
        url: buildNotificationUrl(notification),
      };
    case "team.digest": {
      const hours = formatDigestHours(payload.digestHoursSeconds ?? 0);
      const tasks = payload.digestTasksCompleted ?? 0;
      return {
        title: "Team daily summary",
        body: `Your team logged ${hours} yesterday, ${tasks} task${tasks === 1 ? "" : "s"} completed`,
        url: buildNotificationUrl(notification),
      };
    }
    case "member.alert": {
      const note = payload.notePreview?.trim();
      return {
        title: payload.alertTitle ?? "Profile alert",
        body: note ? `${actor}: ${note}` : `${actor} sent you a profile alert to review`,
        url: buildNotificationUrl(notification),
      };
    }
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

export function buildNotificationUrl(notification: NotificationRecord) {
  const payload = notification.payload;

  switch (notification.type) {
    case "task.assigned":
    case "task.message":
      return payload.taskId ? `/agency?task=${encodeURIComponent(payload.taskId)}` : "/agency";
    case "journey.milestone":
      return payload.projectId
        ? `/agency/projects/${encodeURIComponent(payload.projectId)}`
        : "/agency/projects";
    case "timer.activity":
      return "/agency/dashboard";
    case "team.digest":
      return "/agency/reports";
    case "member.alert": {
      if (!payload.subjectUserId) return "/agency/management/people";
      const params = new URLSearchParams();
      params.set("focus", "alerts");
      if (payload.alertId) params.set("alertId", payload.alertId);
      if (payload.dateKey && /^\d{4}-\d{2}-\d{2}$/.test(payload.dateKey)) {
        params.set("day", payload.dateKey);
      } else if (payload.periodKey && /^\d{4}-\d{2}$/.test(payload.periodKey)) {
        params.set("period", payload.periodKey);
      }
      return `/agency/members/${encodeURIComponent(payload.subjectUserId)}?${params.toString()}`;
    }
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}
