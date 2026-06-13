/** Shared Tailwind class strings for the authenticated app shell. */

/** z-index scale: mobile nav 70, dock 50, backdrop 45 */
export const SHELL_Z_MOBILE_NAV = 70;
export const SHELL_Z_DOCK = 50;
export const SHELL_Z_BACKDROP = 45;

export const shellLabelClass =
  "text-[11px] font-bold uppercase tracking-[0.18em] text-muted";

export const shellFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

export const shellEmptyPanelClass =
  "rounded-2xl border border-dashed border-default bg-muted/20 p-10 text-center";

export const shellErrorPanelClass =
  "rounded-2xl border border-error/30 bg-error/5 p-6 text-center";

export const shellRailLinkBaseClass =
  "flex size-10 items-center justify-center rounded-2xl text-muted transition-colors hover:bg-elevated hover:text-highlighted";

export const shellRailLinkActiveClass = "bg-primary/10 text-primary border border-primary/30";

export const shellTopbarBaseClass = "border-b border-default bg-default";

export const shellTopbarSpatialClass = "app-shell__topbar--spatial";

export const shellTopbarExecutionClass = "app-shell__topbar--execution";

export const shellSearchPillClass =
  "flex w-full max-w-md items-center justify-between gap-4 rounded-2xl border border-default bg-muted px-3.5 py-2.5 text-left text-muted transition-colors hover:bg-elevated hover:text-highlighted";

export const shellSearchIconButtonClass =
  "inline-flex size-9 items-center justify-center rounded-xl border border-default bg-muted text-muted transition-colors hover:bg-elevated hover:text-highlighted";

export const shellContextSlotClass = "app-shell__context min-w-0 flex-1";

export const shellUtilityClusterClass =
  "app-shell__utilities flex shrink-0 items-center gap-1.5 sm:gap-2";
