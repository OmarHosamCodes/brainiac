import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { LandingAgencyPreview } from "@/components/marketing/landing-agency-preview";
import { LandingAgentTrace } from "@/components/marketing/landing-agent-trace";
import { LandingPricing } from "@/components/marketing/landing-pricing";
import { LandingWorkspaceVignette } from "@/components/marketing/landing-workspace-vignette";
import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { NeuralCanvasArtifact } from "@/components/marketing/neural-canvas-artifact";
import { PrismDispersionArtifact } from "@/components/marketing/prism-dispersion-artifact";
import { MarketingPageShell } from "@/components/marketing-page-shell";
import { Button } from "@/components/ui/button";
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

    const timeoutId = window.setTimeout(resolveSession, 1);
    return () => window.clearTimeout(timeoutId);
  }, []);

  return (
    <MarketingPageShell heroIsDark>
      <section className="relative w-full overflow-hidden bg-[var(--marketing-ink)] text-[var(--marketing-ink-foreground)]">
        <NeuralCanvasArtifact />

        <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 md:px-10 md:pt-28 md:pb-24 lg:px-16">
          <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <MarketingBrandLockup invert className="mb-12 md:mb-16" />

              <h1 className="max-w-xl text-[2.25rem] leading-[1.05] font-bold tracking-[-0.02em] text-balance sm:text-5xl md:text-6xl lg:text-[3.75rem]">
                Map your thinking.
                <br />
                Run your agency.
              </h1>

              <p className="mt-6 max-w-md text-lg leading-relaxed text-[var(--marketing-ink-muted)] md:mt-8">
                Canvas for ideas, Agency for execution. An infinite workspace with an agent that
                reads and reshapes your nodes in plain sight.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3 md:mt-10">
                <Button asChild size="lg" className="h-12 px-6 text-base">
                  <Link to={isAuthenticated ? "/dashboard" : "/login"}>
                    {isAuthenticated ? "Open workspace" : "Get started"}
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
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
                className="pointer-events-none absolute -inset-8 rounded-full opacity-60 blur-3xl"
                style={{ background: "var(--marketing-emerald-glow)" }}
                aria-hidden="true"
              />
              <LandingWorkspaceVignette className="relative mx-auto lg:mx-0" />
            </div>
          </div>
        </div>

        <div className="border-b border-[var(--marketing-ink-border)]" />
      </section>

      <section className="relative overflow-hidden bg-[var(--marketing-ink)] text-[var(--marketing-ink-foreground)]">
        <PrismDispersionArtifact className="opacity-70" />
        <div className="relative z-10 mx-auto max-w-6xl px-6 py-14 text-center md:px-10 md:py-16 lg:px-16">
          <p className="text-[0.6875rem] font-bold tracking-[0.18em] text-[var(--marketing-ink-muted)] uppercase">
            One workspace
          </p>
          <h2 className="mt-3 text-2xl font-bold tracking-tight md:text-3xl">Two registers</h2>
          <p className="mx-auto mt-4 max-w-lg text-base leading-relaxed text-[var(--marketing-ink-muted)]">
            The same product splits into spatial thinking and structured execution — different
            rhythms, one quiet voice.
          </p>
        </div>
        <div className="border-b border-[var(--marketing-ink-border)]" />
      </section>

      <section className="w-full bg-background">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 lg:px-16">
          <div className="grid grid-cols-1 gap-16 md:grid-cols-2 md:gap-12 lg:gap-20">
            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Canvas register</h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Pan, zoom, and place nodes anywhere. Each node holds tabs, each tab holds blocks:
                task lists, notes, kanban boards, decision matrices. Your work has a place, and the
                place has a shape.
              </p>
              <LandingWorkspaceVignette className="mt-8 border-border" />
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Agency register</h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                Track time, projects, and team capacity in structured rows. Same product, different
                rhythm: execution-shaped when the canvas work is done.
              </p>
              <LandingAgencyPreview className="mt-8" />
            </div>
          </div>
        </div>
      </section>

      <section className="w-full border-t border-border bg-muted">
        <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 lg:px-16">
          <div className="grid grid-cols-1 gap-10 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl">
                Every tool call is visible
              </h2>
              <p className="mt-4 max-w-md text-base leading-relaxed text-muted-foreground">
                The agent reads nodes, writes blocks, and connects your workspace. Each action shows
                up as plain, inspectable text. No magic, no mystery.
              </p>
            </div>
            <div className="min-w-0">
              <LandingAgentTrace />
            </div>
          </div>
        </div>
      </section>

      <LandingPricing isAuthenticated={isAuthenticated} />
    </MarketingPageShell>
  );
}
