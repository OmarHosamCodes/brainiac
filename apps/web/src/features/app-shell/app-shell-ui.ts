/** Shared Tailwind class strings for the authenticated app shell. */
import { cn } from "@/lib/utils";

/** z-index scale: mobile nav 70, dock 50, backdrop 45 */
export const SHELL_Z_MOBILE_NAV = 70;
export const SHELL_Z_DOCK = 50;
export const SHELL_Z_BACKDROP = 45;

export const shellLabelClass = "text-[11px] font-bold uppercase tracking-[0.18em] text-muted";

export const shellFocusRingClass =
  "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/20";

export const shellEmptyPanelClass =
  "rounded-2xl border border-dashed border-default bg-muted/20 p-10 text-center";

export const shellErrorPanelClass = "rounded-2xl border border-error/30 bg-error/5 p-6 text-center";

export const shellLoadingPanelClass = "rounded-2xl border border-default bg-muted/20 p-6";

export const shellRailIconClass = "size-4 shrink-0";

export const shellRailLinkBaseClass =
  "flex size-8 shrink-0 items-center justify-center rounded-full text-muted transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-elevated hover:text-highlighted active:scale-95";

export const shellRailLinkActiveClass = "bg-primary/10 text-primary border border-primary/30";

export const shellRailToggleClass = cn(shellRailLinkBaseClass, "border border-transparent");

export const shellRailExpandedLinkClass = cn(
  "flex h-8 w-full min-w-0 items-center gap-2.5 rounded-full px-2.5 text-[13px] font-medium text-muted transition-[background-color,border-color,color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:bg-elevated hover:text-highlighted active:scale-[0.98]",
  shellFocusRingClass,
);

export const shellRailAvatarClass =
  "relative flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full border border-default bg-default text-[10px] font-semibold";

export const shellRailAvatarCollapsedClass =
  "group relative flex size-8 items-center justify-center overflow-hidden rounded-full border border-default bg-default text-[11px] font-semibold text-highlighted transition-[background-color,border-color,transform] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] hover:border-accented hover:bg-elevated focus-visible:border-accented focus-visible:bg-elevated active:scale-95";

export const shellRailExpandedLinkActiveClass =
  "bg-primary/10 text-primary border border-primary/30";

export const shellRailFooterClass =
  "mt-auto flex w-full flex-col gap-1.5 border-t border-default pt-2.5";

/** Topbar shell frame (paired with `.app-shell__topbar` in index.css). */
export const shellTopbarBaseClass = "app-shell__topbar border-b border-default bg-default";

export const shellTopbarSpatialClass = "app-shell__topbar--spatial";

export const shellTopbarExecutionClass = "app-shell__topbar--execution";

export const shellHeaderContextRegionClass = "app-shell__topbar-left min-w-0 flex-1";

export const shellHeaderContextInnerClass = "flex min-w-0 items-center gap-2";

export const shellHeaderActionsRegionClass = "flex min-w-0 items-center gap-1.5 sm:gap-2";

export const shellHeaderUtilityButtonClass = cn("size-9 shrink-0 rounded-xl", shellFocusRingClass);

export const shellHeaderUtilityActionClass = cn("shrink-0 rounded-xl", shellFocusRingClass);

/** Shared geometry for all topbar controls: sm buttons, rounded-xl, 36px icon targets. */
export const shellTopbarControlClass = "shrink-0 rounded-xl";

export const shellTopbarIconButtonClass = shellTopbarControlClass;

export const shellTopbarActionButtonClass = shellTopbarControlClass;

export const shellTopbarChipClass =
  "inline-flex h-9 min-w-0 items-center gap-1.5 rounded-xl border border-default bg-muted px-2.5 text-xs font-semibold text-highlighted transition-colors hover:bg-elevated";

export const shellTopbarFieldClass = "h-9 min-w-0";

export const shellSearchPillClass =
  "flex h-9 w-full max-w-sm items-center justify-between gap-3 rounded-xl border border-default bg-muted px-3 text-left text-sm text-muted transition-colors hover:bg-elevated hover:text-highlighted";

export const shellSearchIconButtonClass = cn(
  shellTopbarControlClass,
  "inline-flex size-9 items-center justify-center border border-default bg-muted text-muted transition-colors hover:bg-elevated hover:text-highlighted",
);

export const shellContextSlotClass = "app-shell__context min-w-0 flex-1";

export const shellUtilityClusterClass =
  "app-shell__utilities flex shrink-0 items-center gap-1.5 sm:gap-2";

export const shellActionsSlotClass = shellHeaderActionsRegionClass;

export const shellBreadcrumbTrailClass = "flex min-w-0 items-center gap-2";

export const shellBreadcrumbMutedClass = "truncate text-sm text-muted";

export const shellBreadcrumbCurrentClass = "truncate text-sm font-semibold text-highlighted";

export const shellBreadcrumbSeparatorClass = "shrink-0 text-xs text-dimmed";

export const shellContextDividerClass = "h-4 w-px shrink-0 bg-border";

export const shellChipClass =
  "inline-flex min-w-0 items-center gap-1.5 rounded-full border border-default bg-muted px-2.5 py-1 text-xs font-bold text-highlighted transition-colors hover:bg-elevated";

export const shellSegmentTabClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:bg-elevated hover:text-highlighted";

export const shellSegmentTabActiveClass = "bg-primary/10 text-primary";

export const shellMobileNavClass =
  "app-shell__mobile-nav fixed inset-x-0 bottom-0 border-t border-default bg-default md:hidden";

export const shellMobileNavInnerClass = "mx-auto flex max-w-md items-center justify-around p-2";

export const shellMobileNavLinkClass = cn(
  "inline-flex h-10 min-w-[4.5rem] items-center justify-center gap-1.5 rounded-xl px-2 text-xs font-semibold transition-colors",
  shellFocusRingClass,
);

export const shellMobileNavLinkActiveClass = "bg-primary/10 text-primary";

export const shellMobileNavLinkIdleClass = "text-muted hover:bg-elevated hover:text-highlighted";

/** Page column — equal L/R pad, no max-width. Nest pad pairs with `--shell-inner-radius`. */
export const shellPageClass =
  "flex h-full w-full flex-col px-[var(--shell-nest-pad,1rem)] pb-16";

/** Full equal nest padding (work surfaces that need concentric corners). */
export const shellPageNestClass =
  "flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden p-[var(--shell-nest-pad,1rem)]";

export const shellPageBodyClass = "flex min-h-0 flex-1 flex-col gap-4 pt-4";

export const shellPageIntroClass = "text-sm text-muted";

export const shellInPageSubnavClass =
  "-mx-[var(--shell-nest-pad,1rem)] border-b border-default bg-default px-[var(--shell-nest-pad,1rem)]";

/** Outer content frame radius — set on the shell page transition in execution mode. */
export const shellContentFrameClass =
  "rounded-[var(--shell-outer-radius,0px)] overflow-hidden";

/** Inner panel radius — tracker, log, and other nest children. */
export const shellInnerRadiusClass = "rounded-[var(--shell-inner-radius,1rem)]";

/** Motion utilities (see index.css for keyframes and reduced-motion guards). */
export const shellPageEnterClass = "shell-page-enter";

export const shellContentInClass = "shell-content-in";

export const shellStaggerItemClass = "shell-stagger-item";

export const shellConfirmInClass = "shell-confirm-in";

export const shellPanelStackClass = "shell-panel-stack";

export const shellPanelClass = "shell-panel";

export const shellPanelActiveClass = "shell-panel--active";
