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

export const agencyPanelClass = "rounded-[2rem] border border-default bg-default";

export const agencyFormFieldClass = "flex w-full min-w-0 flex-col gap-1.5";

export const agencyFormLabelClass = "block text-sm font-semibold text-muted";

export const agencyErrorPanelClass = shellErrorPanelClass;

export const agencyEmptyPanelClass = shellEmptyPanelClass;

/** My Tasks execution rail — secondary neutral layer beside the work surface. */
export const agencyTaskRailClass =
  "flex h-full flex-col overflow-hidden rounded-xl border border-default bg-elevated";

export const agencyTaskRailExpandedWidthClass = "lg:w-[26rem] lg:max-w-[26rem]";

export const agencyTaskRailCollapsedWidthClass = "lg:w-[5.5rem] lg:max-w-[5.5rem]";

export const agencyTaskRailSummaryClass =
  "flex shrink-0 items-center justify-between gap-3 border-b border-default px-4 py-2.5";

export const agencyTaskRailTrackingStripClass =
  "flex shrink-0 items-center gap-2 border-b border-default px-4 py-1.5 text-xs text-muted";

export const agencyTaskRailSummaryMetricClass = "flex items-center gap-1.5 text-[11px]";

export const agencyTaskRailSummaryLabelClass = "text-muted";

export const agencyTaskRailSummaryValueClass = [
  agencyMetricClass,
  "text-xs font-semibold",
].join(" ");

export const agencyTaskRailSummaryDividerClass = "h-3 w-px shrink-0 bg-default";

export const agencyTaskClientGroupHeaderClass = [
  "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs",
  "transition-colors hover:bg-default/50",
].join(" ");

export const agencyTaskRowMetaColumnClass = "flex shrink-0 items-center gap-1.5 self-center";

export const agencyTaskRowProjectPillClass = [
  "inline-flex max-w-[8rem] shrink-0 items-center rounded-full border border-default bg-elevated px-1.5 py-0.5",
  "text-[10px] font-semibold text-highlighted transition-colors hover:bg-default",
].join(" ");

export const agencyTaskRowStatusDotClass = "size-2 shrink-0 rounded-full";

export const agencyTaskRowCheckboxClass = [
  "inline-flex size-4 shrink-0 items-center justify-center rounded border border-default bg-elevated",
  "transition-colors hover:border-muted-foreground/40",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
].join(" ");

export const agencyTaskRowCheckboxCheckedClass =
  "border-highlighted bg-highlighted text-inverted";

export const agencyTaskRowClass = [
  "transition-[background-color,opacity,transform] duration-200 motion-reduce:transition-none",
  "cursor-pointer hover:bg-default/60",
].join(" ");

export const agencyTaskRowSelectedClass = "bg-primary/10 hover:bg-primary/10";

export const agencyTaskRowDoneClass =
  "bg-success/10 hover:bg-success/15 [&_button>span]:text-success/80";

export const agencyTaskRowCompleteClass = "agency-task-row-complete";

/** Time column beside the task rail — stacks tracker and log as separate panels. */
export const agencyTimePaneStackClass =
  "flex h-full min-h-0 flex-col gap-3 overflow-hidden";

export const agencyTimeTrackerPanelClass =
  "shrink-0 overflow-hidden rounded-xl border border-default bg-default";

export const agencyTimeLogPanelClass =
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-default bg-elevated";

export const agencyTimeTrackerBarClass = ["shrink-0 px-4 py-2.5"].join(" ");

export const agencyTimeDayHeaderClass = [
  "flex shrink-0 items-center justify-between border-y border-default bg-muted/55 px-4 py-2 text-xs",
].join(" ");

export const agencyTimeWeekHeaderClass = [
  "flex shrink-0 items-center justify-between px-4 py-2.5 text-xs",
].join(" ");

export const agencyTimeEntryRowClass = [
  "border-b-[1px] border-dashed border-default bg-card/20 px-4 py-2.5 transition-colors motion-reduce:transition-none",

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

/** Structured agency task agent reply card. */
export const agencyAgentMessageCardClass =
  "rounded-xl border border-default bg-muted/20 px-3 py-2.5 text-sm text-highlighted";

export const agencyAgentMessageCodeClass =
  "mt-2 overflow-x-auto rounded-lg border border-default bg-default px-2.5 py-2 font-mono text-xs text-highlighted";
