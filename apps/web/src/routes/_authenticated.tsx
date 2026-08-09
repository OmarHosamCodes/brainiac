import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense } from "react";

import { AppShell } from "@/features/app-shell/app-shell";
import { ShellPageTransition } from "@/features/app-shell/components/shell-page-transition";
import { RouteError, RoutePending } from "@/features/app-shell/route-status";
import { shellContentInClass } from "@/features/app-shell/app-shell-ui";
import { resolveLegacyAgencyRedirect } from "@/features/shared/agency-legacy-redirects";
import { NOTIFICATION_LIST_LIMIT } from "@/features/notifications/notification-list-limit";
import { teamListQueryKey } from "@/features/team/team-queries";
import { fetchBootShellChrome } from "@/lib/boot-prefetch";
import { orpc } from "@/lib/orpc";
import { fetchBootSession } from "@/lib/session-boot";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/providers/auth-provider";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: ({ location }) => {
    const href = resolveLegacyAgencyRedirect(location.pathname, location.searchStr);
    if (href) {
      throw redirect({ href, replace: true });
    }
  },
  loader: async ({ context, location }) => {
    const [session, chrome] = await Promise.all([fetchBootSession(), fetchBootShellChrome()]);
    if (!session) {
      const redirectTo = `${location.pathname}${location.searchStr}`;
      throw redirect({
        href: `/login?redirect=${encodeURIComponent(redirectTo || "/canvas")}`,
      });
    }

    context.queryClient.setQueryData(teamListQueryKey(), chrome.teams);
    if (chrome.teamId) {
      context.queryClient.setQueryData(
        orpc.notifications.unreadCount.queryKey({ input: { teamId: chrome.teamId } }),
        chrome.unread ?? { count: 0, actionCount: 0 },
      );
      context.queryClient.setQueryData(
        orpc.notifications.list.queryKey({
          input: { teamId: chrome.teamId, limit: NOTIFICATION_LIST_LIMIT },
        }),
        chrome.notifications ?? { items: [], nextCursor: null },
      );
      context.queryClient.setQueryData(
        orpc.agencyOps.timer.getActive.queryKey({ input: { teamId: chrome.teamId } }),
        chrome.timer ?? { timer: null },
      );
    }

    return { session, teamCount: chrome.teams.items.length };
  },
  pendingComponent: () => <RoutePending label="Opening your workspace" />,
  errorComponent: () => <RouteError message="Couldn't open your workspace." />,
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { session } = Route.useLoaderData();

  return (
    <AuthProvider initialSession={session}>
      <div className={cn(shellContentInClass, "h-full min-h-0")}>
        <AppShell>
          <Suspense fallback={<RoutePending label="Opening your workspace" />}>
            <ShellPageTransition />
          </Suspense>
        </AppShell>
      </div>
    </AuthProvider>
  );
}
