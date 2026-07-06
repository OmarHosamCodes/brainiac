/** Shared liquid-glass panel + enter/exit animation hooks (see index.css). */
export const liquidGlassPanelClass =
  "ui-liquid-glass-surface ui-liquid-glass-content z-50 overflow-hidden rounded-xl border border-white/10 dark:border-white/[0.08] text-popover-foreground shadow-md outline-none";

export const liquidGlassMenuContentClass = `${liquidGlassPanelClass} min-w-[8rem] p-1`;

export const liquidGlassMenuItemClass =
  "rounded-lg transition-[background-color,transform,color] duration-200 ease-[var(--motion-ease-rail)] focus:bg-accent/80";

export const liquidGlassMenuSeparatorClass = "-mx-1 my-1 h-px bg-border/60";
