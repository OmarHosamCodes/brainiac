import { useEffect, useState } from "react";

import { LandingFeaturesIndex } from "@/components/marketing/landing-features-index";
import { LandingHero } from "@/components/marketing/landing-hero";
import {
  landingInPageHash,
  landingScrollTargetId,
  scrollToLandingTarget,
} from "@/components/marketing/landing-index";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { authClient } from "@/lib/auth-client";

function useLandingHashScroll() {
  useEffect(() => {
    let scrollFrame = 0;

    function scrollCurrentHash() {
      const targetId = landingScrollTargetId(window.location.hash);
      if (!targetId) return;
      cancelAnimationFrame(scrollFrame);
      scrollFrame = requestAnimationFrame(() => {
        scrollToLandingTarget(targetId);
      });
    }

    function onClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      const hash = landingInPageHash(href, window.location.pathname);
      if (!hash) return;
      const targetId = landingScrollTargetId(hash);
      if (!targetId) return;

      event.preventDefault();
      if (window.location.hash !== hash) {
        window.history.pushState(null, "", hash);
        window.dispatchEvent(new HashChangeEvent("hashchange"));
        return;
      }
      scrollCurrentHash();
    }

    const mountFrame = requestAnimationFrame(scrollCurrentHash);
    document.addEventListener("click", onClick, true);
    window.addEventListener("hashchange", scrollCurrentHash);
    return () => {
      cancelAnimationFrame(mountFrame);
      cancelAnimationFrame(scrollFrame);
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("hashchange", scrollCurrentHash);
    };
  }, []);
}

export function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  useLandingHashScroll();

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
