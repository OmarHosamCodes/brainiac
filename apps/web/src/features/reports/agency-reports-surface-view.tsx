import { AlertTriangle, BarChart2 } from "lucide-react";

import { AgencyReportsTable } from "@/features/reports/agency-reports-table";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyMetricClass,
} from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { AgencyReportsSurfaceViewModel } from "./hooks/use-agency-reports-surface";

export type AgencyReportsSurfaceViewProps = {
  vm: AgencyReportsSurfaceViewModel;
};

export function AgencyReportsSurfaceView({ vm }: AgencyReportsSurfaceViewProps) {
  if (vm.isPending) {
    return (
      <div className="space-y-2" aria-hidden="true">
        <div className="flex items-baseline justify-between px-1">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="overflow-hidden rounded-dense border border-default bg-default">
          <div className="border-b border-default bg-elevated/65 px-4 py-2.5">
            <Skeleton className="h-3 w-64" />
          </div>
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="border-b border-default px-4 py-3 last:border-b-0">
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (vm.isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-semibold text-highlighted">Couldn't load reports.</p>
        <p className="mt-1 text-xs text-muted">{vm.error}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={vm.refetch}>
          Retry
        </Button>
      </div>
    );
  }

  if (vm.entries.length === 0) {
    return (
      <div className={agencyEmptyPanelClass}>
        <BarChart2 className="mx-auto size-7 text-muted" />
        <p className="mt-4 text-sm font-semibold text-highlighted">
          No time tracked in this range.
        </p>
        <p className="mt-1 text-xs text-muted">
          Start a timer on Work, or widen the date range and clear filters to see entries.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="px-1 text-xs text-muted">
        Total in filtered range{" "}
        <span className={agencyMetricClass}>{formatDuration(vm.totalSeconds, "clock")}</span>
      </p>
      <AgencyReportsTable
        teamId={vm.teamId}
        entries={vm.entries}
        clientGroups={vm.clientGroups}
        visibleFields={vm.visibleFields}
        projects={vm.projects}
        tasks={vm.tasks}
        tasksLoading={vm.tasksLoading}
        updatingRowKeys={vm.updatingRowKeys}
        deletingEntryIds={vm.deletingEntryIds}
        wastePendingRowKeys={vm.wastePendingRowKeys}
        onTaskChange={vm.onTaskChange}
        onDescriptionChange={vm.onDescriptionChange}
        onEditDetails={vm.onEditDetails}
        onDeleteRow={vm.onDeleteRow}
        onToggleWaste={vm.onToggleWaste}
      />
    </div>
  );
}
