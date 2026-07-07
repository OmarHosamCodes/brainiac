/** Shared Tailwind class strings for the Agency dense register. */

import { useLayoutEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

import {
  shellEmptyPanelClass,
  shellErrorPanelClass,
  shellFocusRingClass,
  shellLabelClass,
} from "@/lib/utils/app-shell-ui";

export const AGENCY_PAGE_SCROLL_ATTR = "data-agency-page-scroll";

/** Page-level scroll container for agency surfaces (see agency-page.tsx). */
export function getAgencyPageScrollElement(): HTMLElement | null {
  return document.querySelector(`[${AGENCY_PAGE_SCROLL_ATTR}]`);
}

/** Offset of a list root from the agency page scroll top (for @tanstack/react-virtual scrollMargin). */
export function getAgencyPageScrollMargin(listElement: HTMLElement | null): number {
  const scrollElement = getAgencyPageScrollElement();
  if (!scrollElement || !listElement) return 0;

  const scrollRect = scrollElement.getBoundingClientRect();
  const listRect = listElement.getBoundingClientRect();
  return listRect.top - scrollRect.top + scrollElement.scrollTop;
}

export function useAgencyPageScrollMargin(listRef: RefObject<HTMLElement | null>): number {
  const [scrollMargin, setScrollMargin] = useState(0);

  useLayoutEffect(() => {
    const scrollElement = getAgencyPageScrollElement();
    const listElement = listRef.current;
    if (!scrollElement || !listElement) return;

    const update = () => setScrollMargin(getAgencyPageScrollMargin(listElement));

    update();
    scrollElement.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(listElement);
    resizeObserver.observe(scrollElement);

    return () => {
      scrollElement.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
    };
  }, [listRef]);

  return scrollMargin;
}

/** Work surface fills the agency page body so nested rails scroll independently. */
export const agencyWorkSurfaceShellClass = "flex h-full min-h-0 flex-1 flex-col overflow-hidden";

export const agencyLabelClass = shellLabelClass;

export const agencySectionTitleClass = "text-lg font-bold text-highlighted";

export const agencyMetricClass = "font-mono tabular-nums text-highlighted";

export const agencyFocusRingClass = shellFocusRingClass;

/** Hairline separator for overlapping member avatar stacks. */
export const agencyAvatarStackRingClass = "ring-1 ring-background";

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

export const agencyTaskRailSummaryValueClass = cn(agencyMetricClass, "text-xs font-semibold");

export const agencyTaskRailSummaryDividerClass = "h-3 w-px shrink-0 bg-default";

/** Virtual-list height estimates — keep in sync with header padding/typography below. */
export const AGENCY_TASK_CLIENT_GROUP_HEADER_HEIGHT = 44;
export const AGENCY_TASK_PROJECT_GROUP_HEADER_HEIGHT = 36;

export const agencyTaskClientGroupHeaderClass = cn(
  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm",
  "transition-colors hover:bg-default/50",
);

export const agencyTaskProjectGroupHeaderClass = cn(
  "flex w-full items-center justify-between gap-2 px-3 py-2 pl-4 text-left text-xs",
  "transition-colors hover:bg-default/40",
);

export const agencyTaskRowContentClass = "relative flex gap-1.5 px-3 py-2.5";

export const agencyTaskRowNestedContentClass = "relative flex gap-1.5 px-3 py-1.5 pl-7";

export const agencyTaskRowProjectPillClass = cn(
  "inline-flex max-w-[8rem] shrink-0 items-center rounded-full border border-default bg-elevated px-1.5 py-0.5",
  "text-[10px] font-semibold text-highlighted transition-colors hover:bg-default",
);

export const agencyTaskRowCheckboxClass = cn(
  "inline-flex size-3.5 shrink-0 items-center justify-center rounded border border-default bg-elevated",
  "transition-colors hover:border-muted-foreground/40",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTaskRowCheckboxCheckedClass = "border-highlighted bg-highlighted text-inverted";

export const agencyTaskRowClass = cn(
  "transition-[background-color,opacity,transform] duration-200 motion-reduce:transition-none",
  "cursor-pointer hover:bg-default/60",
);

export const agencyTaskRowSelectedClass = "bg-primary/10 hover:bg-primary/10";

export const agencyTaskRowDoneClass =
  "bg-success/10 hover:bg-success/15 [&_button>span]:text-success/80";

export const agencyTaskRowCompleteClass = "agency-task-row-complete";

export const agencySearchHighlightMarkClass = "agency-search-highlight-mark";

export const agencyTaskRowNeedsDescriptionClass = "bg-warning/5";

/** Time column beside the task rail — stacks tracker and log as separate panels. */
export const agencyTimePaneStackClass = "flex min-h-0 flex-1 flex-col gap-3 overflow-hidden";

export const agencyTimeTrackerPanelClass =
  "shrink-0 overflow-hidden rounded-xl border border-default bg-default";

export const agencyTimeLogPanelClass =
  "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-default bg-elevated";

export const agencyTimeTrackerBarClass = cn("shrink-0 px-4 py-2.5");

export const agencyTimeDayHeaderClass = cn(
  "flex shrink-0 items-center justify-between border-y border-default bg-muted/55 px-4 py-2 text-xs",
);

export const agencyTimeWeekHeaderClass = cn(
  "flex shrink-0 items-center justify-between px-4 py-2.5 text-xs",
);

export const agencyTimeEntryRowClass = cn(
  "border-b-[1px] border-dashed border-default bg-card/20 px-4 py-3 transition-colors motion-reduce:transition-none",
);

/** Inline time inputs in entry rows. */
export const agencyTimeEntryTimeInputClass = cn(
  "h-7 w-full min-w-0 appearance-none border-0 bg-transparent px-0 font-mono text-sm font-medium tabular-nums tracking-tight text-muted shadow-none focus-visible:ring-0 focus-visible:text-highlighted",
  "[&::-webkit-calendar-picker-indicator]:hidden",
);

/** Shared column grid for time entry rows inside the horizontal scroll region. */
export const agencyTimeEntryGridClass =
  "grid w-full min-w-[46rem] grid-cols-[minmax(12rem,1.35fr)_minmax(10rem,0.9fr)_minmax(11rem,auto)_minmax(6.5rem,7rem)_5.5rem] items-center gap-0";

export const agencyTimeEntryScrollClass = "min-w-0 overflow-x-auto";

export const agencyTimeEntryRowHighlightClass =
  "bg-success/10 motion-reduce:transition-none transition-colors duration-500";

export const agencyTimeEntryRowEditingClass = "bg-primary/5 hover:bg-primary/5";

export const agencyTimeSuggestionChipClass = cn(
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-default bg-elevated px-2 py-1",
  "text-xs font-medium text-muted transition-colors hover:bg-default hover:text-highlighted",
);

export const agencyTimeWeekFooterClass = cn(
  "flex shrink-0 items-center justify-between border-t border-default px-4 py-2.5",
  "bg-default/75",
);

export const agencyTimeFooterMetricClass = cn("text-sm font-semibold", agencyMetricClass);

export const agencyTimeLogSkeletonClass =
  "h-11 border-b border-default bg-elevated/40 motion-reduce:animate-none animate-pulse";

/** Structured agency task agent reply card. */
export const agencyAgentMessageCardClass =
  "rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground";

export const agencyAgentMessageCodeClass =
  "mt-2 overflow-x-auto rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground";
