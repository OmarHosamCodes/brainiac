import { AlertTriangle } from "lucide-react";

import { AgencyTimeEntryRecencySectionView } from "@/components/agency/work/time-entries/agency-time-entry-recency-section-view";
import { AgencyWorkSurfacePaginationFooter } from "@/components/agency/work/work-surface/agency-work-surface-pagination-footer";
import { Button } from "@/components/ui/button";
import type { AgencyTimeEntriesLogViewModel } from "@/lib/agency/work/hooks/use-agency-time-entries-log";
import { agencyMetricClass, agencyTimeLogSkeletonClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeEntriesLogViewProps = {
  view: AgencyTimeEntriesLogViewModel;
};

export function AgencyTimeEntriesLogView({ view }: AgencyTimeEntriesLogViewProps) {
  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", view.className)}>
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

      <div
        ref={view.scrollContainerRef}
        className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain"
      >
        {view.isLoading ? (
          <div className="overflow-hidden">
            {[1, 2, 3, 4, 5].map((rowIndex) => (
              <div key={rowIndex} className={agencyTimeLogSkeletonClass} />
            ))}
          </div>
        ) : view.entriesEmpty ? (
          <div className="border-b border-dashed border-default bg-elevated/25 px-4 py-10 text-center">
            <p className="text-sm font-semibold text-highlighted">No time logged yet</p>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">
              Start the tracker, write a short description, and choose a task before stopping.
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
          <div className="flex min-w-0 flex-col">
            {view.recencySections.map((section) => (
              <AgencyTimeEntryRecencySectionView
                key={section.id}
                section={section}
                teamId={view.teamId}
                projects={view.projects}
                tasks={view.tasks}
                expandedGroupKeys={view.expandedGroupKeys}
                isTimerMutationPending={view.isTimerMutationPending}
                deletingEntryIds={view.deletingEntryIds}
                updatingEntryIds={view.updatingEntryIds}
                duplicatingEntryIds={view.duplicatingEntryIds}
                highlightedEntryId={view.highlightedEntryId}
                onToggleGroupExpand={view.onToggleGroupExpand}
                onRestart={view.onRestart}
                onDeleteGroup={view.onDeleteGroup}
                onDeleteEntry={view.onDeleteEntry}
                onDuplicate={view.onDuplicate}
                onSaveEdit={view.onSaveEdit}
                onToggleWaste={view.onToggleWaste}
                togglingWasteEntryIds={view.togglingWasteEntryIds}
              />
            ))}
          </div>
        )}
      </div>

      {view.showPagination ? (
        <AgencyWorkSurfacePaginationFooter
          rangeStart={view.rangeStart}
          rangeEnd={view.rangeEnd}
          total={view.totalEntries}
          previousDisabled={view.page <= 1}
          nextDisabled={view.page >= view.maxPage}
          onPrevious={view.onPreviousPage}
          onNext={view.onNextPage}
          pageSize={view.pageSize}
          pageSizeOptions={view.pageSizeOptions}
          onPageSizeChange={view.onPageSizeChange}
        />
      ) : null}
    </div>
  );
}
