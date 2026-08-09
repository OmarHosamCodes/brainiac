import WebThreads from "@/components/marketing/bits/WebThreads";
import { LandingAgencyPreview } from "@/components/marketing/landing-agency-preview";
import { LandingAuthActions } from "@/components/marketing/landing-auth-actions";
import { LANDING_INDEX_ENTRIES } from "@/components/marketing/landing-index";
import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="dark">
      <section className="relative w-full overflow-hidden border-b border-border bg-background text-foreground">
        <a
          href="#instrument-index"
          className="bg-background text-foreground focus-visible:ring-ring sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-20 focus-visible:rounded-md focus-visible:px-3 focus-visible:py-2 focus-visible:ring-2"
        >
          Skip to instrument index
        </a>

        {!reducedMotion ? (
          <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden="true">
            <WebThreads
              color1="#6b7280"
              color2="#5b5bd6"
              color3="#f2f2f5"
              speed={0.2}
              threadCount={6}
              frequency={5.0}
              spread={0.18}
              taper={1.0}
              position={0.72}
              fanMode="center"
              glow={0.02}
              falloff={0.6}
              thickness={1.1}
              brightness={0.5}
              opacity={0.9}
              mirror
              shimmer={false}
              grain
              grainIntensity={0.05}
              mouseInteraction
              mouseStrength={0.15}
            />
          </div>
        ) : (
          <div
            className="pointer-events-none absolute inset-0 opacity-30 dark:opacity-40"
            style={{ background: "var(--marketing-accent-glow)" }}
            aria-hidden="true"
          />
        )}

        <div className="relative mx-auto max-w-6xl px-6 pt-16 pb-12 md:px-10 md:pt-20 md:pb-16 lg:px-16">
          <MarketingBrandLockup className="mb-8 text-foreground md:mb-10" />

          <h1 className="max-w-3xl text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl md:text-6xl lg:text-[3.75rem]">
            Map your thinking. Run your agency.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground md:mt-6">
            Canvas for ideas, Agency for execution. An agent that reads and reshapes your work in
            plain sight.
          </p>

          <LandingAuthActions
            isAuthenticated={isAuthenticated}
            showPricing
            className="mt-7 md:mt-8"
          />

          <ol className="mt-10 border-t border-border md:mt-12">
            {LANDING_INDEX_ENTRIES.map((entry) => {
              const isOpen = entry.id === "agency";

              return (
                <li key={entry.id} className="border-b border-border">
                  <a
                    href={`#index-${entry.id}`}
                    className={cn(
                      "grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-4 gap-y-1 py-5 md:grid-cols-[auto_minmax(0,1fr)_auto] md:gap-x-8 md:py-6",
                      "hover:text-foreground focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none",
                      isOpen ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-sm font-medium tabular-nums md:text-base",
                        isOpen ? "text-chart-2" : "text-muted-foreground",
                      )}
                    >
                      {entry.numeral}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xl font-semibold tracking-[-0.025em] md:text-2xl">
                        {entry.name}
                      </span>
                      <span className="mt-0.5 block text-sm md:hidden">{entry.job}</span>
                    </span>
                    <span className="hidden text-sm md:inline">{entry.job}</span>
                  </a>

                  {isOpen ? (
                    <div className="max-w-xl pb-8">
                      <p className="mb-3 text-xs text-muted-foreground">Sample workspace</p>
                      <LandingAgencyPreview rowLimit={2} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </section>
    </div>
  );
}
