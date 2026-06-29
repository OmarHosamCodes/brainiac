import { Navigate, Outlet, useLocation } from "react-router-dom";

import { AppShellTopbarSkeleton } from "@/components/app-shell-topbar";
import { authClient, whenAuthSessionReady } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import { APP_SHELL_RAIL_WIDTH_COLLAPSED } from "@/stores/app-shell";
import {
  shellContentInClass,
  shellLoadingPanelClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

export function ProtectedRoute() {
  const session = authClient.useSession();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void whenAuthSessionReady().then(() => setReady(true));
  }, []);

  if (!ready || session.isPending) {
    return (
      <div
        className="app-shell app-shell--execution bg-default text-default"
        style={
          {
            "--app-shell-dock-width": "0px",
            "--app-shell-rail-width": APP_SHELL_RAIL_WIDTH_COLLAPSED,
          } as React.CSSProperties
        }
      >
        <aside
          className="app-shell__rail app-shell__rail--collapsed hidden flex-col border-r border-default bg-default md:flex"
          aria-hidden="true"
        >
          <div className="app-shell__rail-inner flex flex-1 flex-col items-center gap-1.5 px-1 py-2.5">
            <div className="size-8 animate-pulse rounded-[6px] bg-muted/40" />
            <div className="size-8 animate-pulse rounded-full bg-muted/40" />
            <div className="mt-auto flex flex-col items-center gap-1.5 border-t border-default pt-3">
              <div className="size-8 animate-pulse rounded-full bg-muted/40" />
              <div className="size-8 animate-pulse rounded-full bg-muted/40" />
            </div>
          </div>
        </aside>

        <AppShellTopbarSkeleton />

        <main className="app-shell__main p-4 md:p-6">
          <div className={shellLoadingPanelClass}>
            <div className="h-5 w-40 animate-pulse rounded bg-muted/50" />
            <div className="mt-4 h-4 w-64 animate-pulse rounded bg-muted/40" />
            <div className="mt-2 h-4 w-52 animate-pulse rounded bg-muted/40" />
          </div>
        </main>
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className={cn(shellContentInClass, "h-full min-h-0")}>
      <Outlet />
    </div>
  );
}
