import { useEffect } from "react";
import { Outlet, Route, Routes, useLocation } from "react-router-dom";

import { AuthProvider } from "@/providers/auth-provider";
import { AuthenticatedRoutes } from "@/authenticated-routes";
import { LandingPage } from "@/pages/landing-page";
import { LoginPage } from "@/pages/login-page";
import { PrivacyPage } from "@/pages/privacy-page";
import { TermsPage } from "@/pages/terms-page";

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
      <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/login" element={<LoginAuthBoundary />}>
        <Route index element={<LoginPage />} />
      </Route>
      <Route path="/*" element={<AuthenticatedRoutes />} />
      </Routes>
    </>
  );
}
