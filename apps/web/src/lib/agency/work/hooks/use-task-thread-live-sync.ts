import type { AgencyLiveEvent } from "@brainiac/api/routers/agency-ops/live";
import { useEffect, useState } from "react";

import { getServerUrl } from "@/lib/env";
import {
  closeAgencyLiveWebSocket,
  createAgencyLiveRpcClient,
  type AgencyLiveConnectionState,
  waitForWebSocketOpen,
} from "@/lib/utils/agency-live-rpc";
import { useAgencyTaskMessagesStore } from "@/stores/agency-task-messages";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

type UseTaskThreadLiveSyncOptions = {
  teamId: string;
  taskId: string;
};

function isBenignSubscriptionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message;
  return (
    message.includes("closed or aborted while waiting for pulling") ||
    message.includes("The operation was aborted") ||
    message.includes("WebSocket connection timed out")
  );
}

export function useTaskThreadLiveSync({ teamId, taskId }: UseTaskThreadLiveSyncOptions) {
  const [connectionState, setConnectionState] = useState<AgencyLiveConnectionState>("connecting");

  useEffect(() => {
    let abortController: AbortController | null = null;
    let activeWebSocket: WebSocket | null = null;
    let reconnectAttempt = 0;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;
    let hadLiveConnection = false;
    let subscriptionGeneration = 0;

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

    function scheduleReconnect(generation: number) {
      if (disposed || !teamId || generation !== subscriptionGeneration) {
        return;
      }

      clearReconnectTimer();
      setConnectionState("reconnecting");
      const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
      reconnectAttempt += 1;

      reconnectTimer = setTimeout(() => {
        void startSubscription(teamId, generation);
      }, delay);
    }

    function handleLiveEvent(event: AgencyLiveEvent) {
      if (event.type !== "taskMessage.created") {
        return;
      }
      if (event.taskId !== taskId) {
        return;
      }
      useAgencyTaskMessagesStore.getState().applyLiveMessage(teamId, taskId, event.message);
    }

    async function startSubscription(nextTeamId: string, generation: number) {
      if (disposed || generation !== subscriptionGeneration) {
        return;
      }

      abortController?.abort();
      closeActiveWebSocket("subscription replaced");
      abortController = new AbortController();
      const subscriptionSignal = abortController.signal;

      if (!nextTeamId || !taskId) {
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

        if (subscriptionSignal.aborted || disposed || generation !== subscriptionGeneration) {
          return;
        }

        const iterator = await connection.client.agencyOps.live.subscribe(
          { teamId: nextTeamId },
          { signal: subscriptionSignal },
        );

        if (subscriptionSignal.aborted || disposed || generation !== subscriptionGeneration) {
          return;
        }

        setConnectionState("live");
        reconnectAttempt = 0;

        if (hadLiveConnection) {
          void useAgencyTaskMessagesStore.getState().invalidateTaskMessages(teamId, taskId);
        }
        hadLiveConnection = true;

        for await (const event of iterator) {
          if (subscriptionSignal.aborted || disposed || generation !== subscriptionGeneration) {
            break;
          }
          handleLiveEvent(event as AgencyLiveEvent);
        }

        if (!subscriptionSignal.aborted && !disposed && generation === subscriptionGeneration) {
          scheduleReconnect(generation);
        }
      } catch (error) {
        if (subscriptionSignal.aborted || disposed || generation !== subscriptionGeneration) {
          return;
        }

        if (isBenignSubscriptionError(error)) {
          scheduleReconnect(generation);
          return;
        }

        console.error("[task-thread-live] subscription error", error);
        setConnectionState("error");
        scheduleReconnect(generation);
      } finally {
        if (
          websocket &&
          activeWebSocket === websocket &&
          (disposed || generation !== subscriptionGeneration || subscriptionSignal.aborted)
        ) {
          closeActiveWebSocket("subscription ended");
        }
      }
    }

    clearReconnectTimer();
    reconnectAttempt = 0;
    hadLiveConnection = false;
    subscriptionGeneration += 1;
    const generation = subscriptionGeneration;
    void startSubscription(teamId, generation);

    return () => {
      disposed = true;
      subscriptionGeneration += 1;
      clearReconnectTimer();
      abortController?.abort();
      closeActiveWebSocket("subscription disposed");
    };
  }, [teamId, taskId]);

  return { connectionState };
}
