import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart2 } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { AgencyReportsTable } from "@/components/agency/agency-reports-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllReportEntries } from "@/lib/agency/reports/fetch-report-entries";
import type { AgencyTimeRangeFilters } from "@/lib/agency/use-agency-time-range-filters";
import { orpcClient } from "@/lib/orpc";
import { useAgencyProjectTasksForChooserQuery, useAgencyProjectsQuery } from "@/lib/queries/agency";
import type { AggregatedReportRow } from "@/lib/utils/agency-report-grouping";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyReportsSurfaceProps = {
  teamId: string;
  filters: AgencyTimeRangeFilters;
};

export function AgencyReportsSurface({ teamId, filters }: AgencyReportsSurfaceProps) {
  const queryClient = useQueryClient();
  const { range, projectId, memberUserId, clientId, fields } = filters;
  const [updatingRowKeys, setUpdatingRowKeys] = useState<Set<string>>(() => new Set());

  const appliedFilters = {
    clientId,
    projectId,
    memberUserId,
  };

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      range.from,
      range.to,
      clientId ?? "",
      projectId ?? "",
      memberUserId ?? "",
    ],
    queryFn: () => fetchAllReportEntries(teamId, range, appliedFilters),
    enabled: Boolean(teamId),
    placeholderData: keepPreviousData,
  });

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const tasksQuery = useAgencyProjectTasksForChooserQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.items ?? [];

  const taskChangeMutation = useMutation({
    mutationFn: async ({ row, taskId }: { row: AggregatedReportRow; taskId: string }) => {
      const task = tasks.find((item) => item.id === taskId);
      const project = task ? projects.find((item) => item.id === task.projectId) : null;
      if (!task || !project) {
        throw new Error("Task not found.");
      }

      await Promise.all(
        row.entries.map((entry) =>
          orpcClient.agencyOps.reports.updateEntry({
            teamId,
            entryId: entry.id,
            projectId: project.id,
            taskId: task.id,
          }),
        ),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "entries"] });
    },
    onError: (error) => {
      toast.error("Couldn't update task", {
        description: getErrorMessage(error, "Try again."),
      });
    },
  });

  const handleTaskChange = useCallback(
    async (row: AggregatedReportRow, taskId: string) => {
      if (!teamId || row.taskId === taskId) return;

      setUpdatingRowKeys((current) => new Set(current).add(row.key));
      try {
        await taskChangeMutation.mutateAsync({ row, taskId });
      } finally {
        setUpdatingRowKeys((current) => {
          const next = new Set(current);
          next.delete(row.key);
          return next;
        });
      }
    },
    [taskChangeMutation, teamId],
  );

  const entries = entriesQuery.data ?? [];

  return (
    <div className="agency-reports">
      {entriesQuery.isPending && !entriesQuery.isPlaceholderData ? (
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
      ) : entriesQuery.isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load reports.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(entriesQuery.error, "Try refreshing.")}
          </p>
          <Button
            variant="secondary"
            size="sm"
            className="mt-3"
            onClick={() => void entriesQuery.refetch()}
          >
            Retry
          </Button>
        </div>
      ) : entries.length === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No time logged in this range.</p>
          <p className="mt-1 text-xs text-muted">
            Track time on Work, then adjust filters if needed.
          </p>
        </div>
      ) : (
        <AgencyReportsTable
          entries={entries}
          visibleFields={fields}
          projects={projects}
          tasks={tasks}
          tasksLoading={tasksQuery.isLoading}
          updatingRowKeys={updatingRowKeys}
          onTaskChange={handleTaskChange}
        />
      )}
    </div>
  );
}
