import GradualBlur from "@/components/marketing/bits/GradualBlur";
import WebThreads from "@/components/marketing/bits/WebThreads";
import { LandingAuthActions } from "@/components/marketing/landing-auth-actions";
import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";

type LandingHeroProps = {
  isAuthenticated: boolean;
};

export function LandingHero({ isAuthenticated }: LandingHeroProps) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className="dark">
      <section className="relative flex min-h-svh w-full flex-col overflow-hidden border-b border-border bg-background text-foreground">
        <a
          href="#instrument-index"
          className="bg-background text-foreground focus-visible:ring-ring sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-4 focus-visible:left-4 focus-visible:z-20 focus-visible:rounded-md focus-visible:px-3 focus-visible:py-2 focus-visible:ring-2"
        >
          Skip to Canvas, Agency, and Agent
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

        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-6 pt-16 pb-28 md:px-10 md:pt-20 lg:px-16">
          <MarketingBrandLockup className="mb-8 text-foreground md:mb-10" />

          <h1 className="max-w-3xl text-[2.25rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance sm:text-5xl md:text-6xl lg:text-[3.75rem]">
            Map your thinking. Run your agency.
          </h1>

          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground md:mt-6">
            Think on the canvas. Track time in Agency. The agent shows every tool call.
          </p>

          <LandingAuthActions
            isAuthenticated={isAuthenticated}
            showPricing
            className="mt-7 md:mt-8"
          />
        </div>

        <GradualBlur
          target="parent"
          position="bottom"
          height="6rem"
          strength={2}
          divCount={5}
          curve="bezier"
          exponential
          opacity={1}
          zIndex={10}
        />
      </section>
    </div>
  );
}
