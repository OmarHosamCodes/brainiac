import type { AppRouterClient } from "@brainiac/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";

import { defineNuxtPlugin } from "#app";

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();
  const rpcUrl = `${config.public.serverUrl}/rpc`;

  const rpcLink = new RPCLink({
    url: rpcUrl,
    fetch(url, options) {
      return fetch(url, {
        ...options,
        credentials: "include",
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
