import { QueryClient } from "@tanstack/react-query";
import { describe, expect, test } from "bun:test";

import type { NotificationRecord } from "@orch/api/schemas/notifications";
import { orpc } from "@/lib/orpc";
import {
  applyNotificationCreatedToCache,
  NOTIFICATION_LIST_LIMIT,
} from "@/features/notifications/notifications-queries";

const teamId = "team-test";

function notification(id: string, seenAt: string | null = null): NotificationRecord {
  return {
    id,
    teamId,
    recipientUserId: "user-recipient",
    actorUserId: "user-actor",
    actorName: "Actor",
    actorAvatar: null,
    type: "task.assigned",
    payload: { taskId: "task-1", taskTitle: "Task" },
    readAt: null,
    seenAt,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
  };
}

describe("applyNotificationCreatedToCache", () => {
  test("prepends a notification, deduplicates its id, and increments unread count", () => {
    const queryClient = new QueryClient();
    const listKey = orpc.notifications.list.queryKey({
      input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
    });
    const unreadKey = orpc.notifications.unreadCount.queryKey({ input: { teamId } });
    const existing = notification("notification-existing");
    const incoming = notification("notification-incoming");

    queryClient.setQueryData(listKey, { items: [existing, incoming], nextCursor: null });
    queryClient.setQueryData(unreadKey, { count: 2 });

    applyNotificationCreatedToCache(queryClient, teamId, incoming);

    expect(queryClient.getQueryData(listKey)).toEqual({
      items: [incoming, existing],
      nextCursor: null,
    });
    expect(queryClient.getQueryData(unreadKey)).toEqual({ count: 3 });
  });

  test("does not increment unread count for an already-seen notification", () => {
    const queryClient = new QueryClient();
    const unreadKey = orpc.notifications.unreadCount.queryKey({ input: { teamId } });
    queryClient.setQueryData(unreadKey, { count: 2 });

    applyNotificationCreatedToCache(
      queryClient,
      teamId,
      notification("seen", "2026-07-10T00:00:00.000Z"),
    );

    expect(queryClient.getQueryData(unreadKey)).toEqual({ count: 2 });
  });
});
