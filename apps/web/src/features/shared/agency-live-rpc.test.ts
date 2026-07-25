import { describe, expect, mock, test } from "bun:test";

import { withQuietClosedSend } from "./agency-live-rpc";

describe("withQuietClosedSend", () => {
  test("no-ops send when socket is not OPEN instead of throwing", () => {
    const send = mock(() => {});
    const websocket = {
      readyState: WebSocket.CLOSED,
      send,
      addEventListener: mock(() => {}),
      removeEventListener: mock(() => {}),
      close: mock(() => {}),
    } as unknown as WebSocket;

    const guarded = withQuietClosedSend(websocket);

    expect(guarded.readyState).toBe(WebSocket.OPEN);
    expect(() => guarded.send("ping")).not.toThrow();
    expect(send).not.toHaveBeenCalled();
  });

  test("forwards send when socket is OPEN", () => {
    const send = mock(() => {});
    const websocket = {
      readyState: WebSocket.OPEN,
      send,
      addEventListener: mock(() => {}),
      removeEventListener: mock(() => {}),
      close: mock(() => {}),
    } as unknown as WebSocket;

    withQuietClosedSend(websocket).send("ping");
    expect(send).toHaveBeenCalledWith("ping");
  });
});
