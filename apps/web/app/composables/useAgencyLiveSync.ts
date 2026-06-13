import type { AgencyLiveEvent } from "@brainiac/api/routers/agency-ops/live";

import { useAgencyOpsStore } from "~/stores/agency-ops";
import { useAgencyTimeTrackingStore } from "~/stores/agency-time-tracking";
import {
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
  let reconnectAttempt = 0;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;

  function clearReconnectTimer() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
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
    abortController = new AbortController();

    if (!nextTeamId) {
      connectionState.value = "connecting";
      return;
    }

    connectionState.value = reconnectAttempt > 0 ? "reconnecting" : "connecting";

    try {
      const { client, websocket } = createAgencyLiveRpcClient(config.public.serverUrl);
      await waitForWebSocketOpen(websocket);

      connectionState.value = "live";
      reconnectAttempt = 0;

      const iterator = await client.agencyOps.live.subscribe(
        { teamId: nextTeamId },
        { signal: abortController.signal },
      );

      for await (const event of iterator) {
        applyAgencyLiveEvent(event as AgencyLiveEvent);
      }

      if (!abortController.signal.aborted && !disposed) {
        scheduleReconnect();
      }
    } catch (error) {
      if (abortController.signal.aborted || disposed) {
        return;
      }

      console.error("[agency-live] subscription error", error);
      connectionState.value = "error";
      scheduleReconnect();
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
  });

  return {
    connectionState: readonly(connectionState),
  };
}
