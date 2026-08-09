import { lazy, Suspense, useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";

import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { AuthProvider } from "@/providers/auth-provider";
import { AuthenticatedRoutes } from "@/authenticated-routes";
import { Sentry } from "@/lib/sentry";

const LandingPage = lazy(() =>
  import("@/pages/landing-page").then((module) => ({ default: module.LandingPage })),
);
const LoginPage = lazy(() =>
  import("@/features/auth/login-page").then((module) => ({ default: module.LoginPage })),
);
const PrivacyPage = lazy(() =>
  import("@/pages/privacy-page").then((module) => ({ default: module.PrivacyPage })),
);
const TermsPage = lazy(() =>
  import("@/pages/terms-page").then((module) => ({ default: module.TermsPage })),
);

const SentryRoutes = Sentry.withSentryReactRouterV7Routing(Routes);

function PublicPageFallback() {
  return <LogoLoader label="Opening the page" />;
}

function LoginAuthBoundary() {
  return (
    <AuthProvider>
      <Outlet />
    </AuthProvider>
  );
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
      <Suspense fallback={<PublicPageFallback />}>
        <SentryRoutes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/login" element={<LoginAuthBoundary />}>
            <Route index element={<LoginPage />} />
          </Route>
          <Route path="/*" element={<AuthenticatedRoutes />} />
        </SentryRoutes>
      </Suspense>
    </>
  );
}
