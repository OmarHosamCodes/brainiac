import type { AgencyLiveEvent } from "@brainiac/api/routers/agency-ops/live";
import { useEffect, useState } from "react";

import { useAgencyOpsStore } from "@/stores/agency-ops";
import { useAgencyTimeTrackingStore } from "@/stores/agency-time-tracking";
import { getServerUrl } from "@/lib/env";
import {
  closeAgencyLiveWebSocket,
  createAgencyLiveRpcClient,
  type AgencyLiveConnectionState,
  waitForWebSocketOpen,
} from "@/lib/utils/agency-live-rpc";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

export function useAgencyLiveSync(teamId: string) {
  const applyOpsLiveEvent = useAgencyOpsStore((s) => s.applyLiveEvent);
  const applyTimeLiveEvent = useAgencyTimeTrackingStore((s) => s.applyLiveEvent);
  const [connectionState, setConnectionState] = useState<AgencyLiveConnectionState>("connecting");

  useEffect(() => {
    let abortController: AbortController | null = null;
    let activeWebSocket: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    function clearReconnectTimer() {
      if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    }

    function closeActiveWebSocket(reason = "subscription ended") {
      if (!activeWebSocket) {
        return;
      }
      closeAgencyLiveWebSocket(activeWebSocket, reason);
      activeWebSocket = null;
    }

    function scheduleReconnect() {
      if (disposed || !teamId) {
        return;
      }

      clearReconnectTimer();
      setConnectionState("reconnecting");
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;

      reconnectTimer = setTimeout(() => {
        void startSubscription(teamId);
      }, delay);
    }

    function applyAgencyLiveEvent(event: AgencyLiveEvent) {
      applyOpsLiveEvent(event);
      applyTimeLiveEvent(event);
    }

    async function startSubscription(nextTeamId: string) {
      abortController?.abort();
      closeActiveWebSocket("subscription replaced");
      abortController = new AbortController();
      const subscriptionSignal = abortController.signal;

      if (!nextTeamId) {
        setConnectionState("connecting");
        return;
      }

      setConnectionState(reconnectAttempt > 0 ? "reconnecting" : "connecting");

      let websocket: WebSocket | null = null;

      try {
        const connection = createAgencyLiveRpcClient(getServerUrl());
        websocket = connection.websocket;
        activeWebSocket = websocket;

        await waitForWebSocketOpen(websocket);

        if (subscriptionSignal.aborted || disposed) {
          return;
        }

        setConnectionState("live");
        reconnectAttempt = 0;

        const iterator = await connection.client.agencyOps.live.subscribe(
          { teamId: nextTeamId },
          { signal: subscriptionSignal },
        );

        for await (const event of iterator) {
          if (subscriptionSignal.aborted || disposed) {
            break;
          }
          applyAgencyLiveEvent(event as AgencyLiveEvent);
        }

        if (!subscriptionSignal.aborted && !disposed) {
          scheduleReconnect();
        }
      } catch (error) {
        if (subscriptionSignal.aborted || disposed) {
          return;
        }

        console.error("[agency-live] subscription error", error);
        setConnectionState("error");
        scheduleReconnect();
      } finally {
        if (websocket && activeWebSocket === websocket) {
          closeActiveWebSocket("subscription ended");
        }
      }
    }

    clearReconnectTimer();
    reconnectAttempt = 0;
    void startSubscription(teamId);

    return () => {
      disposed = true;
      clearReconnectTimer();
      abortController?.abort();
      closeActiveWebSocket("subscription disposed");
    };
  }, [teamId, applyOpsLiveEvent, applyTimeLiveEvent]);

  return { connectionState };
}
