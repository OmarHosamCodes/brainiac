import type { AppRouterClient } from "@orch/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { getRpcBaseUrl } from "@/lib/env";

const RPC_REQUEST_TIMEOUT_MS = 6_000;

const rpcLink = new RPCLink({
  url: `${getRpcBaseUrl()}/rpc`,
  fetch(request, init) {
    const timeoutSignal = AbortSignal.timeout(RPC_REQUEST_TIMEOUT_MS);
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
