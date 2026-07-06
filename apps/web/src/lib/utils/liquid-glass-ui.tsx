import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Frosted backdrop layer — must stay transform-free so Firefox applies blur
 * (see ui-liquid-glass-frame for the animated / positioned shell).
 */
export const liquidGlassBackdropClass =
  "ui-liquid-glass-surface pointer-events-none absolute inset-0 z-0 rounded-[inherit]";

export function LiquidGlassBackdrop({ className }: { className?: string }) {
  return <div aria-hidden className={cn(liquidGlassBackdropClass, className)} />;
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
