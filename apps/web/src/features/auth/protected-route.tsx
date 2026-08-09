import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "@/lib/navigation";

import { shellContentInClass } from "@/features/app-shell/app-shell-ui";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { startShellBoot } from "@/features/app-shell/shell/shell-boot";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

export function ProtectedRoute() {
  const session = authClient.useSession();
  const location = useLocation();

  useEffect(() => {
    if (session.isPending) startShellBoot();
  }, [session.isPending]);

  if (session.isPending) {
    return <LogoLoader label="Checking your session" />;
  }

  if (!session.data) {
    const redirectTo = `${location.pathname}${location.search}`;
    return (
      <Navigate to={`/login?redirect=${encodeURIComponent(redirectTo || "/canvas")}`} replace />
    );
  }

  return (
    <div className={cn(shellContentInClass, "h-full min-h-0")}>
      <Outlet />
    </div>
  );
}
