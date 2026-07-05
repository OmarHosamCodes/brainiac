import { AlertTriangle, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";

import { AgencyTimeEntryWeekGroupView } from "@/components/agency/work/time-entries/agency-time-entry-week-group-view";
import { Button } from "@/components/ui/button";
import type { AgencyTimeEntriesLogViewModel } from "@/lib/agency/work/hooks/use-agency-time-entries-log";
import {
  agencyMetricClass,
  agencyTimeEntryScrollClass,
  agencyTimeLogSkeletonClass,
  agencyTimeWeekFooterClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntriesLogViewProps = {
  view: AgencyTimeEntriesLogViewModel;
};

export function AgencyTimeEntriesLogView({ view }: AgencyTimeEntriesLogViewProps) {
  return (
    <div className={["flex min-h-0 flex-1 flex-col", view.className].filter(Boolean).join(" ")}>
      {view.logQueryError ? (
        <div
          className="mx-4 mt-4 rounded-xl border border-error/30 bg-error/5 p-4 text-sm"
          role="alert"
        >
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-error" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-highlighted">Couldn't load entries</p>
              <p className="mt-1 text-muted">{view.logQueryError}</p>
              <Button variant="secondary" size="sm" className="mt-3" onClick={view.onRetry}>
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <div ref={view.scrollContainerRef} className="min-h-0 flex-1 overflow-auto">
        {view.isLoading ? (
          <div className="space-y-0">
            {[1, 2, 3, 4, 5].map((rowIndex) => (
              <div key={rowIndex} className={agencyTimeLogSkeletonClass} />
            ))}
          </div>
        ) : view.entriesEmpty ? (
          <div className="px-4 py-10 text-center">
            <p className="text-sm font-semibold text-highlighted">No time logged yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Press Start in the tracker above to begin tracking; add a description and task before
              you stop.
            </p>
            <ol className="mx-auto mt-4 max-w-xs space-y-2 text-left text-sm text-muted">
              <li className="flex gap-2">
                <span className={cn(agencyMetricClass, "text-xs")}>1.</span>
                <span>Press Start</span>
              </li>
              <li className="flex gap-2">
                <span className={cn(agencyMetricClass, "text-xs")}>2.</span>
                <span>Describe your work</span>
              </li>
              <li className="flex gap-2">
                <span className={cn(agencyMetricClass, "text-xs")}>3.</span>
                <span>Choose a task</span>
              </li>
            </ol>
            <Button
              variant="secondary"
              size="sm"
              className="mt-5"
              onClick={view.onRequestOpenTaskChooser}
            >
              Choose task
            </Button>
          </div>
        ) : (
          <div className={cn(agencyTimeEntryScrollClass, "flex flex-col gap-6")}>
            {view.weekGroups.map((week) => (
              <AgencyTimeEntryWeekGroupView
                key={week.weekStartKey}
                week={week}
                teamId={view.teamId}
                projects={view.projects}
                tasks={view.tasks}
                expandedGroupKeys={view.expandedGroupKeys}
                isTimerMutationPending={view.isTimerMutationPending}
                deletingEntryIds={view.deletingEntryIds}
                updatingEntryIds={view.updatingEntryIds}
                highlightedEntryId={view.highlightedEntryId}
                onToggleGroupExpand={view.onToggleGroupExpand}
                onRestart={view.onRestart}
                onDeleteGroup={view.onDeleteGroup}
                onDeleteEntry={view.onDeleteEntry}
                onSaveEdit={view.onSaveEdit}
                onToggleWaste={view.onToggleWaste}
                togglingWasteEntryIds={view.togglingWasteEntryIds}
              />
            ))}
          </div>
        )}
      </div>

      {view.showPagination ? (
        <div className={agencyTimeWeekFooterClass}>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={view.page <= 1}
              aria-label="Previous page"
              onClick={view.onPreviousPage}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <p className="font-mono text-xs tabular-nums text-muted">
              {view.rangeStart}-{view.rangeEnd} of {view.totalEntries}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              disabled={view.page >= view.maxPage}
              aria-label="Next page"
              onClick={view.onNextPage}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>

          <label className="flex items-center gap-2 text-xs text-muted">
            <span>Show</span>
            <span className="relative inline-flex items-center">
              <select
                value={view.pageSize}
                onChange={(e) => view.onPageSizeChange(Number(e.target.value))}
                className="appearance-none rounded-md border border-default bg-default py-1 pl-2 pr-6 font-mono text-xs tabular-nums leading-none text-highlighted"
                aria-label="Entries per page"
              >
                {view.pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <ChevronDown
                className="pointer-events-none absolute right-1.5 top-1/2 size-3 shrink-0 -translate-y-1/2 text-muted"
                aria-hidden
              />
            </span>
          </label>
        </div>
      ) : null}
    </div>
  );
}
