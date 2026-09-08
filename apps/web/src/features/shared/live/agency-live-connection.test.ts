import { afterEach, describe, expect, mock, test } from "bun:test";
import { QueryClient } from "@tanstack/react-query";

import { bindQueryClient } from "@/lib/query-client";

const createdWebSockets: MockWebSocket[] = [];
const closeCalls: MockWebSocket[] = [];
let subscribeCallCount = 0;
let liveEventsToYield: unknown[] = [];
let sessionRequestCount = 0;
let handlerLoadGate: Promise<void> = Promise.resolve();

class MockWebSocket {
  readyState = WebSocket.CONNECTING;
  addEventListener = mock(() => {});
  removeEventListener = mock(() => {});
  close = mock(() => {
    closeCalls.push(this);
  });
}

function makeAsyncIterator(events: unknown[] = []) {
  return {
    async *[Symbol.asyncIterator]() {
      for (const event of events) {
        yield event;
      }
      await new Promise(() => {});
    },
  };
}

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
  getRpcBaseUrl: () => "http://localhost:7000",
  getAuthBaseUrl: () => "http://localhost:7000",
}));

mock.module("@/lib/auth-client", () => ({
  authClient: {
    getSession: mock(async () => {
      sessionRequestCount += 1;
      return { data: { user: { id: "user-1" } } };
    }),
    useSession: () => ({ data: { user: { id: "user-1" } }, isPending: false }),
  },
  markAuthSessionReady: () => {},
  whenAuthSessionReady: async () => {},
}));

mock.module("@/features/shared/agency-live-rpc", () => ({
  createAgencyLiveRpcClient: mock(() => {
    const websocket = new MockWebSocket() as unknown as WebSocket;
    createdWebSockets.push(websocket as unknown as MockWebSocket);
    return {
      websocket,
      client: {
        agencyOps: {
          live: {
            subscribe: mock(async () => {
              subscribeCallCount += 1;
              return makeAsyncIterator(liveEventsToYield);
            }),
          },
        },
      },
    };
  }),
  waitForWebSocketOpen: mock(async (websocket: WebSocket) => {
    (websocket as unknown as MockWebSocket).readyState = WebSocket.OPEN;
  }),
  closeAgencyLiveWebSocket: mock((websocket: WebSocket) => {
    closeCalls.push(websocket as unknown as MockWebSocket);
  }),
}));

const originalFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (url.includes("/api/auth/get-session") || url.includes("get-session")) {
    sessionRequestCount += 1;
  }
  return originalFetch(input, init);
}) as typeof fetch;

bindQueryClient(new QueryClient());

const {
  getAgencyLiveConnectionState,
  resetAgencyLiveConnectionsForTest,
  setAgencyLiveHandlerLoadGateForTest,
  setAgencyLiveViewerUserId,
  subscribeAgencyLive,
} = await import("./agency-live-connection");
const { orpc } = await import("@/lib/orpc");
const { NOTIFICATION_LIST_LIMIT } =
  await import("@/features/notifications/notification-list-limit");
const { useAgencyOptimisticStore } = await import("@/features/shared/stores/agency-optimistic");

async function flushLiveWork(times = 25) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

async function waitUntilLive(teamId: string) {
  for (let i = 0; i < 40; i++) {
    if (getAgencyLiveConnectionState(teamId) === "live") {
      return;
    }
    await Promise.resolve();
  }
  throw new Error(`connection for ${teamId} did not become live`);
}

async function waitFor(predicate: () => boolean, label: string, attempts = 80) {
  for (let i = 0; i < attempts; i++) {
    if (predicate()) {
      return;
    }
    await Bun.sleep(1);
  }
  throw new Error(`timed out waiting for ${label}`);
}

function timerEvent(teamId: string, userId: string, description: string) {
  const timestamp = "2026-07-18T09:30:00.000Z";
  return {
    type: "timer.updated" as const,
    teamId,
    userId,
    updatedAt: "2026-07-18T09:30:01.000Z",
    timer: {
      id: `timer-${userId}`,
      teamId,
      userId,
      projectId: "project-1",
      taskId: "task-1",
      taskTitle: "Confirmed task",
      projectName: "Orch",
      description,
      isBillable: false,
      tags: [],
      links: [],
      startedAt: timestamp,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };
}

function notificationEvent(teamId: string, recipientUserId: string, id: string) {
  return {
    type: "notification.created" as const,
    teamId,
    updatedAt: "2026-07-10T00:00:01.000Z",
    notification: {
      id,
      teamId,
      recipientUserId,
      actorUserId: "user-actor",
      actorName: "Actor",
      actorAvatar: null,
      type: "task.assigned" as const,
      deliveryClass: "interrupt" as const,
      payload: { taskId: "task-1", taskTitle: "Task" },
      readAt: null,
      seenAt: null,
      createdAt: "2026-07-10T00:00:00.000Z",
      updatedAt: "2026-07-10T00:00:00.000Z",
    },
  };
}

afterEach(() => {
  resetAgencyLiveConnectionsForTest();
  createdWebSockets.length = 0;
  closeCalls.length = 0;
  subscribeCallCount = 0;
  liveEventsToYield = [];
  sessionRequestCount = 0;
  handlerLoadGate = Promise.resolve();
  setAgencyLiveHandlerLoadGateForTest(() => handlerLoadGate);
});

describe("subscribeAgencyLive", () => {
  test("closes socket when refCount reaches 0", async () => {
    const unsubscribe = subscribeAgencyLive("team-1", () => {});

    await Promise.resolve();
    expect(createdWebSockets).toHaveLength(1);
    expect(closeCalls).toHaveLength(0);

    unsubscribe();
    await Promise.resolve();

    expect(closeCalls).toHaveLength(1);
    expect(closeCalls[0]).toBe(createdWebSockets[0]);
  });

  test("shares one connection when refCount is 2", async () => {
    const listenerA = mock(() => {});
    const listenerB = mock(() => {});

    const unsubscribeA = subscribeAgencyLive("team-1", listenerA);
    const unsubscribeB = subscribeAgencyLive("team-1", listenerB);

    await Promise.resolve();

    expect(createdWebSockets).toHaveLength(1);
    expect(subscribeCallCount).toBe(1);

    unsubscribeA();
    await Promise.resolve();

    expect(closeCalls).toHaveLength(0);
    expect(createdWebSockets).toHaveLength(1);

    unsubscribeB();
    await Promise.resolve();

    expect(closeCalls).toHaveLength(1);
  });

  test("100 timer and notification events with a settled viewer add zero session requests", async () => {
    const teamId = "burst-live-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    queryClient.setQueryData(orpc.notifications.unreadCount.queryKey({ input: { teamId } }), {
      count: 0,
      actionCount: 0,
    });

    const events: unknown[] = [];
    for (let i = 0; i < 50; i++) {
      events.push(timerEvent(teamId, "user-1", `burst-${i}`));
      events.push(notificationEvent(teamId, "user-1", `note-${i}`));
    }
    liveEventsToYield = events;
    sessionRequestCount = 0;

    const unsubscribe = subscribeAgencyLive(teamId, () => {}, { viewerUserId: "user-1" });
    await waitUntilLive(teamId);
    await waitFor(
      () =>
        sessionRequestCount > 0 ||
        useAgencyOptimisticStore.getState().activeTimers[teamId]?.description === "burst-49",
      "burst events to apply",
    );

    expect(sessionRequestCount).toBe(0);
    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]?.description).toBe("burst-49");
    expect(
      queryClient.getQueryData(orpc.notifications.unreadCount.queryKey({ input: { teamId } })),
    ).toEqual({
      count: 50,
      actionCount: 50,
    });

    unsubscribe();
  });

  test("applies the first live event using subscribe-time identity without a session fetch", async () => {
    const teamId = "first-event-team";
    liveEventsToYield = [timerEvent(teamId, "user-1", "first event")];
    sessionRequestCount = 0;

    subscribeAgencyLive(teamId, () => {}, { viewerUserId: "user-1" });
    await waitUntilLive(teamId);
    await waitFor(
      () =>
        sessionRequestCount > 0 ||
        useAgencyOptimisticStore.getState().activeTimers[teamId]?.description === "first event",
      "first live event to apply",
    );

    expect(sessionRequestCount).toBe(0);
    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]?.description).toBe(
      "first event",
    );
  });

  test("discards in-flight handler work after logout", async () => {
    const teamId = "logout-during-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    queryClient.setQueryData(orpc.notifications.unreadCount.queryKey({ input: { teamId } }), {
      count: 0,
      actionCount: 0,
    });
    queryClient.setQueryData(
      orpc.notifications.list.queryKey({
        input: { teamId, limit: NOTIFICATION_LIST_LIMIT },
      }),
      { items: [], nextCursor: null },
    );

    let release: () => void = () => {};
    handlerLoadGate = new Promise<void>((resolve) => {
      release = resolve;
    });
    setAgencyLiveHandlerLoadGateForTest(() => handlerLoadGate);

    liveEventsToYield = [
      timerEvent(teamId, "user-1", "should not apply after logout"),
      notificationEvent(teamId, "user-1", "note-after-logout"),
    ];

    subscribeAgencyLive(teamId, () => {}, { viewerUserId: "user-1" });
    await waitUntilLive(teamId);
    await flushLiveWork();

    setAgencyLiveViewerUserId(null);
    release();
    await flushLiveWork();

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toBeUndefined();
    expect(
      queryClient.getQueryData(orpc.notifications.unreadCount.queryKey({ input: { teamId } })),
    ).toEqual({ count: 0, actionCount: 0 });
  });

  test("reconciles after authenticated subscription startup once identity is available", async () => {
    const teamId = "reconcile-team";
    const queryClient = new QueryClient();
    bindQueryClient(queryClient);
    const invalidateCalls: unknown[] = [];
    const originalInvalidate = queryClient.invalidateQueries.bind(queryClient);
    queryClient.invalidateQueries = ((
      ...args: Parameters<typeof queryClient.invalidateQueries>
    ) => {
      invalidateCalls.push(args[0]);
      return originalInvalidate(...args);
    }) as typeof queryClient.invalidateQueries;

    liveEventsToYield = [timerEvent(teamId, "user-1", "dropped while unsigned")];
    subscribeAgencyLive(teamId, () => {}, { viewerUserId: null });
    await waitUntilLive(teamId);
    await flushLiveWork();

    expect(useAgencyOptimisticStore.getState().activeTimers[teamId]).toBeUndefined();
    expect(invalidateCalls).toHaveLength(0);

    setAgencyLiveViewerUserId("user-1");
    await flushLiveWork();

    expect(invalidateCalls.length).toBeGreaterThan(0);
    const serialized = JSON.stringify(invalidateCalls);
    expect(serialized).toContain("getActive");
    expect(serialized).toContain("notifications");
  });
});
