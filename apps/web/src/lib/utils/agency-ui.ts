/** Shared Tailwind class strings for the Agency dense register. */

import {
  shellEmptyPanelClass,
  shellErrorPanelClass,
  shellFocusRingClass,
  shellLabelClass,
} from "@/lib/utils/app-shell-ui";

export const agencyLabelClass = shellLabelClass;

export const agencySectionTitleClass = "text-lg font-bold text-highlighted";

export const agencyMetricClass = "font-mono tabular-nums text-highlighted";

export const agencyFocusRingClass = shellFocusRingClass;

export const agencyPanelClass = "rounded-2xl border border-default bg-default";

export const agencyFormFieldClass = "flex w-full min-w-0 flex-col gap-1.5";

export const agencyFormLabelClass = "block text-sm font-semibold text-muted";

export const agencyErrorPanelClass = shellErrorPanelClass;

export const agencyEmptyPanelClass = shellEmptyPanelClass;

/** My Tasks execution rail — secondary neutral layer beside the work surface. */
export const agencyTaskRailClass =
  "flex h-full flex-col overflow-hidden rounded-xl border border-default bg-elevated";

export const agencyTaskRailHeaderClass =
  "flex shrink-0 items-center justify-between border-b border-default px-4 py-2.5";

export const agencyTaskRailCountPillClass = [
  agencyMetricClass,
  "rounded-full bg-muted px-2 py-0.5 text-xs text-muted",
].join(" ");

export const agencyTaskRailTrackingStripClass =
  "flex shrink-0 items-center gap-2 border-b border-default px-4 py-1.5 text-xs text-muted";

export const agencyTaskRowClass = [
  "border-b border-default last:border-b-0 transition-colors motion-reduce:transition-none",
  "hover:bg-default/60",
].join(" ");

export const agencyTaskRowSelectedClass = "bg-primary/10 hover:bg-primary/10";

export const agencyTaskRowDoneClass = "opacity-80";
