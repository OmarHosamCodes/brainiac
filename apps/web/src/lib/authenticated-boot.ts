import type { QueryClient } from "@tanstack/react-query";
import { redirect } from "@tanstack/react-router";

import { seedBootChromeQueries, type BootShellChrome } from "@/lib/boot-chrome";
import type { BootSession } from "@/lib/session-boot";

export async function loadAuthenticatedShell(input: {
  queryClient: QueryClient;
  location: { pathname: string; searchStr: string };
  preferredTeamId?: string | null;
  fetchSession: () => Promise<BootSession>;
  fetchChrome: (teamId?: string) => Promise<BootShellChrome>;
}): Promise<{ session: NonNullable<BootSession>; teamCount: number }> {
  const bootStartedAt = Date.now();
  const preferredTeamId = input.preferredTeamId || undefined;
  const [session, chrome] = await Promise.all([
    input.fetchSession(),
    input.fetchChrome(preferredTeamId),
  ]);

  if (!session) {
    const redirectTo = `${input.location.pathname}${input.location.searchStr}`;
    throw redirect({
      href: `/login?redirect=${encodeURIComponent(redirectTo || "/canvas")}`,
    });
  }

  seedBootChromeQueries(input.queryClient, chrome, bootStartedAt);
  return { session, teamCount: chrome.teams?.items.length ?? 0 };
}
