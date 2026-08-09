import { useEffect } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";

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
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return (
    <div className={cn(shellContentInClass, "h-full min-h-0")}>
      <Outlet />
    </div>
  );
}
