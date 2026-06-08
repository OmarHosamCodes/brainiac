import type { AppRouterClient } from "@brainiac/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { serverUrl } from "@/lib/server-url";

const RPC_REQUEST_TIMEOUT_MS = 6_000;

export function createOrpcUtils(options: { cookie?: string } = {}) {
  const rpcLink = new RPCLink({
    url: `${serverUrl}/rpc`,
    headers: options.cookie ? { cookie: options.cookie } : undefined,
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

  const client: AppRouterClient = createORPCClient(rpcLink);

  return createTanstackQueryUtils(client);
}

export const orpc = createOrpcUtils();
