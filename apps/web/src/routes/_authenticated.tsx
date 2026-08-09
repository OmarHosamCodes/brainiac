import { createFileRoute, redirect } from "@tanstack/react-router";
import { Suspense, useEffect, type ReactNode } from "react";

import { AppShell } from "@/features/app-shell/app-shell";
import { shellContentInClass } from "@/features/app-shell/app-shell-ui";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { ShellPageTransition } from "@/features/app-shell/components/shell-page-transition";
import { startShellBoot } from "@/features/app-shell/shell/shell-boot";
import { teamListQueryKey } from "@/features/team/team-queries";
import { authClient } from "@/lib/auth-client";
import { fetchBootTeams } from "@/lib/boot-prefetch";
import { fetchBootSession } from "@/lib/session-boot";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/providers/auth-provider";

export const Route = createFileRoute("/_authenticated")({
  loader: async ({ context, location }) => {
    const session = await fetchBootSession();
    if (!session) {
      const redirectTo = `${location.pathname}${location.searchStr}`;
      throw redirect({
        href: `/login?redirect=${encodeURIComponent(redirectTo || "/canvas")}`,
      });
    }

    // Warm shell boot data only — Agency surfaces stay client-fetched.
    const teams = await fetchBootTeams();
    context.queryClient.setQueryData(teamListQueryKey(), teams);

    return { session, teamCount: teams.items.length };
  },
  component: AuthenticatedLayout,
});

function ShellSuspenseFallback() {
  return <LogoLoader placement="slot" label="Opening your workspace" />;
}

function ClientSessionGate({ children }: { children: ReactNode }) {
  const session = authClient.useSession();

  useEffect(() => {
    if (session.isPending) startShellBoot();
  }, [session.isPending]);

  if (session.isPending) {
    return <LogoLoader label="Checking your session" />;
  }

  if (!session.data) {
    if (typeof window !== "undefined") {
      window.location.href = "/login";
    }
    return <LogoLoader label="Redirecting to sign in" />;
  }

  return <div className={cn(shellContentInClass, "h-full min-h-0")}>{children}</div>;
}

function AuthenticatedLayout() {
  return (
    <AuthProvider>
      <ClientSessionGate>
        <AppShell>
          <Suspense fallback={<ShellSuspenseFallback />}>
            <ShellPageTransition />
          </Suspense>
        </AppShell>
      </ClientSessionGate>
    </AuthProvider>
  );
}
