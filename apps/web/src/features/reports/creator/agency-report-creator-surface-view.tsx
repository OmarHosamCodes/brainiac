import { AlertTriangle, BarChart2 } from "lucide-react";
import type { ReactNode } from "react";

import {
  AgencyReportCreatorHeader,
  AgencyReportCreatorHeaderSkeleton,
} from "@/features/reports/creator/agency-report-creator-header";
import { AgencyReportCreatorTable } from "@/features/reports/creator/agency-report-creator-table";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import type { AgencyReportCreatorSurfaceViewModel } from "./hooks/use-agency-report-creator-surface";

export type AgencyReportCreatorSurfaceViewProps = {
  vm: AgencyReportCreatorSurfaceViewModel;
  activityMenu: ReactNode;
};

export function AgencyReportCreatorSurfaceView({
  vm,
  activityMenu,
}: AgencyReportCreatorSurfaceViewProps) {
  if (!vm.reportId) {
    return (
      <div className={agencyEmptyPanelClass}>
        <BarChart2 className="mx-auto size-7 text-muted" />
        <p className="mt-4 text-sm font-semibold text-highlighted">No report selected.</p>
        <p className="mt-1 text-xs text-muted">Go back to Reports and create or open a report.</p>
      </div>
    );
  }

  if (vm.isPending) {
    return (
      <div className="agency-report-creator space-y-4">
        <AgencyReportCreatorHeaderSkeleton />
        <Skeleton className="h-64 w-full rounded-dense" />
      </div>
    );
  }

  if (vm.isError || !vm.report) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-semibold text-highlighted">Couldn't load report.</p>
        <p className="mt-1 text-xs text-muted">{vm.errorMessage}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={vm.onBackToReports}>
          Back to Reports
        </Button>
      </div>
    );
  }

  return (
    <div className="agency-report-creator space-y-4">
      <AgencyReportCreatorHeader
        onBack={vm.onBackToReports}
        reportName={vm.reportName}
        fallbackName={vm.report.name}
        onReportNameChange={vm.setReportName}
        onRenameCommitted={vm.handleRenameCommitted}
        report={{
          rangeFrom: vm.report.rangeFrom,
          rangeTo: vm.report.rangeTo,
          clientId: vm.report.clientId,
          projectId: vm.report.projectId,
          memberUserId: vm.report.memberUserId,
          createdByUserName: vm.report.createdByUserName,
        }}
        labelContext={vm.labelContext}
        visibleEntryCount={vm.creator.visibleEntries.length}
        canUndo={vm.creator.canUndo}
        onUndo={vm.handleUndoExclude}
        autosaveState={vm.autosave.state}
        lastSavedAt={vm.autosave.lastSavedAt}
        onRetrySave={vm.autosave.retry}
        exportPhase={vm.exportPhase}
        onExport={(mode) => void vm.handleExport(mode)}
        activityMenu={activityMenu}
        deletingReport={vm.deletingReport}
        onDeleteReport={() => void vm.handleDeleteReport()}
      />

      {!vm.rangeReady ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-semibold text-highlighted">Missing date range.</p>
          <p className="mt-1 text-xs text-muted">This report has an invalid date range.</p>
        </div>
      ) : vm.entriesQueryPending ? (
        <div className="overflow-hidden rounded-dense border border-default bg-default">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="border-b border-default px-4 py-3">
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
      ) : vm.entriesQueryError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-semibold text-highlighted">
            Couldn't load report entries.
          </p>
          <p className="mt-1 text-xs text-muted">{vm.entriesQueryErrorMessage}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={vm.refetchEntries}>
            Retry
          </Button>
        </div>
      ) : vm.creator.visibleEntries.length === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-semibold text-highlighted">No entries in this report.</p>
          <p className="mt-1 text-xs text-muted">
            All rows were removed or nothing matched the filters.
          </p>
        </div>
      ) : (
        <AgencyReportCreatorTable
          creator={vm.creator}
          visibleFields={vm.visibleFields}
          mergeSameTaskNames={vm.mergeSameTaskNames}
          onSaveEdit={vm.handleSaveEdit}
          onExcludeEntry={vm.handleExcludeEntry}
          onToggleWaste={(entryId) => void vm.handleToggleWaste(entryId)}
          savingEntryId={vm.savingEntryId}
          wastePending={vm.wastePending}
        />
      )}
    </div>
  );
}
