import { Navigate, Outlet, useLocation } from "react-router-dom";

import { authClient, whenAuthSessionReady } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export function ProtectedRoute() {
  const session = authClient.useSession();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void whenAuthSessionReady().then(() => setReady(true));
  }, []);

  if (!ready || session.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!session.data) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
