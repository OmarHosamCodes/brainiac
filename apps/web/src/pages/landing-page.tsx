import { useEffect, useState } from "react";

import { LandingFeaturesIndex } from "@/components/marketing/landing-features-index";
import { LandingHero } from "@/components/marketing/landing-hero";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { authClient } from "@/lib/auth-client";

export function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const resolveSession = () => {
      void authClient.getSession().then((session) => {
        setIsAuthenticated(Boolean(session.data?.user));
      });
    };

    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(resolveSession);
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = setTimeout(resolveSession, 1);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <MarketingPageShell>
      <LandingHero isAuthenticated={isAuthenticated} />
      <LandingFeaturesIndex isAuthenticated={isAuthenticated} />
      <LandingPricing isAuthenticated={isAuthenticated} />
    </MarketingPageShell>
  );
}
