import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { AppShell } from "@/features/app-shell/app-shell";
import { ShellPageTransition } from "@/features/app-shell/components/shell-page-transition";
import { ProtectedRoute } from "@/features/auth/protected-route";
import { AuthProvider } from "@/providers/auth-provider";
import { startShellBoot } from "@/features/app-shell/shell/shell-boot";
import { Sentry } from "@/lib/sentry";

const CanvasPage = lazy(() =>
  import("@/pages/canvas-page").then((module) => ({ default: module.CanvasPage })),
);
const AgencyPage = lazy(() =>
  import("@/pages/agency-page").then((module) => ({ default: module.AgencyPage })),
);
const BillingSuccessPage = lazy(() =>
  import("@/pages/billing-success-page").then((module) => ({
    default: module.BillingSuccessPage,
  })),
);
const NodePage = lazy(() =>
  import("@/pages/node-page").then((module) => ({ default: module.NodePage })),
);

const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

function AuthBoundary() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function ShellSuspenseFallback() {
  useEffect(() => {
    startShellBoot();
  }, []);

  return <LogoLoader />;
}

function ShellLayout() {
  return (
    <AppShell>
      <Suspense fallback={<ShellSuspenseFallback />}>
        <ShellPageTransition />
      </Suspense>
    </AppShell>
  );
}

export function AuthenticatedRoutes() {
  return (
    <SentryRoutes>
      <Route element={<AuthBoundary />}>
        <Route element={<ProtectedRoute />}>
          <Route element={<ShellLayout />}>
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="/dashboard" element={<Navigate to="/canvas" replace />} />
            <Route path="/agency" element={<AgencyPage />} />
            <Route path="/billing/success" element={<BillingSuccessPage />} />
            <Route path="/node/:id" element={<NodePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </SentryRoutes>
  );
}
