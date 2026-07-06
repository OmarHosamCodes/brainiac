import * as React from "react";
import { useLayoutEffect, useRef } from "react";

import { cn } from "@/lib/utils";

/**
 * Frosted backdrop layer — gradient highlights only; blur lives on the frame.
 * Firefox ignores child backdrop-filter inside overflow:hidden frames when a
 * Radix popper ancestor has transform; we fold that into top/left (below).
 */
export const liquidGlassBackdropClass =
  "ui-liquid-glass-surface pointer-events-none absolute inset-0 z-0 rounded-[inherit]";

/** Radix measures off-screen with translate(0, -200%). */
function isMeasuringTransform(transform: string) {
  return transform.includes("-200%");
}

/** Fold translate() into top/left so frame backdrop-filter applies in Firefox. */
function flattenPopperTransform(wrapper: HTMLElement) {
  const transform = wrapper.style.transform;
  if (!transform || transform === "none" || isMeasuringTransform(transform)) {
    return;
  }

  const matrix = new DOMMatrix(transform);
  wrapper.style.left = `${matrix.m41}px`;
  wrapper.style.top = `${matrix.m42}px`;
  wrapper.style.transform = "none";
}

export function LiquidGlassBackdrop({ className }: { className?: string }) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    if (!surface) return;

    const wrapper = surface.parentElement?.closest("[data-radix-popper-content-wrapper]");
    if (!(wrapper instanceof HTMLElement)) return;

    const syncTransform = () => {
      flattenPopperTransform(wrapper);
    };

    syncTransform();
    const observer = new MutationObserver(syncTransform);
    observer.observe(wrapper, { attributes: true, attributeFilter: ["style"] });

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={surfaceRef}
      aria-hidden
      className={cn(liquidGlassBackdropClass, className)}
    />
  );
}

/** Content layer above the frosted backdrop — safe target for enter/exit animation. */
export const liquidGlassBodyClass = "ui-liquid-glass-body relative z-[1]";

export function LiquidGlassBody({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return <div className={cn(liquidGlassBodyClass, className)}>{children}</div>;
}

/** Outer shell: border, shadow, Radix positioning. */
export const liquidGlassFrameClass =
  "ui-liquid-glass-frame relative z-50 overflow-hidden rounded-xl border border-white/10 dark:border-white/[0.08] text-popover-foreground outline-none";

/** @deprecated use liquidGlassFrameClass */
export const liquidGlassPanelClass = liquidGlassFrameClass;

export const liquidGlassMenuContentClass = `${liquidGlassFrameClass} min-w-[8rem]`;

export const liquidGlassMenuItemClass =
  "rounded-lg transition-[background-color,transform,color] duration-200 ease-[var(--motion-ease-rail)] focus:bg-accent/80";

export const liquidGlassMenuSeparatorClass = "-mx-1 my-1 h-px bg-border/60";
