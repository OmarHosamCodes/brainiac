import { useEffect, useState, type ReactNode } from "react";

import { shellContentInClass } from "@/features/app-shell/app-shell-ui";
import { LogoLoader } from "@/features/app-shell/components/logo-loader";
import { SHELL_CONTENT_IN_MS } from "@/features/app-shell/shell/shell-boot";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

type ShellBootSurfaceProps = {
  booting: boolean;
  label: string;
  children: ReactNode;
  className?: string;
  /** Fill the parent (Tracker / canvas). Off lets document-scroll pages grow and scroll. */
  fill?: boolean;
};

export function ShellBootSurface({
  booting,
  label,
  children,
  className,
  fill = true,
}: ShellBootSurfaceProps) {
  const reducedMotion = usePrefersReducedMotion();
  const [loaderVisible, setLoaderVisible] = useState(booting);
  const [loaderExiting, setLoaderExiting] = useState(false);

  useEffect(() => {
    if (booting) {
      setLoaderVisible(true);
      setLoaderExiting(false);
      return;
    }

    if (!loaderVisible) return;

    if (reducedMotion) {
      setLoaderVisible(false);
      setLoaderExiting(false);
      return;
    }

    setLoaderExiting(true);
    const timeoutId = window.setTimeout(() => {
      setLoaderVisible(false);
      setLoaderExiting(false);
    }, SHELL_CONTENT_IN_MS);

    return () => window.clearTimeout(timeoutId);
  }, [booting, loaderVisible, reducedMotion]);

  const occupyViewport = fill || booting || loaderVisible;

  return (
    <div
      className={cn(
        "relative min-h-0",
        occupyViewport ? "flex h-full min-h-full flex-col" : "min-h-full",
        className,
      )}
    >
      {!booting ? (
        <div className={cn(fill && "flex min-h-0 flex-1 flex-col", shellContentInClass)}>
          {children}
        </div>
      ) : null}
      {loaderVisible ? (
        <div
          className={cn(
            "z-[1]",
            booting ? "flex min-h-full flex-1 flex-col" : "absolute inset-0",
            loaderExiting &&
              "pointer-events-none opacity-0 transition-opacity duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)]",
          )}
        >
          <LogoLoader placement="slot" label={label} />
        </div>
      ) : null}
    </div>
  );
}
