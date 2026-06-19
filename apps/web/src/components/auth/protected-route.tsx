import { Navigate, Outlet, useLocation } from "react-router-dom";

import { authClient, whenAuthSessionReady } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import {
  shellContentInClass,
  shellHeaderActionsRegionClass,
  shellHeaderContextRegionClass,
  shellLoadingPanelClass,
  shellTopbarBaseClass,
  shellUtilityClusterClass,
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
        style={{ "--app-shell-dock-width": "0px" } as React.CSSProperties}
      >
        <aside className="app-shell__rail hidden border-r border-default bg-muted md:block" aria-hidden="true">
          <div className="py-4" />
        </aside>

        <header className={cn(shellTopbarBaseClass, "app-shell__topbar--execution")} aria-hidden="true">
          <div className={shellHeaderContextRegionClass}>
            <div className="h-4 w-32 animate-pulse rounded bg-muted/50" />
          </div>
          <div className={shellUtilityClusterClass}>
            <div className={shellHeaderActionsRegionClass}>
              <div className="size-9 animate-pulse rounded-xl bg-muted/40" />
            </div>
            <div className="size-9 animate-pulse rounded-xl bg-muted/40" />
            <div className="h-9 w-16 animate-pulse rounded-xl bg-muted/40" />
          </div>
        </header>

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
