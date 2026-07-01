import { lazy, Suspense, useEffect } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AuthProvider } from "@/providers/auth-provider";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage } from "@/pages/login-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { TermsPage } from "@/pages/terms-page";

const AuthenticatedRoutes = lazy(() =>
  import("@/authenticated-routes").then((module) => ({
    default: module.AuthenticatedRoutes,
  })),
);

function LoginAuthBoundary() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
}

function PageFallback() {
  return <div className="min-h-screen bg-default" aria-hidden />;
}

function ScrollToTopOnNavigate() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}

export function App() {
  return (
    <>
      <ScrollToTopOnNavigate />
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/login" element={<LoginAuthBoundary />}>
        <Route index element={<LoginPage />} />
      </Route>
      <Route
        path="/*"
        element={
          <Suspense fallback={<PageFallback />}>
            <AuthenticatedRoutes />
          </Suspense>
        }
      />
      </Routes>
    </>
  );
}
