import { Skeleton } from "@/ui/skeleton";
import {
  agencyTimeEntrySectionHeaderClass,
  agencyTimeLogPanelClass,
  agencyTimePaneBodyClass,
  agencyTimePaneStackClass,
  agencyTimeTrackerControlsCardClass,
  agencyTimeTrackerDescriptionCardClass,
  agencyTimeTrackerSplitClass,
  agencyTimeWeekFooterClass,
  agencyWorkTabBarClass,
  agencyWorkTabShellClass,
  agencyWorkTableBodyScrollClass,
  agencyWorkTableListClass,
  agencyWorkTableStackClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

function TrackerSkeleton() {
  return (
    <div className={agencyTimeTrackerSplitClass} aria-hidden>
      <div className={agencyTimeTrackerDescriptionCardClass}>
        <Skeleton className="h-3 w-16" />
        <Skeleton className="mt-2 h-5 w-3/4 max-w-xs" />
      </div>
      <div className={agencyTimeTrackerControlsCardClass}>
        <div className="flex w-full min-w-0 items-center gap-2">
          <Skeleton className="h-4 w-40 max-w-[45%]" />
          <Skeleton className="ml-auto h-6 w-24" />
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="size-9 shrink-0 rounded-full" />
        </div>
      </div>
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className={agencyWorkTabShellClass} aria-hidden>
      <div className={agencyWorkTabBarClass}>
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
          <Skeleton className="h-9 w-16 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <Skeleton className="h-9 w-32 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function SessionSectionSkeleton({ rows }: { rows: number }) {
  return (
    <section className={agencyWorkTableListClass} aria-hidden>
      <header className={agencyTimeEntrySectionHeaderClass}>
        <div className="flex min-w-0 items-center gap-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-5 w-6 rounded-full" />
        </div>
        <span className="hidden sm:block" aria-hidden />
        <Skeleton className="h-3.5 w-24 justify-self-end" />
        <span className="hidden sm:block" aria-hidden />
      </header>
      <ul className="flex min-w-0 flex-col">
        {Array.from({ length: rows }, (_, index) => (
          <li
            key={index}
            className="flex items-center gap-3 border-b border-default px-4 py-3 last:border-b-0"
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
    <div className={cn(agencyTimeLogPanelClass, "min-h-0 rounded-t-none border-t-0")} aria-hidden>
      <div className={agencyWorkTableBodyScrollClass}>
        <div className={agencyWorkTableStackClass}>
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
