import { lazy, Suspense } from "react";
import { Navigate, Outlet, Route, Routes } from "react-router-dom";

import { AppShell } from "@/components/app-shell";
import { ShellPageTransition } from "@/components/shell/shell-page-transition";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthProvider } from "@/providers/auth-provider";

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

function ShellLayout() {
  return (
    <AppShell>
      <ShellPageTransition />
    </AppShell>
  );
}

function PageFallback() {
  return <div className="min-h-screen bg-default" aria-hidden />;
}

function LazyAppPage({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>;
}

export function AuthenticatedRoutes() {
  return (
    <Routes>
      <Route element={<AuthBoundary />}>
        <Route element={<ProtectedRoute />}>
          <Route element={<ShellLayout />}>
            <Route
              path="/dashboard"
              element={
                <LazyAppPage>
                  <DashboardPage />
                </LazyAppPage>
              }
            />
            <Route
              path="/agency"
              element={
                <LazyAppPage>
                  <AgencyPage />
                </LazyAppPage>
              }
            />
            <Route
              path="/marketplace"
              element={
                <LazyAppPage>
                  <MarketplacePage />
                </LazyAppPage>
              }
            />
            <Route
              path="/billing"
              element={
                <LazyAppPage>
                  <BillingPage />
                </LazyAppPage>
              }
            />
            <Route
              path="/billing/success"
              element={
                <LazyAppPage>
                  <BillingSuccessPage />
                </LazyAppPage>
              }
            />
            <Route
              path="/node/:id"
              element={
                <LazyAppPage>
                  <NodePage />
                </LazyAppPage>
              }
            />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
