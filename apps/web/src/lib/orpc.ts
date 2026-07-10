import type { AppRouterClient } from "@orch/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { getRpcBaseUrl } from "@/lib/env";

const RPC_REQUEST_TIMEOUT_MS = 6_000;
const RPC_AGENT_ASK_TIMEOUT_MS = 120_000;

function rpcTimeoutMs(path: string) {
  return path.includes("/taskAgent/ask") ? RPC_AGENT_ASK_TIMEOUT_MS : RPC_REQUEST_TIMEOUT_MS;
}

const rpcLink = new RPCLink({
  url: `${getRpcBaseUrl()}/rpc`,
  fetch(request, init) {
    const path = new URL(request.url).pathname;
    const timeoutSignal = AbortSignal.timeout(rpcTimeoutMs(path));
    const signal = request.signal
      ? AbortSignal.any([request.signal, timeoutSignal])
      : timeoutSignal;

    return fetch(request, {
      ...init,
      credentials: "include",
      signal,
    });
  },
});

export const orpcClient: AppRouterClient = createORPCClient(rpcLink);
export const orpc = createTanstackQueryUtils(orpcClient);
