import { describe, expect, mock, test } from "bun:test";
import { MutationObserver, QueryClient } from "@tanstack/react-query";

import type { NotificationRecord } from "@orch/api/schemas/notifications";

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

const { orpc } = await import("@/lib/orpc");
const { NOTIFICATION_LIST_LIMIT } =
  await import("@/features/notifications/notification-list-limit");
const {
  applyNotificationCreatedToCache,
  notificationMarkAllReadMutationOptions,
  notificationMarkReadMutationOptions,
  notificationMarkSeenMutationOptions,
} = await import("@/features/notifications/notifications-queries");
const { pickFeaturedRailItem } = await import("@/features/notifications/notification-presentation");

const teamId = "team-test";

function notification(id: string, overrides: Partial<NotificationRecord> = {}): NotificationRecord {
  return {
    id,
    teamId,
    recipientUserId: "user-recipient",
    actorUserId: "user-actor",
    actorName: "Actor",
    actorAvatar: null,
    type: "task.assigned",
    deliveryClass: "interrupt",
    payload: { taskId: "task-1", taskTitle: "Task" },
    readAt: null,
    seenAt: null,
    createdAt: "2026-07-10T00:00:00.000Z",
    updatedAt: "2026-07-10T00:00:00.000Z",
    ...overrides,
  };
}

function listKey() {
  return orpc.notifications.list.queryKey({
    input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
  });
}

function unreadKey() {
  return orpc.notifications.unreadCount.queryKey({ input: { teamId } });
}

function createClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
}

async function flushMicrotasks() {
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

describe("applyNotificationCreatedToCache", () => {
  test("prepends a new notification and increments unread count from known previous state", () => {
    const queryClient = createClient();
    const existing = notification("notification-existing");
    const incoming = notification("notification-incoming");

    queryClient.setQueryData(listKey(), { items: [existing], nextCursor: null });
    queryClient.setQueryData(unreadKey(), { count: 1, actionCount: 1 });

    applyNotificationCreatedToCache(queryClient, teamId, incoming);

    expect(queryClient.getQueryData(listKey())).toEqual({
      items: [incoming, existing],
      nextCursor: null,
    });
    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 2, actionCount: 2 });
  });

  test("duplicate delivery of the same id/version does not drift counts", () => {
    const queryClient = createClient();
    const existing = notification("notification-existing");
    const incoming = notification("notification-incoming");

    queryClient.setQueryData(listKey(), { items: [existing, incoming], nextCursor: null });
    queryClient.setQueryData(unreadKey(), { count: 2, actionCount: 1 });

    applyNotificationCreatedToCache(queryClient, teamId, incoming);

    expect(queryClient.getQueryData(listKey())).toEqual({
      items: [incoming, existing],
      nextCursor: null,
    });
    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 2, actionCount: 1 });
  });

  test("does not increment unread count for an already-seen new notification", () => {
    const queryClient = createClient();
    queryClient.setQueryData(listKey(), { items: [], nextCursor: null });
    queryClient.setQueryData(unreadKey(), { count: 2, actionCount: 1 });

    applyNotificationCreatedToCache(
      queryClient,
      teamId,
      notification("seen", { seenAt: "2026-07-10T00:00:00.000Z" }),
    );

    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 2, actionCount: 2 });
  });

  test("seen → unseen coalescing increments unread from the known previous row", () => {
    const queryClient = createClient();
    const previous = notification("coalesced", {
      seenAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    });
    const incoming = notification("coalesced", {
      seenAt: null,
      updatedAt: "2026-07-10T00:01:00.000Z",
    });

    queryClient.setQueryData(listKey(), { items: [previous], nextCursor: null });
    queryClient.setQueryData(unreadKey(), { count: 0, actionCount: 1 });

    applyNotificationCreatedToCache(queryClient, teamId, incoming);

    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 1, actionCount: 1 });
  });

  test("older events are ignored", () => {
    const queryClient = createClient();
    const current = notification("stale", {
      seenAt: "2026-07-10T00:01:00.000Z",
      updatedAt: "2026-07-10T00:01:00.000Z",
    });
    const older = notification("stale", {
      seenAt: null,
      updatedAt: "2026-07-10T00:00:00.000Z",
    });

    queryClient.setQueryData(listKey(), { items: [current], nextCursor: null });
    queryClient.setQueryData(unreadKey(), { count: 0, actionCount: 1 });

    applyNotificationCreatedToCache(queryClient, teamId, older);

    expect(queryClient.getQueryData(listKey())).toEqual({
      items: [current],
      nextCursor: null,
    });
    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 0, actionCount: 1 });
  });

  test("missing list schedules a coalesced count fetch instead of inventing a zero total", async () => {
    const queryClient = createClient();
    const invalidateCalls: unknown[] = [];
    const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
    queryClient.invalidateQueries = ((
      ...args: Parameters<typeof queryClient.invalidateQueries>
    ) => {
      invalidateCalls.push(args[0]);
      return originalInvalidate(...args);
    }) as typeof queryClient.invalidateQueries;

    applyNotificationCreatedToCache(queryClient, teamId, notification("unknown-list"));
    applyNotificationCreatedToCache(queryClient, teamId, notification("unknown-list-2"));
    await flushMicrotasks();

    expect(queryClient.getQueryData(unreadKey())).toBeUndefined();
    expect(invalidateCalls).toHaveLength(1);
    expect(JSON.stringify(invalidateCalls[0])).toContain("unreadCount");
  });

  test("truncated list with an unknown id schedules a count fetch instead of guessing", async () => {
    const queryClient = createClient();
    const items = Array.from({ length: NOTIFICATION_LIST_LIMIT }, (_, index) =>
      notification(`kept-${index}`),
    );
    queryClient.setQueryData(listKey(), { items, nextCursor: "cursor" });
    queryClient.setQueryData(unreadKey(), { count: 80, actionCount: 12 });

    const invalidateCalls: unknown[] = [];
    const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
    queryClient.invalidateQueries = ((
      ...args: Parameters<typeof queryClient.invalidateQueries>
    ) => {
      invalidateCalls.push(args[0]);
      return originalInvalidate(...args);
    }) as typeof queryClient.invalidateQueries;

    applyNotificationCreatedToCache(queryClient, teamId, notification("off-window"));
    await flushMicrotasks();

    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 80, actionCount: 12 });
    expect(invalidateCalls).toHaveLength(1);
  });

  test("never initializes an unknown total as though zero were authoritative", async () => {
    const queryClient = createClient();
    queryClient.setQueryData(listKey(), { items: [], nextCursor: null });

    applyNotificationCreatedToCache(queryClient, teamId, notification("no-count-yet"));
    await flushMicrotasks();

    expect(queryClient.getQueryData(unreadKey())).toBeUndefined();
  });
});

describe("notification mutation rollback", () => {
  test("failed mark-read restores a dismissed notification", async () => {
    const queryClient = createClient();
    const featured = notification("dismiss-me");
    queryClient.setQueryData(listKey(), { items: [featured], nextCursor: null });
    queryClient.setQueryData(unreadKey(), { count: 1, actionCount: 1 });

    const observer = new MutationObserver(
      queryClient,
      notificationMarkReadMutationOptions(queryClient, teamId, async () => {
        throw new Error("write failed");
      }),
    );

    await observer.mutate(featured.id).catch(() => {});

    const list = queryClient.getQueryData(listKey()) as {
      items: NotificationRecord[];
    };
    expect(list.items[0]?.readAt).toBeNull();
    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 1, actionCount: 1 });
    expect(pickFeaturedRailItem(list.items, false)).toMatchObject({
      kind: "notification",
      featured: expect.objectContaining({ id: "dismiss-me" }),
    });
    observer.reset();
  });

  test("failed mark-seen restores unseen badges", async () => {
    const queryClient = createClient();
    queryClient.setQueryData(listKey(), {
      items: [notification("unseen")],
      nextCursor: null,
    });
    queryClient.setQueryData(unreadKey(), { count: 1, actionCount: 1 });

    const observer = new MutationObserver(
      queryClient,
      notificationMarkSeenMutationOptions(queryClient, teamId, async () => {
        throw new Error("write failed");
      }),
    );

    await observer.mutate().catch(() => {});

    const list = queryClient.getQueryData(listKey()) as {
      items: NotificationRecord[];
    };
    expect(list.items[0]?.seenAt).toBeNull();
    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 1, actionCount: 1 });
    observer.reset();
  });

  test("failed mark-all-read restores unread cards", async () => {
    const queryClient = createClient();
    queryClient.setQueryData(listKey(), {
      items: [notification("unread")],
      nextCursor: null,
    });
    queryClient.setQueryData(unreadKey(), { count: 1, actionCount: 1 });

    const observer = new MutationObserver(
      queryClient,
      notificationMarkAllReadMutationOptions(queryClient, teamId, async () => {
        throw new Error("write failed");
      }),
    );

    await observer.mutate().catch(() => {});

    const list = queryClient.getQueryData(listKey()) as {
      items: NotificationRecord[];
    };
    expect(list.items[0]?.readAt).toBeNull();
    expect(queryClient.getQueryData(unreadKey())).toEqual({ count: 1, actionCount: 1 });
    observer.reset();
  });

  test("app-update still wins the rail card after a failed dismissal rollback", async () => {
    const queryClient = createClient();
    const featured = notification("needs-action");
    queryClient.setQueryData(listKey(), { items: [featured], nextCursor: null });
    queryClient.setQueryData(unreadKey(), { count: 1, actionCount: 1 });

    const observer = new MutationObserver(
      queryClient,
      notificationMarkReadMutationOptions(queryClient, teamId, async () => {
        throw new Error("write failed");
      }),
    );
    await observer.mutate(featured.id).catch(() => {});

    const list = queryClient.getQueryData(listKey()) as {
      items: NotificationRecord[];
    };
    expect(pickFeaturedRailItem(list.items, true).kind).toBe("app-update");
    observer.reset();
  });
});
