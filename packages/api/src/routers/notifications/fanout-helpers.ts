import type { NotificationType } from "@orch/db/schema";

export function excludeActor(recipientIds: string[], actorUserId: string | null | undefined) {
  if (!actorUserId) return [...new Set(recipientIds)];
  return [...new Set(recipientIds)].filter((id) => id !== actorUserId);
}

export function messageCoalesceTaskId(type: NotificationType, taskId: string | undefined) {
  if (type !== "task.message" || !taskId) return null;
  return taskId;
}

export function defaultNotificationChannels(type: NotificationType): {
  inApp: boolean;
  push: boolean;
} {
  switch (type) {
    case "timer.activity":
      return { inApp: false, push: false };
    case "task.assigned":
    case "task.message":
    case "journey.milestone":
    case "team.digest":
      return { inApp: true, push: true };
    default: {
      const _exhaustive: never = type;
      return _exhaustive;
    }
  }
}

export function formatDigestHours(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours <= 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
