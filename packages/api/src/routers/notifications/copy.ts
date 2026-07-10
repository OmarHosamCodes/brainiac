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
    default: {
      const _exhaustive: never = notification.type;
      return _exhaustive;
    }
  }
}

export function buildNotificationUrl(notification: NotificationRecord) {
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

  return `/agency?${params.toString()}`;
}
