import { useQuery } from "@tanstack/react-query";
import { BrainCircuit, Moon, Sun } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
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
  const [dark, setDark] = useState(() =>
    typeof document !== "undefined" ? document.documentElement.classList.contains("dark") : false,
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 rounded-full"
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setDark((value) => !value)}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </Button>
  );
}

export function MarketingPageShell({ children }: { children: ReactNode }) {
  const healthCheck = useQuery({
    ...orpc.healthCheck.queryOptions(),
  } as unknown as Parameters<typeof useQuery>[0]);
  const year = new Date().getFullYear();

  return (
    <div className="flex min-h-screen w-full flex-col bg-white text-neutral-900 selection:bg-primary/20 dark:bg-neutral-950 dark:text-neutral-100">
      {children}

      <footer className="mt-auto w-full border-t border-neutral-200 dark:border-neutral-800/80">
        <div className="mx-auto max-w-6xl px-6 py-12 md:px-10 md:py-16 lg:px-16">
          <div className="grid grid-cols-1 gap-y-10 md:grid-cols-12 md:gap-x-10">
            <div className="md:col-span-5">
              <div className="flex items-center gap-2.5 text-sm font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                <span className="flex size-7 items-center justify-center rounded-md bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900">
                  <BrainCircuit className="size-4" />
                </span>
                Brainiac
              </div>
              <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
                A spatial knowledge workspace with an embedded agent.
              </p>

              <div className="mt-6 inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-neutral-400 dark:text-neutral-500">
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    healthCheck.isSuccess ? "bg-primary" : "bg-neutral-300 dark:bg-neutral-700",
                  )}
                />
                <span>{healthCheck.isSuccess ? "All systems operational" : "Status unavailable"}</span>
                {healthCheck.isSuccess ? (
                  <span className="text-neutral-300 dark:text-neutral-600">
                    · {String(healthCheck.data)}ms
                  </span>
                ) : null}
              </div>
            </div>

            <div className="md:col-span-3 md:col-start-7">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                Product
              </div>
              <ul className="space-y-2.5">
                {footerNav.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="md:col-span-2 md:col-start-11">
              <div className="mb-4 text-[11px] font-bold uppercase tracking-[0.18em] text-neutral-400 dark:text-neutral-500">
                Legal
              </div>
              <ul className="mb-6 space-y-2.5">
                {footerLegal.map((item) => (
                  <li key={item.to}>
                    <Link
                      to={item.to}
                      className="text-sm text-neutral-700 transition-colors hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
              <ThemeToggle />
            </div>
          </div>

          <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-neutral-200 pt-6 md:mt-16 md:flex-row md:items-center dark:border-neutral-800/80">
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              &copy; {year} Brainiac. All rights reserved.
            </p>
            <p className="text-xs text-neutral-400 dark:text-neutral-500">
              Built for people who think on canvases.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
