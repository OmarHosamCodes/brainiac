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

/** Readable placeholder text on default/elevated agency surfaces (≥4.5:1). */
export const agencyInputPlaceholderClass = "placeholder:text-muted-foreground";

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
  "border-b border-default last:border-b-0 transition-[background-color,opacity,transform] duration-200 motion-reduce:transition-none",
  "hover:bg-default/60",
].join(" ");

export const agencyTaskRowSelectedClass = "bg-primary/10 hover:bg-primary/10";

export const agencyTaskRowDoneClass =
  "bg-success/10 text-success hover:bg-success/15 [&_p]:text-success [&_[data-task-status-label]]:text-success";

export const agencyTaskRowCompleteClass = "agency-task-row-complete";

/** Time pane — execution stack beside the task rail. */
export const agencyTimePaneClass =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-default bg-elevated";

export const agencyTimeTrackerBarClass = [
  "shrink-0 border-b border-default bg-default/75 px-4 py-2.5",
].join(" ");

export const agencyTimeDayHeaderClass = [
  "flex shrink-0 items-center justify-between border-y border-default bg-muted/55 px-4 py-2 text-xs",
].join(" ");

export const agencyTimeEntryRowClass = [
  "border-b border-default bg-elevated px-4 py-2.5 transition-colors motion-reduce:transition-none",
  "hover:bg-default/55",
].join(" ");

/** Shared column grid for time entry rows inside the horizontal scroll region. */
export const agencyTimeEntryGridClass =
  "grid w-full min-w-[44rem] grid-cols-[minmax(12rem,1.35fr)_minmax(10rem,0.9fr)_8.5rem_6.5rem_5rem] items-center gap-0";

export const agencyTimeEntryScrollClass = "min-w-0 overflow-x-auto";

export const agencyTimeEntryRowHighlightClass =
  "bg-success/10 motion-reduce:transition-none transition-colors duration-500";

export const agencyTimeEntryRowEditingClass = "bg-primary/5 hover:bg-primary/5";

export const agencyTimeSuggestionChipClass = [
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-default bg-elevated px-2 py-1",
  "text-xs font-medium text-muted transition-colors hover:bg-default hover:text-highlighted",
].join(" ");

export const agencyTimeWeekFooterClass = [
  "flex shrink-0 items-center justify-between border-t border-default px-4 py-2.5",
  "bg-default/75",
].join(" ");

export const agencyTimeFooterMetricClass = ["text-sm font-semibold", agencyMetricClass].join(" ");

export const agencyTimeLogSkeletonClass =
  "h-11 border-b border-default bg-elevated/40 motion-reduce:animate-none animate-pulse";
