/** Shared Tailwind class strings for the Agency dense register. */

import { useLayoutEffect, useState, type RefObject } from "react";
import { cn } from "@/lib/utils";

import {
  shellEmptyPanelClass,
  shellErrorPanelClass,
  shellFocusRingClass,
  shellLabelClass,
} from "@/features/app-shell/app-shell-ui";

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

/**
 * Work-surface type scale — one hierarchy across tracker, tabs, sessions, and tables.
 * title → primary row name; metric → clock totals; meta → secondary; time → range ticks.
 */
export const agencyWorkTitleClass = "text-sm font-semibold leading-snug text-highlighted";
export const agencyWorkMetricClass = cn(agencyMetricClass, "text-sm font-semibold");
export const agencyWorkMetaClass = "text-xs font-normal text-muted";
export const agencyWorkTimeRangeClass = "font-mono text-xs font-medium tabular-nums text-muted";
export const agencyWorkWeekLabelClass = "text-xs font-medium text-muted";
export const agencyWorkCountBadgeClass = cn(
  "inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-default bg-elevated px-1.5",
  "font-mono text-xs font-semibold tabular-nums text-muted",
  "transition-colors hover:bg-default hover:text-highlighted",
);

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

/** Collapsed rail: top-aligned progress ring and summary. */
export const agencyTaskRailCollapsedClass = cn(
  agencyTaskRailClass,
  "relative items-center justify-start gap-2 px-2 pt-2.5 pb-2",
);

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
export const AGENCY_TASK_PROJECT_GROUP_HEADER_HEIGHT = 38;

export const agencyTaskClientGroupHeaderClass = cn(
  "flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm",
  "transition-colors hover:bg-default/50",
);

/** Muted band headers — time log day groups, task rail project groups, etc. */
export const agencyMutedSectionHeaderClass = cn(
  "flex min-h-10 items-center justify-between gap-3 border-y border-default bg-elevated/65 px-4 py-2 text-xs sm:px-5",
);

export const agencyTaskProjectGroupHeaderClass = cn(
  agencyMutedSectionHeaderClass,
  "w-full shrink-0 gap-2 text-left transition-colors hover:bg-muted/75",
);

export const agencyTaskRowContentClass = "relative flex gap-1.5 px-3 py-2.5";

export const agencyTaskRowNestedContentClass = "relative flex gap-1.5 px-3 py-1.5";

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

export const agencyTaskRowDoneClass = "hover:bg-default/60";

export const agencyTaskRowCompleteClass = "agency-task-row-complete";

export const agencySearchHighlightMarkClass = "agency-search-highlight-mark";

export const agencyTaskRowNeedsDescriptionClass = "bg-warning/5";

/** Work time surface — stacks tracker and log as separate panels. */
export const agencyTimePaneStackClass = "flex min-h-0 min-w-0 flex-1 flex-col gap-4 font-sans";

export const agencyTimePaneBodyClass = cn(
  "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border border-default bg-default",
  "rounded-[var(--shell-inner-radius,1rem)]",
);

export const agencyTimeTrackerPanelClass = "relative z-20 shrink-0 overflow-visible";

/** Log body inside the unified work pane — no second border/radius. */
export const agencyTimeLogPanelClass = "flex min-h-0 flex-1 flex-col overflow-hidden";

/** Tab strip sits inside the pane; radius belongs on the pane, not here. */
export const agencyWorkTabShellClass = "shrink-0";

export const agencyWorkTrackerCardClass =
  "shrink-0 overflow-hidden rounded-[var(--shell-inner-radius,1rem)] border border-default bg-default";

export const agencyWorkTabBarClass =
  "flex h-10 shrink-0 items-center justify-between gap-2 border-b border-default px-2 sm:px-3";

export const agencyWorkTabClass = cn(
  "inline-flex h-full shrink-0 items-center border-b-2 border-transparent px-2.5 text-sm font-medium text-muted transition-colors",
  "hover:text-highlighted",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyWorkTabActiveClass = "border-highlighted font-semibold text-highlighted";

export const agencyWorkTabCreateClass = cn(
  "h-8 shrink-0 gap-1.5 rounded-full px-3 text-xs font-semibold",
  agencyFocusRingClass,
);

export const agencyWorkTableGridClass =
  "grid min-h-14 w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.9fr)_minmax(0,0.75fr)_4.5rem] items-center gap-x-0 px-4 py-2 sm:px-5 sm:[&>*+*]:border-l sm:[&>*+*]:border-dashed sm:[&>*+*]:border-default sm:[&>*+*]:pl-4";

export const agencyWorkTableGridDoneClass =
  "grid min-h-14 w-full grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.6fr)_minmax(0,0.75fr)_4.5rem] items-center gap-x-0 px-4 py-2 sm:px-5 sm:[&>*+*]:border-l sm:[&>*+*]:border-dashed sm:[&>*+*]:border-default sm:[&>*+*]:pl-4";

export const agencyWorkTableGridDelegatedClass =
  "grid min-h-14 w-full grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.85fr)_4.5rem] items-center gap-x-0 px-4 py-2 sm:px-5 sm:[&>*+*]:border-l sm:[&>*+*]:border-dashed sm:[&>*+*]:border-default sm:[&>*+*]:pl-4";

/** Visual chrome only — pair with the matching row grid class so header cells align. */
export const agencyWorkTableHeaderClass =
  "min-h-10 border-b border-default bg-elevated/65 text-[11px] font-semibold text-muted";

export const agencyWorkTableBodyScrollClass = "min-h-0 flex-1 overflow-y-auto p-0";

export const agencyWorkTableStackClass = "flex flex-col gap-5";

export const agencyWorkTableListClass = "overflow-hidden border-y border-default bg-default";

/** Shared compact state treatment within the work-surface content pane. */
export const agencyWorkSurfaceStateClass =
  "mx-auto flex w-full max-w-md flex-col items-center rounded-none border border-default bg-elevated/35 px-5 py-8 text-center";

export const agencyWorkTableRowClass = cn(
  agencyWorkTableGridClass,
  "border-b border-dashed border-default transition-colors hover:bg-elevated/60 motion-reduce:transition-none",
);

export const agencyWorkPlayButtonClass = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-default bg-elevated text-muted",
  "transition-colors hover:bg-default hover:text-highlighted",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

/** Ghost icon control for entry rails — play and menu share this (no circle chrome). */
export const agencyTimeEntryIconButtonClass = cn(
  "inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted",
  "transition-colors hover:bg-elevated hover:text-highlighted",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTimeTrackerCardClass = cn(
  agencyWorkTrackerCardClass,
  "flex min-h-14 min-w-0 flex-row items-center gap-2 overflow-visible px-4 py-2 sm:gap-3 sm:px-5",
);

export const agencyTimeTrackerDescriptionZoneClass =
  "group/desc relative min-w-0 flex-1 basis-0 overflow-visible";

export const agencyTimeTrackerControlsZoneClass =
  "flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2";

export const agencyTimeTrackerSplitClass = "flex min-w-0 flex-row items-center gap-2 sm:gap-3";

export const agencyTimeTrackerDescriptionCardClass = cn(
  agencyWorkTrackerCardClass,
  "group/desc relative flex min-h-14 min-w-0 flex-1 basis-0 flex-col justify-center gap-0 overflow-visible px-3 py-2",
);

export const agencyTimeTrackerControlsCardClass = cn(
  agencyWorkTrackerCardClass,
  "flex min-h-14 min-w-0 shrink-0 items-center px-3 py-2",
);

export const agencyTimeTrackerDescriptionLabelClass =
  "text-xs font-semibold leading-none text-muted";

export const agencyTimeTrackerDescriptionInputClass =
  "block h-8 w-full min-w-0 truncate rounded-none border-0 bg-transparent px-0.5 py-0 text-sm font-medium leading-snug shadow-none";

export const agencyTimeTrackerActiveRowClass =
  "flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2";

export const agencyTimeTrackerStatusZoneClass =
  "flex min-w-0 max-w-[10rem] shrink items-center gap-1.5 sm:max-w-[13rem]";

export const agencyTimeTrackerActionsZoneClass = "flex shrink-0 items-center gap-3 pl-0.5";

export const agencyTimeTrackerStatusDividerClass =
  "mx-0.5 h-8 shrink-0 border-l border-dashed border-default";

export const agencyTimeTrackerMetricClass = cn(
  agencyWorkMetricClass,
  "w-[5rem] shrink-0 text-center",
);

export const agencyTimeTrackerMetricButtonClass = cn(
  agencyTimeTrackerMetricClass,
  "inline-flex h-8 items-center justify-center rounded-md px-1 transition-colors hover:bg-elevated",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTimeTrackerTaskChooserTriggerClass = cn(
  "h-8 min-h-0 w-full min-w-0 max-w-full justify-start gap-1 overflow-hidden border-0 bg-transparent px-0 py-0 text-xs font-normal text-highlighted shadow-none",
  "transition-colors hover:bg-elevated/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export const agencyTimeTrackerPrimaryActionClass =
  "h-8 shrink-0 whitespace-nowrap rounded-full px-3 text-xs font-semibold";

export const agencyTimeTrackerIconActionClass = cn(
  "h-8 w-8 shrink-0 rounded-full p-0",
  agencyFocusRingClass,
);

export const agencyTimeTrackerSuggestionAnchorClass =
  "absolute top-full right-0 left-0 z-50 mt-1 max-h-48";

/** Opaque popover surface — liquid-glass / missing elevated tokens ghost Assign/Create through. */
export const agencyTimeTrackerSuggestionPanelClass = cn(
  "relative z-50 max-h-48 overflow-y-auto overflow-x-hidden rounded-xl border border-border bg-popover text-popover-foreground shadow-lg outline-none",
);

export const agencyTimeTrackerSuggestionOptionClass = cn(
  "flex w-full min-w-0 flex-col items-start gap-1.5 rounded-lg px-2.5 py-2.5 text-left",
  agencyFocusRingClass,
);

export const agencyTimeDayHeaderClass = cn(
  "flex shrink-0 items-center justify-between gap-3 border-b border-default bg-muted/45 px-4 py-3 text-sm",
);

export const agencyTimeWeekHeaderClass = "sr-only";

export const agencyTimeEntryRowClass = cn(
  "flex min-h-16 items-stretch border-b border-dotted border-border/40 bg-clip-padding transition-colors hover:bg-elevated/50 motion-reduce:transition-none",
);

/** Nested child row inside an expanded multi-entry group. */
export const agencyTimeEntryMultiChildClass = "border-b border-dotted border-border/40 pl-8";

/** Bottom rule for expanded multi-entry wrappers (matches row separators). */
export const agencyTimeEntryGroupBorderClass = "border-b border-dotted border-border/40";

/** Inline time inputs in entry rows. */
export const agencyTimeEntryTimeInputClass = cn(
  "h-7 w-full min-w-0 appearance-none border-0 bg-transparent px-0 font-mono text-xs font-medium tabular-nums text-muted shadow-none focus-visible:ring-0 focus-visible:text-highlighted",
  "[&::-webkit-calendar-picker-indicator]:hidden",
);

/** Left cluster — badge, description, task (free; not column-locked). */
export const agencyTimeEntryMainClass = "flex min-w-0 flex-1 items-center gap-3 px-4 py-3 sm:px-5";

/**
 * Right rail — time | duration | actions.
 * Inset vertical ticks (`inset-y-2`); day headers use the quiet rail (no hairlines).
 */
export const agencyTimeEntryRailClass = cn(
  "relative flex shrink-0 items-stretch",
  "before:pointer-events-none before:absolute before:inset-y-2 before:left-0 before:w-px before:bg-border/40",
  "[&>*+*]:relative [&>*+*]:before:pointer-events-none [&>*+*]:before:absolute [&>*+*]:before:inset-y-2 [&>*+*]:before:left-0 [&>*+*]:before:w-px [&>*+*]:before:bg-border/40",
);

/** Day-header rail — same cell widths, no vertical separators. */
export const agencyTimeEntryRailQuietClass = "flex shrink-0 items-stretch";

export const agencyTimeEntryRailCellClass = "box-content flex h-full shrink-0 items-center px-2.5";

/** Content-box width for locale ranges like "12:29 - 14:54" / "9:29 pm - 9:40 pm". */
export const agencyTimeEntryRailTimeClass = cn(
  agencyTimeEntryRailCellClass,
  "w-[15ch] whitespace-nowrap",
);

/** Content-box width for bold tabular "HH:MM:SS". */
export const agencyTimeEntryRailDurationClass = cn(
  agencyTimeEntryRailCellClass,
  "relative w-[9ch] whitespace-nowrap",
);

/** Two 32px icon targets; content-box so px does not steal width. */
export const agencyTimeEntryRailActionsClass = cn(
  "box-content flex h-full w-16 shrink-0 items-center justify-center gap-0.5 px-1",
);

/** Day band — same rail geometry as rows so totals lock to the duration column. */
export const agencyTimeEntrySectionHeaderClass = cn(
  "flex min-h-9 items-stretch border-b border-default bg-elevated/40",
);

export const agencyTimeEntrySectionLabelClass = cn(
  "flex min-w-0 flex-1 items-center px-4 sm:px-5",
  agencyWorkTitleClass,
);

/** One day block — solid surface so background gutters read as hard separation. */
export const agencyTimeEntryDayGroupClass = "border-b border-dotted border-border/40 bg-default";

/** Days own the scan rhythm — no visible week chrome. */
export const agencyTimeWeekGroupClass = "flex flex-col";

export const agencyTimeWeekGroupHeaderClass =
  "flex h-8 shrink-0 items-center justify-between gap-3 bg-transparent px-4 sm:px-5";

export const agencyTimeWeekGroupBodyClass = "flex flex-col gap-10 bg-background";

/** Stack of week sections — same gutter as days so week boundaries stay invisible. */
export const agencyTimeWeekStackClass = "flex min-h-full flex-col gap-10 bg-background";

export const agencyTimeEntryRowHighlightClass =
  "bg-success/10 motion-reduce:transition-none transition-colors duration-500";

export const agencyTimeEntryRowEditingClass = "bg-primary/5 hover:bg-primary/5";

export const agencyTimeSuggestionChipClass = cn(
  "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-default bg-elevated px-2 py-1",
  "text-xs font-medium text-muted transition-colors hover:bg-default hover:text-highlighted",
);

export const agencyTimeWeekFooterClass = cn(
  "flex h-10 shrink-0 items-center justify-between border-t border-default px-4 sm:px-5",
  "bg-elevated/40",
);

export const agencyTimeFooterMetricClass = agencyWorkMetricClass;

export const agencyTimeLogSkeletonClass =
  "h-[4.5rem] border-b border-default bg-elevated/35 motion-reduce:animate-none animate-pulse";

/** Structured agency task agent reply card. */
export const agencyAgentMessageCardClass =
  "rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-sm text-foreground";

export const agencyAgentMessageCodeClass =
  "mt-2 overflow-x-auto rounded-lg border border-border bg-background px-2.5 py-2 font-mono text-xs text-foreground";
