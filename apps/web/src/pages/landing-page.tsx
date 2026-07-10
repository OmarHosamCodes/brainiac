import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import AnimatedContent from "@/components/marketing/bits/AnimatedContent";
import Aurora from "@/components/marketing/bits/Aurora";
import BlurText from "@/components/marketing/bits/BlurText";
import Magnet from "@/components/marketing/bits/Magnet";
import SpotlightCard from "@/components/marketing/bits/SpotlightCard";
import { LandingAgencyPreview } from "@/components/marketing/landing-agency-preview";
import { LandingAgentTrace } from "@/components/marketing/landing-agent-trace";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingWorkspaceVignette } from "@/components/marketing/landing-workspace-vignette";
import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/ui/button";

export function LandingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

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

  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Open workspace" : "Get started";

  return (
    <MarketingPageShell heroIsDark>
      <section className="relative w-full overflow-hidden bg-[var(--marketing-ink)] text-[var(--marketing-ink-foreground)]">
        {!reducedMotion ? (
          <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
            <Aurora
              colorStops={["#059669", "#10b981", "#34d399"]}
              amplitude={0.85}
              blend={0.55}
              speed={0.6}
            />
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{ background: "var(--marketing-accent-glow)" }}
            aria-hidden="true"
          />
        )}

        <div className="relative mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-6 pt-20 pb-16 md:px-10 md:pt-28 md:pb-24 lg:grid-cols-2 lg:gap-16 lg:px-16">
          <div>
            <MarketingBrandLockup className="mb-10 text-[var(--marketing-ink-foreground)] md:mb-14" />

            <BlurText
              as="h1"
              text="Map your thinking. Run your agency."
              delay={80}
              stepDuration={0.28}
              className="max-w-xl text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl md:text-6xl lg:text-[3.75rem]"
            />

            <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--marketing-ink-muted)] md:mt-8">
              Canvas for ideas, Agency for execution. An infinite workspace with an agent that reads
              and reshapes your nodes in plain sight.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
              <Magnet padding={48} magnetStrength={3} disabled={reducedMotion}>
                <Button asChild size="lg" className="h-12 px-6 text-base">
                  <Link to={ctaHref}>
                    {ctaLabel}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Magnet>
              <Button
                asChild
                variant="ghost"
                size="lg"
                className="h-12 px-6 text-base text-[var(--marketing-ink-muted)] hover:bg-[var(--marketing-ink-border)] hover:text-[var(--marketing-ink-foreground)]"
              >
                <a href="#pricing">See pricing</a>
              </Button>
            </div>
          </div>

          <div className="relative min-w-0 lg:pl-4">
            <div
              className="pointer-events-none absolute -inset-8 rounded-full opacity-50 blur-3xl"
              style={{ background: "var(--marketing-accent-glow)" }}
              aria-hidden="true"
            />
            <LandingWorkspaceVignette className="relative mx-auto border-[var(--marketing-ink-border)] lg:mx-0" />
          </div>
        </div>

        <div className="border-b border-[var(--marketing-ink-border)]" />
      </section>

      <section className="w-full bg-background">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 lg:px-16">
          <AnimatedContent distance={40} duration={0.7} className="max-w-2xl">
            <h2 className="text-3xl font-semibold tracking-[-0.025em] text-balance md:text-4xl">
              Two registers. One instrument.
            </h2>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
              Spatial thinking on the canvas. Structured execution in Agency. Same product,
              different rhythm.
            </p>
          </AnimatedContent>

          <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
            <AnimatedContent distance={32} duration={0.65} delay={0.05}>
              <SpotlightCard
                className="h-full rounded-2xl border-border bg-card p-6 md:p-8"
                spotlightColor="rgba(16, 185, 129, 0.18)"
              >
                <h3 className="text-xl font-semibold tracking-tight">Canvas</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                  Pan, zoom, and place nodes anywhere. Tabs hold blocks: task lists, notes, kanban,
                  decision matrices. Your work has a place, and the place has a shape.
                </p>
                <LandingWorkspaceVignette className="mt-8 border-border" />
              </SpotlightCard>
            </AnimatedContent>

            <AnimatedContent distance={32} duration={0.65} delay={0.12}>
              <SpotlightCard
                className="h-full rounded-2xl border-border bg-card p-6 md:p-8"
                spotlightColor="rgba(16, 185, 129, 0.12)"
              >
                <h3 className="text-xl font-semibold tracking-tight">Agency</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground md:text-base">
                  Track time, projects, and team capacity in structured rows. Execution-shaped when
                  the canvas work is done.
                </p>
                <LandingAgencyPreview className="mt-8" />
              </SpotlightCard>
            </AnimatedContent>
          </div>
        </div>
      </section>

      <section className="w-full border-t border-border bg-secondary/40">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 lg:px-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <AnimatedContent distance={28} duration={0.6}>
              <h2 className="text-2xl font-semibold tracking-[-0.025em] md:text-3xl">
                Every tool call is visible
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                The agent reads nodes, writes blocks, and connects your workspace. Each action shows
                up as plain, inspectable text. No magic, no mystery.
              </p>
            </AnimatedContent>
            <AnimatedContent distance={28} duration={0.6} delay={0.08}>
              <LandingAgentTrace />
            </AnimatedContent>
          </div>
        </div>
      </section>

      <LandingPricing isAuthenticated={isAuthenticated} />
    </MarketingPageShell>
  );
}
