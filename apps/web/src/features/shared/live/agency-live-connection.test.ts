import { afterEach, describe, expect, mock, test } from "bun:test";

const createdWebSockets: MockWebSocket[] = [];
const closeCalls: MockWebSocket[] = [];
let subscribeCallCount = 0;
let abortSendAttempts = 0;
const unhandledRejections: unknown[] = [];

class MockWebSocket {
  readyState = WebSocket.CONNECTING;
  addEventListener = mock(() => {});
  removeEventListener = mock(() => {});
  close = mock(() => {
    this.readyState = WebSocket.CLOSED;
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

mock.module("@/features/shared/agency-query-options", () => ({
  refreshAgencyLiveGatedPolling: mock(() => {}),
}));

mock.module("@/lib/env", () => ({
  getServerUrl: () => "http://localhost:7000",
}));

mock.module("@/features/shared/live/agency-live-handlers", () => ({
  handleAgencyLiveEvent: mock(() => {}),
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
            subscribe: mock(async (_input: unknown, options?: { signal?: AbortSignal }) => {
              subscribeCallCount += 1;
              // Mirror @orpc/standard-server-peer: abort tries to send on the socket.
              options?.signal?.addEventListener("abort", () => {
                abortSendAttempts += 1;
                const socket = websocket as unknown as MockWebSocket;
                if (socket.readyState !== WebSocket.OPEN) {
                  queueMicrotask(() => {
                    const error = new Error("Cannot send message, WebSocket is not open.");
                    unhandledRejections.push(error);
                  });
                }
              });
              return makeAsyncIterator();
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
    const socket = websocket as unknown as MockWebSocket;
    socket.readyState = WebSocket.CLOSED;
    closeCalls.push(socket);
  }),
}));

const { resetAgencyLiveConnectionsForTest, subscribeAgencyLive } =
  await import("./agency-live-connection");

afterEach(() => {
  resetAgencyLiveConnectionsForTest();
  createdWebSockets.length = 0;
  closeCalls.length = 0;
  subscribeCallCount = 0;
  abortSendAttempts = 0;
  unhandledRejections.length = 0;
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

  test("teardown does not abort oRPC over a closed socket", async () => {
    const unsubscribe = subscribeAgencyLive("team-1", () => {});

    // Allow subscribe() to register its abort listener.
    await Promise.resolve();
    await Promise.resolve();
    expect(subscribeCallCount).toBe(1);

    unsubscribe();
    await Promise.resolve();
    await Promise.resolve();

    expect(closeCalls.length).toBeGreaterThanOrEqual(1);
    expect(abortSendAttempts).toBe(0);
    expect(unhandledRejections).toHaveLength(0);
  });
});
