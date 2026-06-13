import type { AppRouterClient } from "@brainiac/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink as WebSocketRPCLink } from "@orpc/client/websocket";

function toWebSocketRpcUrl(serverUrl: string) {
  const url = new URL(serverUrl);
  url.pathname = "/rpc/ws";
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  return url.toString();
}

export type AgencyLiveConnectionState = "connecting" | "live" | "reconnecting" | "error";

export function createAgencyLiveRpcClient(serverUrl: string): {
  client: AppRouterClient;
  websocket: WebSocket;
} {
  const websocket = new WebSocket(toWebSocketRpcUrl(serverUrl));
  const link = new WebSocketRPCLink({ websocket });
  const client = createORPCClient(link);
  return { client, websocket };
}

export function waitForWebSocketOpen(websocket: WebSocket, timeoutMs = 10_000): Promise<void> {
  if (websocket.readyState === WebSocket.OPEN) {
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      cleanup();
      reject(new Error("WebSocket connection timed out"));
    }, timeoutMs);

    const onOpen = () => {
      cleanup();
      resolve();
    };

    const onError = () => {
      cleanup();
      reject(new Error("WebSocket connection failed"));
    };

    const cleanup = () => {
      window.clearTimeout(timeout);
      websocket.removeEventListener("open", onOpen);
      websocket.removeEventListener("error", onError);
    };

    websocket.addEventListener("open", onOpen);
    websocket.addEventListener("error", onError);
  });
}
