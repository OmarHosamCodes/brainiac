import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AgencyLogoLoader } from "@/components/agency/agency-logo-loader";
import { AppShell } from "@/components/app-shell";
import { ShellPageTransition } from "@/components/shell/shell-page-transition";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthProvider } from "@/providers/auth-provider";
import { startAgencyBoot } from "@/lib/agency/agency-boot";

import { shellLoadingPanelClass } from "@/lib/utils/app-shell-ui";

function isAgencyPath(pathname: string) {
  return pathname === "/agency" || pathname.startsWith("/agency/");
}

const DashboardPage = lazy(() =>
  import("@/pages/dashboard-page").then((module) => ({ default: module.DashboardPage })),
);
const AgencyPage = lazy(() =>
  import("@/pages/agency-page").then((module) => ({ default: module.AgencyPage })),
);
const MarketplacePage = lazy(() =>
  import("@/pages/marketplace-page").then((module) => ({ default: module.MarketplacePage })),
);
const BillingPage = lazy(() =>
  import("@/pages/billing-page").then((module) => ({ default: module.BillingPage })),
);
const BillingSuccessPage = lazy(() =>
  import("@/pages/billing-success-page").then((module) => ({
    default: module.BillingSuccessPage,
  })),
);
const NodePage = lazy(() =>
  import("@/pages/node-page").then((module) => ({ default: module.NodePage })),
);

function AuthBoundary() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function ShellPageSkeleton() {
  return (
    <div className="p-4 md:p-6">
      <div className={shellLoadingPanelClass}>
        <div className="h-5 w-40 animate-pulse rounded bg-muted/50" />
        <div className="mt-4 h-64 w-full animate-pulse rounded bg-muted/30" />
      </div>
    </div>
  );
}

function ShellSuspenseFallback() {
  const { pathname } = useLocation();
  const agencyLoading = isAgencyPath(pathname);

  useEffect(() => {
    if (agencyLoading) startAgencyBoot();
  }, [agencyLoading]);

  if (agencyLoading) {
    return <AgencyLogoLoader fullScreen />;
  }

  return <ShellPageSkeleton />;
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
    <Routes>
      <Route element={<AuthBoundary />}>
        <Route element={<ProtectedRoute />}>
          <Route element={<ShellLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agency" element={<AgencyPage />} />
            <Route path="/marketplace" element={<MarketplacePage />} />
            <Route path="/billing" element={<BillingPage />} />
            <Route path="/billing/success" element={<BillingSuccessPage />} />
            <Route path="/node/:id" element={<NodePage />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
