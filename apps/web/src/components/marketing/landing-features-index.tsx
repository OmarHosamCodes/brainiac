import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";

import { LandingAgencyPreview } from "@/components/marketing/landing-agency-preview";
import { LandingAgentTrace } from "@/components/marketing/landing-agent-trace";
import { LandingAuthActions } from "@/components/marketing/landing-auth-actions";
import {
  AGENCY_OS_PARTS,
  DEFAULT_LANDING_INDEX_ID,
  LANDING_INDEX_ENTRIES,
  landingIndexIdFromHash,
  type LandingIndexId,
} from "@/components/marketing/landing-index";
import { LandingWorkspaceVignette } from "@/components/marketing/landing-workspace-vignette";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleTrigger } from "@/ui/collapsible";

type LandingFeaturesIndexProps = {
  isAuthenticated: boolean;
};

function IndexProof({ id }: { id: LandingIndexId }) {
  switch (id) {
    case "canvas":
      return <LandingWorkspaceVignette className="border-border" />;
    case "agency":
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{AGENCY_OS_PARTS.join(" · ")}</p>
          <LandingAgencyPreview />
        </div>
      );
    case "agent":
      return <LandingAgentTrace />;
    default: {
      const _exhaustive: never = id;
      return _exhaustive;
    }
  }
}

function initialOpenId(): LandingIndexId | null {
  if (typeof window === "undefined") {
    return DEFAULT_LANDING_INDEX_ID;
  }
  return landingIndexIdFromHash(window.location.hash) ?? DEFAULT_LANDING_INDEX_ID;
}

export function LandingFeaturesIndex({ isAuthenticated }: LandingFeaturesIndexProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [openId, setOpenId] = useState<LandingIndexId | null>(initialOpenId);

  useEffect(() => {
    function syncFromHash() {
      const fromHash = landingIndexIdFromHash(window.location.hash);
      if (fromHash) setOpenId(fromHash);
    }

    syncFromHash();
    window.addEventListener("hashchange", syncFromHash);
    return () => window.removeEventListener("hashchange", syncFromHash);
  }, []);

  return (
    <section id="instrument-index" className="w-full scroll-mt-8 bg-background">
      <div className="mx-auto max-w-6xl px-6 py-20 md:px-10 md:py-28 lg:px-16">
        <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.025em] text-balance md:text-4xl">
          Think, track, and inspect in one place.
        </h2>
        <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg">
          Open a part to see the real product.
        </p>

        <div className="mt-12 border-t border-border">
          {LANDING_INDEX_ENTRIES.map((entry) => {
            const isOpen = openId === entry.id;

            return (
              <div
                key={entry.id}
                id={`index-${entry.id}`}
                className="scroll-mt-8 border-b border-border"
              >
                <Collapsible
                  open={isOpen}
                  onOpenChange={(nextOpen) => {
                    const nextId = nextOpen ? entry.id : null;
                    setOpenId(nextId);
                    if (nextId && landingIndexIdFromHash(window.location.hash) !== nextId) {
                      window.history.replaceState(null, "", `#index-${nextId}`);
                    }
                  }}
                >
                  <CollapsibleTrigger
                    className={cn(
                      "grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-baseline gap-x-4 gap-y-1 py-5 text-left md:grid-cols-[auto_minmax(0,1fr)_auto_auto] md:gap-x-8 md:py-6",
                      "hover:bg-muted/40 focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none",
                      isOpen ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-sm font-medium tabular-nums md:text-base",
                        isOpen ? "text-chart-2" : "text-muted-foreground",
                        !reducedMotion &&
                          "transition-colors duration-[var(--motion-duration-rail)] ease-[var(--motion-ease-out)]",
                      )}
                    >
                      {entry.numeral}
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xl font-semibold tracking-[-0.025em] text-foreground md:text-2xl">
                        {entry.name}
                      </span>
                      <span className="mt-0.5 block text-sm md:hidden">{entry.job}</span>
                    </span>
                    <span className="hidden text-sm md:inline">{entry.job}</span>
                    <ChevronDown
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 justify-self-end text-muted-foreground md:self-center",
                        isOpen && "rotate-180",
                        !reducedMotion &&
                          "transition-transform duration-[var(--motion-duration-rail)] ease-[var(--motion-ease-out)]",
                      )}
                    />
                  </CollapsibleTrigger>

                  <div
                    className={cn(
                      "grid",
                      isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
                      !reducedMotion &&
                        "transition-[grid-template-rows] duration-[var(--motion-duration-rail)] ease-[var(--motion-ease-out)]",
                    )}
                  >
                    <div className="min-h-0 overflow-hidden" inert={!isOpen}>
                      <div className="max-w-4xl pb-10">
                        <p className="text-sm leading-relaxed text-muted-foreground md:text-base">
                          {entry.summary}
                        </p>
                        <p className="mt-4 mb-3 text-xs text-muted-foreground">Sample data</p>
                        <IndexProof id={entry.id} />
                      </div>
                    </div>
                  </div>
                </Collapsible>
              </div>
            );
          })}
        </div>

        <LandingAuthActions isAuthenticated={isAuthenticated} className="mt-12" />
      </div>
    </section>
  );
}
