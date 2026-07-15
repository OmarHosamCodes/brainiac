import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";
import { useSyncExternalStore } from "react";

import { handleAgencyLiveEvent } from "@/features/shared/live/agency-live-handlers";
import {
  resetAgencyLiveConnectedForTest,
  setAgencyTeamLiveConnected,
} from "@/features/shared/live/agency-live-connected";
import { getServerUrl } from "@/lib/env";
import { refreshAgencyLiveGatedPolling } from "@/features/shared/agency-query-options";
import {
  closeAgencyLiveWebSocket,
  createAgencyLiveRpcClient,
  type AgencyLiveConnectionState,
  waitForWebSocketOpen,
} from "@/features/shared/agency-live-rpc";

const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 15_000;

export type AgencyLiveListener = (event: AgencyLiveEvent) => void;

type TeamLiveConnection = {
  websocket: WebSocket | null;
  refCount: number;
  listeners: Set<AgencyLiveListener>;
  state: AgencyLiveConnectionState;
  stateListeners: Set<() => void>;
  reconnectAttempt: number;
  reconnectTimer: ReturnType<typeof setTimeout> | null;
  abortController: AbortController | null;
  subscriptionGeneration: number;
};

const teamConnections = new Map<string, TeamLiveConnection>();

function isBenignSubscriptionError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }
  const message = error.message;
  return (
    message.includes("closed or aborted while waiting for pulling") ||
    message.includes("The operation was aborted") ||
    message.includes("WebSocket connection timed out") ||
    // oRPC abort listeners send ABORT_SIGNAL over the socket; if the socket
    // already closed, that send rejects — expected during teardown/reconnect.
    message.includes("Cannot send message, WebSocket is not open")
  );
}

/**
 * Stop the live transport without aborting the oRPC request signal.
 *
 * Aborting while the WebSocket is closing races oRPC's async abort listener,
 * which tries to send ABORT_SIGNAL and rejects with an unhandled
 * "Cannot send message, WebSocket is not open." Closing the socket is enough:
 * the peer shuts down and in-flight iterators end.
 */
function stopSubscriptionTransport(
  connection: TeamLiveConnection,
  reason = "subscription ended",
) {
  connection.abortController = null;
  closeConnectionWebSocket(connection, reason);
}

function createEmptyConnection(): TeamLiveConnection {
  return {
    websocket: null,
    refCount: 0,
    listeners: new Set(),
    state: "connecting",
    stateListeners: new Set(),
    reconnectAttempt: 0,
    reconnectTimer: null,
    abortController: null,
    subscriptionGeneration: 0,
  };
}

function getConnection(teamId: string): TeamLiveConnection {
  let connection = teamConnections.get(teamId);
  if (!connection) {
    connection = createEmptyConnection();
    teamConnections.set(teamId, connection);
  }
  return connection;
}

function updateConnectionState(teamId: string, state: AgencyLiveConnectionState) {
  const connection = teamConnections.get(teamId);
  if (!connection || connection.state === state) {
    return;
  }
  connection.state = state;
  setAgencyTeamLiveConnected(teamId, state === "live");
  refreshAgencyLiveGatedPolling(teamId);
  for (const listener of connection.stateListeners) {
    listener();
  }
}

function clearReconnectTimer(connection: TeamLiveConnection) {
  if (connection.reconnectTimer) {
    clearTimeout(connection.reconnectTimer);
    connection.reconnectTimer = null;
  }
}

function closeConnectionWebSocket(connection: TeamLiveConnection, reason = "subscription ended") {
  if (!connection.websocket) {
    return;
  }
  closeAgencyLiveWebSocket(connection.websocket, reason);
  connection.websocket = null;
}

function fanOutEvent(teamId: string, event: AgencyLiveEvent) {
  const connection = teamConnections.get(teamId);
  if (!connection) {
    return;
  }
  handleAgencyLiveEvent(teamId, event);
  for (const listener of connection.listeners) {
    listener(event);
  }
}

function scheduleReconnect(teamId: string, generation: number) {
  const connection = teamConnections.get(teamId);
  if (!connection || connection.refCount <= 0 || generation !== connection.subscriptionGeneration) {
    return;
  }

  clearReconnectTimer(connection);
  updateConnectionState(teamId, "reconnecting");
  const delay = Math.min(RECONNECT_BASE_MS * 2 ** connection.reconnectAttempt, RECONNECT_MAX_MS);
  connection.reconnectAttempt += 1;

  connection.reconnectTimer = setTimeout(() => {
    void startTeamSubscription(teamId, generation);
  }, delay);
}

async function startTeamSubscription(teamId: string, generation: number) {
  const connection = teamConnections.get(teamId);
  if (!connection || connection.refCount <= 0 || generation !== connection.subscriptionGeneration) {
    return;
  }

  stopSubscriptionTransport(connection, "subscription replaced");
  connection.abortController = new AbortController();
  const subscriptionSignal = connection.abortController.signal;

  updateConnectionState(teamId, connection.reconnectAttempt > 0 ? "reconnecting" : "connecting");

  let websocket: WebSocket | null = null;

  try {
    const rpcConnection = createAgencyLiveRpcClient(getServerUrl());
    websocket = rpcConnection.websocket;
    connection.websocket = websocket;

    await waitForWebSocketOpen(websocket);

    if (
      subscriptionSignal.aborted ||
      connection.refCount <= 0 ||
      generation !== connection.subscriptionGeneration
    ) {
      return;
    }

    const iterator = await rpcConnection.client.agencyOps.live.subscribe(
      { teamId },
      { signal: subscriptionSignal },
    );

    if (
      subscriptionSignal.aborted ||
      connection.refCount <= 0 ||
      generation !== connection.subscriptionGeneration
    ) {
      return;
    }

    updateConnectionState(teamId, "live");
    connection.reconnectAttempt = 0;

    for await (const event of iterator) {
      if (
        subscriptionSignal.aborted ||
        connection.refCount <= 0 ||
        generation !== connection.subscriptionGeneration
      ) {
        break;
      }
      fanOutEvent(teamId, event as AgencyLiveEvent);
    }

    if (
      !subscriptionSignal.aborted &&
      connection.refCount > 0 &&
      generation === connection.subscriptionGeneration
    ) {
      scheduleReconnect(teamId, generation);
    }
  } catch (error) {
    if (
      subscriptionSignal.aborted ||
      connection.refCount <= 0 ||
      generation !== connection.subscriptionGeneration
    ) {
      return;
    }

    if (isBenignSubscriptionError(error)) {
      scheduleReconnect(teamId, generation);
      return;
    }

    console.error("[agency-live] subscription error", error);
    updateConnectionState(teamId, "error");
    scheduleReconnect(teamId, generation);
  } finally {
    if (
      websocket &&
      connection.websocket === websocket &&
      (connection.refCount <= 0 ||
        generation !== connection.subscriptionGeneration ||
        subscriptionSignal.aborted)
    ) {
      // Close without aborting — see stopSubscriptionTransport.
      stopSubscriptionTransport(connection, "subscription ended");
    }
  }
}

function ensureConnectionStarted(teamId: string) {
  const connection = getConnection(teamId);
  clearReconnectTimer(connection);
  connection.reconnectAttempt = 0;
  connection.subscriptionGeneration += 1;
  const generation = connection.subscriptionGeneration;
  void startTeamSubscription(teamId, generation);
}

function teardownTeamConnection(teamId: string) {
  const connection = teamConnections.get(teamId);
  if (!connection) {
    return;
  }

  clearReconnectTimer(connection);
  stopSubscriptionTransport(connection, "subscription disposed");
  connection.subscriptionGeneration += 1;
  setAgencyTeamLiveConnected(teamId, false);
  teamConnections.delete(teamId);
}

function maybeRemoveIdleConnection(teamId: string) {
  const connection = teamConnections.get(teamId);
  if (connection && connection.refCount <= 0 && connection.stateListeners.size === 0) {
    teamConnections.delete(teamId);
  }
}

export function subscribeAgencyLive(teamId: string, listener: AgencyLiveListener): () => void {
  if (!teamId) {
    return () => {};
  }

  const connection = getConnection(teamId);
  const wasInactive = connection.refCount === 0;
  connection.refCount += 1;
  connection.listeners.add(listener);

  if (wasInactive) {
    ensureConnectionStarted(teamId);
  }

  return () => {
    const current = teamConnections.get(teamId);
    if (!current) {
      return;
    }
    current.listeners.delete(listener);
    current.refCount -= 1;
    if (current.refCount <= 0) {
      teardownTeamConnection(teamId);
    }
  };
}

export { isAgencyLiveConnected } from "@/features/shared/live/agency-live-connected";

export function getAgencyLiveConnectionState(teamId: string): AgencyLiveConnectionState {
  return teamConnections.get(teamId)?.state ?? "connecting";
}

function subscribeToConnectionState(teamId: string, onStoreChange: () => void): () => void {
  if (!teamId) {
    return () => {};
  }

  const connection = getConnection(teamId);
  connection.stateListeners.add(onStoreChange);
  return () => {
    const current = teamConnections.get(teamId);
    current?.stateListeners.delete(onStoreChange);
    if (current) {
      maybeRemoveIdleConnection(teamId);
    }
  };
}

export function useAgencyLiveConnectionState(teamId: string): AgencyLiveConnectionState {
  return useSyncExternalStore(
    (onStoreChange) => subscribeToConnectionState(teamId, onStoreChange),
    () => getAgencyLiveConnectionState(teamId),
    () => "connecting",
  );
}

export function teardownAllAgencyLiveConnections() {
  for (const teamId of [...teamConnections.keys()]) {
    teardownTeamConnection(teamId);
  }
  resetAgencyLiveConnectedForTest();
}

/** ponytail: test-only reset; not for production */
export function resetAgencyLiveConnectionsForTest() {
  teardownAllAgencyLiveConnections();
}

// ponytail: Vite HMR reloads this module without unmounting React; close sockets so server
// subscribers don't accumulate until restart.
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    teardownAllAgencyLiveConnections();
  });
}
