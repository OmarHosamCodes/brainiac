import { Skeleton } from "@/ui/skeleton";
import {
  agencyTimeEntryRailActionsClass,
  agencyTimeEntryRailDurationClass,
  agencyTimeEntryRailQuietClass,
  agencyTimeEntryRailTimeClass,
  agencyTimeEntrySectionHeaderClass,
  agencyTimeEntrySectionLabelClass,
  agencyTimeLogPanelClass,
  agencyTimePaneBodyClass,
  agencyTimePaneStackClass,
  agencyTimeTrackerActionsZoneClass,
  agencyTimeTrackerCardClass,
  agencyTimeTrackerDescriptionZoneClass,
  agencyTimeTrackerStatusDividerClass,
  agencyTimeTrackerStatusZoneClass,
  agencyTimeWeekFooterClass,
  agencyTimeWeekGroupBodyClass,
  agencyWorkTabBarClass,
  agencyWorkTabShellClass,
  agencyWorkTableBodyScrollClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

function TrackerSkeleton() {
  return (
    <div className={agencyTimeTrackerCardClass} aria-hidden>
      <div className={agencyTimeTrackerDescriptionZoneClass}>
        <Skeleton className="h-5 w-3/4 max-w-xs" />
      </div>
      <div className={agencyTimeTrackerStatusDividerClass} />
      <div className={agencyTimeTrackerStatusZoneClass}>
        <Skeleton className="h-4 w-full" />
      </div>
      <div className={agencyTimeTrackerStatusDividerClass} />
      <div className={agencyTimeTrackerActionsZoneClass}>
        <Skeleton className="h-6 w-[5rem]" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className={agencyWorkTabShellClass} aria-hidden>
      <div className={agencyWorkTabBarClass}>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-12" />
          <Skeleton className="h-4 w-16" />
        </div>
        <Skeleton className="h-8 w-24 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function SessionSectionSkeleton({ rows }: { rows: number }) {
  return (
    <section aria-hidden>
      <header className={agencyTimeEntrySectionHeaderClass}>
        <div className={agencyTimeEntrySectionLabelClass}>
          <Skeleton className="h-3.5 w-14" />
        </div>
        <div className={agencyTimeEntryRailQuietClass}>
          <div className={agencyTimeEntryRailTimeClass} aria-hidden />
          <div className={agencyTimeEntryRailDurationClass}>
            <Skeleton className="h-3.5 w-14" />
          </div>
          <div className={agencyTimeEntryRailActionsClass} aria-hidden />
        </div>
      </header>
      <ul className="flex min-w-0 flex-col">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className="flex items-center gap-3 border-b border-dotted border-border/40 px-5 py-3.5 last:border-b-0"
          >
            <Skeleton className="size-6 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
            <Skeleton className="hidden h-4 w-28 sm:block" />
            <Skeleton className="hidden h-4 w-16 sm:block" />
            <div className="flex shrink-0 items-center gap-1.5">
              <Skeleton className="size-8 rounded-full" />
              <Skeleton className="size-8 rounded-full" />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SessionsLogSkeleton() {
  return (
    <div className={cn(agencyTimeLogPanelClass, "min-h-0")} aria-hidden>
      <div className={agencyWorkTableBodyScrollClass}>
        <div className={agencyTimeWeekGroupBodyClass}>
          <SessionSectionSkeleton rows={2} />
          <SessionSectionSkeleton rows={2} />
          <SessionSectionSkeleton rows={1} />
        </div>
      </div>
      <div className={agencyTimeWeekFooterClass}>
        <div className="flex items-center gap-2">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="h-3 w-24" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <Skeleton className="h-7 w-20 rounded-md" />
      </div>
    </div>
  );
}

export function AgencyWorkSurfaceLoadingView() {
  return (
    <div className={agencyTimePaneStackClass} aria-busy="true" aria-label="Loading work data">
      <TrackerSkeleton />
      <div className={agencyTimePaneBodyClass}>
        <TabsSkeleton />
        <SessionsLogSkeleton />
      </div>
    </div>
  );
}
