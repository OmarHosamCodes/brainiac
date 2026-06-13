import type { AgencyLiveEvent } from "@brainiac/api/routers/agency-ops/live";

import { useAgencyOpsStore } from "~/stores/agency-ops";
import { useAgencyTimeTrackingStore } from "~/stores/agency-time-tracking";
import {
  closeAgencyLiveWebSocket,
  createAgencyLiveRpcClient,
  type AgencyLiveConnectionState,
  waitForWebSocketOpen,
} from "~/utils/agency-live-rpc";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

export function useAgencyLiveSync(teamId: Ref<string>) {
  const config = useRuntimeConfig();
  const agencyOps = useAgencyOpsStore();
  const agencyTimeTracking = useAgencyTimeTrackingStore();

  const connectionState = ref<AgencyLiveConnectionState>("connecting");
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
    if (disposed || !teamId.value) {
      return;
    }

    clearReconnectTimer();
    connectionState.value = "reconnecting";
    const delay = Math.min(RECONNECT_BASE_MS * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
    reconnectAttempt += 1;

    reconnectTimer = setTimeout(() => {
      void startSubscription(teamId.value);
    }, delay);
  }

  async function startSubscription(nextTeamId: string) {
    abortController?.abort();
    closeActiveWebSocket("subscription replaced");
    abortController = new AbortController();
    const subscriptionSignal = abortController.signal;

    if (!nextTeamId) {
      connectionState.value = "connecting";
      return;
    }

    connectionState.value = reconnectAttempt > 0 ? "reconnecting" : "connecting";

    let websocket: WebSocket | null = null;

    try {
      const connection = createAgencyLiveRpcClient(config.public.serverUrl);
      websocket = connection.websocket;
      activeWebSocket = websocket;

      await waitForWebSocketOpen(websocket);

      if (subscriptionSignal.aborted || disposed) {
        return;
      }

      connectionState.value = "live";
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
      connectionState.value = "error";
      scheduleReconnect();
    } finally {
      if (websocket && activeWebSocket === websocket) {
        closeActiveWebSocket("subscription ended");
      }
    }
  }

  function applyAgencyLiveEvent(event: AgencyLiveEvent) {
    agencyOps.applyLiveEvent(event);
    agencyTimeTracking.applyLiveEvent(event);
  }

  watch(
    teamId,
    (next) => {
      clearReconnectTimer();
      reconnectAttempt = 0;
      void startSubscription(next);
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    disposed = true;
    clearReconnectTimer();
    abortController?.abort();
    closeActiveWebSocket("subscription disposed");
  });

  return {
    connectionState: readonly(connectionState),
  };
}
