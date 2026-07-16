import { AlertTriangle, BarChart2 } from "lucide-react";

import { AgencyReportsTable } from "@/features/reports/agency-reports-table";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import type { AgencyReportsSurfaceViewModel } from "./hooks/use-agency-reports-surface";

export type AgencyReportsSurfaceViewProps = {
  vm: AgencyReportsSurfaceViewModel;
};

export function AgencyReportsSurfaceView({ vm }: AgencyReportsSurfaceViewProps) {
  return (
    <div className="agency-reports">
      {vm.isPending ? (
        <div className="overflow-hidden rounded-2xl border border-default bg-default">
          <div className="border-b border-default bg-muted/55 px-4 py-2.5">
            <Skeleton className="h-3 w-64" />
          </div>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="border-b border-default px-4 py-3">
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
      ) : vm.isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load reports.</p>
          <p className="mt-1 text-xs text-muted">{vm.error}</p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={vm.refetch}>
            Retry
          </Button>
        </div>
      ) : vm.entries.length === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No time logged in this range.</p>
          <p className="mt-1 text-xs text-muted">
            Track time on Work, then adjust filters if needed.
          </p>
        </div>
      ) : (
        <AgencyReportsTable
          teamId={vm.teamId}
          entries={vm.entries}
          visibleFields={vm.visibleFields}
          projects={vm.projects}
          tasks={vm.tasks}
          tasksLoading={vm.tasksLoading}
          updatingRowKeys={vm.updatingRowKeys}
          deletingEntryIds={vm.deletingEntryIds}
          wastePendingRowKeys={vm.wastePendingRowKeys}
          onTaskChange={vm.onTaskChange}
          onDescriptionChange={vm.onDescriptionChange}
          onDeleteRow={vm.onDeleteRow}
          onToggleWaste={vm.onToggleWaste}
        />
      )}
    </div>
  );
}
