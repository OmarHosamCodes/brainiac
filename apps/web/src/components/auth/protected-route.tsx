import { Navigate, Outlet, useLocation } from "react-router-dom";

import { LogoLoader } from "@/components/shell/logo-loader";
import { startShellBoot } from "@/lib/shell/shell-boot";
import { authClient, whenAuthSessionReady } from "@/lib/auth-client";
import { useEffect, useState } from "react";
import {
  shellContentInClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

export function ProtectedRoute() {
  const session = authClient.useSession();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void whenAuthSessionReady().then(() => setReady(true));
  }, []);

  useEffect(() => {
    if (!ready || session.isPending) {
      startShellBoot();
    }
  }, [ready, session.isPending]);

  if (!ready || session.isPending) {
    return <LogoLoader />;
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
