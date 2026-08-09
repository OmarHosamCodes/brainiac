import type { AppRouterClient } from "@orch/api/routers/index";
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";

import { NOTIFICATION_LIST_LIMIT } from "@/features/notifications/notification-list-limit";
import { resolveSsrApiOrigin } from "@/lib/ssr-api-origin";

export type BootTeams = Awaited<ReturnType<AppRouterClient["team"]["list"]>>;
export type BootUnreadCount = Awaited<ReturnType<AppRouterClient["notifications"]["unreadCount"]>>;
export type BootNotificationList = Awaited<ReturnType<AppRouterClient["notifications"]["list"]>>;
export type BootActiveTimer = Awaited<
  ReturnType<AppRouterClient["agencyOps"]["timer"]["getActive"]>
>;

export type BootShellChrome = {
  teams: BootTeams;
  teamId: string;
  unread: BootUnreadCount | null;
  notifications: BootNotificationList | null;
  timer: BootActiveTimer | null;
};

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

const emptyChrome = (): BootShellChrome => ({
  teams: { items: [] },
  teamId: "",
  unread: null,
  notifications: null,
  timer: null,
});

export const fetchBootShellChrome = createServerFn({ method: "GET" }).handler(
  async (): Promise<BootShellChrome> => {
    const cookie = getRequestHeader("cookie") ?? "";
    if (!cookie) return emptyChrome();

    const client = createServerOrpcClient(cookie);
    let teams: BootTeams;
    try {
      teams = await client.team.list();
    } catch {
      return emptyChrome();
    }

    const teamId = teams.items[0]?.id ?? "";
    if (!teamId) return { ...emptyChrome(), teams };

    try {
      const [unread, notifications, timer] = await Promise.all([
        client.notifications.unreadCount({ teamId }),
        client.notifications.list({ teamId, limit: NOTIFICATION_LIST_LIMIT }),
        client.agencyOps.timer.getActive({ teamId }),
      ]);
      return { teams, teamId, unread, notifications, timer };
    } catch {
      return { ...emptyChrome(), teams, teamId };
    }
  },
);
