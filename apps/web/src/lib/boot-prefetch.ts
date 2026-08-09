import type { AppRouterClient } from "@orch/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { resolveSsrApiOrigin } from "@/lib/ssr-api-origin";

export type BootTeams = Awaited<ReturnType<AppRouterClient["team"]["list"]>>;

function createServerOrpcClient(cookie: string): AppRouterClient {
  const link = new RPCLink({
    url: `${resolveSsrApiOrigin()}/rpc`,
    fetch(request, init) {
      const headers = new Headers();
      if (cookie) {
        headers.set("cookie", cookie);
      }
      return fetch(request, {
        ...(init as RequestInit | undefined),
        headers,
      });
    },
  });
  return createORPCClient(link);
}

export const fetchBootTeams = createServerFn({ method: "GET" }).handler(
  async (): Promise<BootTeams> => {
    const cookie = getRequestHeader("cookie") ?? "";
    if (!cookie) return { items: [] };
    try {
      const client = createServerOrpcClient(cookie);
      return await client.team.list();
    } catch {
      return { items: [] };
    }
  },
);
