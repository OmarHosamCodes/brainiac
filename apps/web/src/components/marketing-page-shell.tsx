import { Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import { MarketingBrandLockup } from "@/components/marketing/marketing-brand-lockup";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/stores/theme";
import { orpc } from "@/lib/orpc";
import { cn } from "@/lib/utils";

const footerNav = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Agency", to: "/agency" },
  { label: "Marketplace", to: "/marketplace" },
  { label: "Pricing", to: "/#pricing" },
];

const footerLegal = [
  { label: "Terms", to: "/terms" },
  { label: "Privacy", to: "/privacy" },
];

function ThemeToggle() {
  const { isDark, toggle } = useTheme();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 rounded-full"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
    >
      {isDark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

function MarketingHealthStatus() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const idleId = window.requestIdleCallback(() => setEnabled(true));
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => setEnabled(true), 1);
    return () => window.clearTimeout(timeoutId);
  }, []);

  const healthCheck = useQuery({
    ...orpc.healthCheck.queryOptions(),
    enabled,
  } as unknown as Parameters<typeof useQuery>[0]);

  return (
    <div className="mt-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
      <span
        className={cn(
          "size-1.5 rounded-full",
          healthCheck.isSuccess ? "bg-primary" : "bg-muted-foreground/40",
        )}
      />
      <span>{healthCheck.isSuccess ? "All systems operational" : "Status unavailable"}</span>
      {healthCheck.isSuccess ? (
        <span className="text-muted-foreground/50">· {String(healthCheck.data)}ms</span>
      ) : null}
    </div>
  );
}

export function MarketingPageShell({
  children,
  heroIsDark: _heroIsDark = false,
}: {
  children: ReactNode;
  heroIsDark?: boolean;
}) {
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen w-full flex-col bg-background text-foreground selection:bg-primary/20">
      {children}

      <footer className="mt-auto w-full border-t border-border">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16 lg:px-16">
          <div className="grid grid-cols-1 gap-y-10 md:grid-cols-12 md:gap-x-10">
            <div className="md:col-span-5">
              <MarketingBrandLockup />
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted-foreground">
                A spatial knowledge workspace with an embedded agent.
              </p>

              <MarketingHealthStatus />
            </div>

            <div className="md:col-span-3 md:col-start-7">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Product
              </div>
              <ul className="space-y-2.5">
                {footerNav.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2 md:col-start-11">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Legal
              </div>
              <ul className="mb-6 space-y-2.5">
                {footerLegal.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 md:mt-16 md:flex-row md:items-center">
            <p className="text-xs text-muted-foreground">
              &copy; {year} Brainiac. All rights reserved.
            </p>
            <p className="text-xs text-muted-foreground">Built for people who think on canvases.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
