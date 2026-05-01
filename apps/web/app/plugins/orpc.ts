import type { AppRouterClient } from "@brainiac/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { defineNuxtPlugin } from "#app";

const RPC_REQUEST_TIMEOUT_MS = 6_000;

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const rpcUrl = `${config.public.serverUrl}/rpc`;

  const cookie = import.meta.server ? useRequestHeaders(["cookie"]).cookie : undefined;

  const rpcLink = new RPCLink({
    url: rpcUrl,
    headers: cookie ? { cookie } : undefined,
    fetch(request, init) {
      // Cap any single RPC call so a hung server can never wedge a Vue Query
      // request indefinitely. Default Vue Query retry would otherwise compound
      // into 10-20s of perceived "frozen" UI.
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
  const orpcUtils = createTanstackQueryUtils(client);

  return {
    provide: {
      orpc: orpcUtils,
    },
  };
});
