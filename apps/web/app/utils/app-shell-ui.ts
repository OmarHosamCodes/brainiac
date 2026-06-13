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

/** Shared geometry for all topbar controls: sm buttons, rounded-xl, 36px icon targets. */
export const shellTopbarControlClass = "shrink-0 rounded-xl";

export const shellTopbarIconButtonClass = shellTopbarControlClass;

export const shellTopbarActionButtonClass = shellTopbarControlClass;

export const shellTopbarChipClass =
  "inline-flex h-9 min-w-0 items-center gap-1.5 rounded-xl border border-default bg-muted px-2.5 text-xs font-semibold text-highlighted transition-colors hover:bg-elevated";

export const shellTopbarFieldClass = "h-9 min-w-0";

export const shellSearchPillClass =
  "flex h-9 w-full max-w-sm items-center justify-between gap-3 rounded-xl border border-default bg-muted px-3 text-left text-sm text-muted transition-colors hover:bg-elevated hover:text-highlighted";

export const shellSearchIconButtonClass = [
  shellTopbarControlClass,
  "inline-flex size-9 items-center justify-center border border-default bg-muted text-muted transition-colors hover:bg-elevated hover:text-highlighted",
].join(" ");

export const shellContextSlotClass = "app-shell__context min-w-0 flex-1";

export const shellUtilityClusterClass =
  "app-shell__utilities flex shrink-0 items-center gap-1.5 sm:gap-2";

export const shellActionsSlotClass = "flex items-center gap-1.5 sm:gap-2";

export const shellBreadcrumbMutedClass = "truncate text-sm text-muted";

export const shellBreadcrumbCurrentClass = "truncate text-sm font-semibold text-highlighted";

export const shellBreadcrumbSeparatorClass = "shrink-0 text-xs text-dimmed";

export const shellContextDividerClass = "h-4 w-px shrink-0 bg-default";

export const shellChipClass =
  "inline-flex min-w-0 items-center gap-1.5 rounded-full border border-default bg-muted px-2.5 py-1 text-xs font-bold text-highlighted transition-colors hover:bg-elevated";

export const shellSegmentTabClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted";

export const shellSegmentTabActiveClass = "bg-primary/10 text-primary";

export const shellPageClass =
  "mx-auto flex h-full w-full max-w-[120rem] flex-col px-6 pb-16 lg:px-8";

export const shellPageBodyClass = "flex min-h-0 flex-1 flex-col gap-4 pt-4";

export const shellPageIntroClass = "text-sm text-muted";

export const shellInPageSubnavClass =
  "-mx-6 border-b border-default bg-default px-6 lg:-mx-8 lg:px-8";
