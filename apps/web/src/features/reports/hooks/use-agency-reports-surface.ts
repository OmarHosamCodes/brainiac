import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import { fetchAllReportEntries } from "@/features/reports/fetch-report-entries";
import type { AgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { orpcClient } from "@/lib/orpc";
import {
  invalidateAgencyTeamQueries,
  useAgencyProjectTasksForChooserQuery,
  useAgencyProjectsQuery,
} from "@/features/shared/agency-queries";
import type { AggregatedReportRow } from "@/features/reports/agency-report-grouping";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";

export type UseAgencyReportsSurfaceProps = {
  teamId: string;
  filters: AgencyTimeRangeFilters;
};

export function useAgencyReportsSurface({ teamId, filters }: UseAgencyReportsSurfaceProps) {
  const queryClient = useQueryClient();
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const deletingEntryIds = useAgencyTimeTrackingStore((state) => state.deletingEntryIds);
  const { range, projectId, memberUserId, clientId, clientIds, projectIds, memberUserIds, fields } =
    filters;
  const [updatingRowKeys, setUpdatingRowKeys] = useState<Set<string>>(() => new Set());
  const [wastePendingRowKeys, setWastePendingRowKeys] = useState<Set<string>>(() => new Set());

  const appliedFilters = {
    clientId,
    projectId,
    memberUserId,
    clientIds,
    projectIds,
    memberUserIds,
  };

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      range.from,
      range.to,
      clientIds ?? clientId ?? "",
      projectIds ?? projectId ?? "",
      memberUserIds ?? memberUserId ?? "",
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

  const descriptionChangeMutation = useMutation({
    mutationFn: async ({ row, description }: { row: AggregatedReportRow; description: string }) => {
      await Promise.all(
        row.entries.map((entry) =>
          orpcClient.agencyOps.reports.updateEntry({
            teamId,
            entryId: entry.id,
            description,
          }),
        ),
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "entries"] });
    },
    onError: (error) => {
      toast.error("Couldn't update description", {
        description: getErrorMessage(error, "Try again."),
      });
    },
  });

  const handleDescriptionChange = useCallback(
    async (row: AggregatedReportRow, description: string) => {
      if (!teamId || row.description.trim() === description) return;

      setUpdatingRowKeys((current) => new Set(current).add(row.key));
      try {
        await descriptionChangeMutation.mutateAsync({ row, description });
      } finally {
        setUpdatingRowKeys((current) => {
          const next = new Set(current);
          next.delete(row.key);
          return next;
        });
      }
    },
    [descriptionChangeMutation, teamId],
  );

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

  const handleDeleteRow = useCallback(
    async (row: AggregatedReportRow) => {
      if (!teamId || row.entries.length === 0) return;

      await agencyTimeTrackingStore.deleteEntries({ teamId, entries: row.entries });
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "entries"] });
    },
    [agencyTimeTrackingStore, queryClient, teamId],
  );

  const handleToggleWaste = useCallback(
    async (row: AggregatedReportRow) => {
      if (!teamId || !row.taskId) return;

      const nextIsWaste = !(row.taskIsWaste === true);
      setWastePendingRowKeys((current) => new Set(current).add(row.key));
      try {
        await orpcClient.agencyOps.projectTasks.update({
          teamId,
          taskId: row.taskId,
          isWaste: nextIsWaste,
        });
        void queryClient.invalidateQueries({ queryKey: ["agency-reports", "entries"] });
        void invalidateAgencyTeamQueries(teamId);
        toast.success(nextIsWaste ? "Marked as waste" : "Unmarked as waste");
      } catch (error) {
        toast.error("Couldn't update task", {
          description: getErrorMessage(error, "Try again."),
        });
      } finally {
        setWastePendingRowKeys((current) => {
          const next = new Set(current);
          next.delete(row.key);
          return next;
        });
      }
    },
    [queryClient, teamId],
  );

  const entries = entriesQuery.data ?? [];
  const isPending = entriesQuery.isPending && !entriesQuery.isPlaceholderData;
  const isError = entriesQuery.isError;
  const error = entriesQuery.error;
  const refetch = () => {
    void entriesQuery.refetch();
  };

  return {
    entries,
    isPending,
    isError,
    error,
    refetch,
    projects,
    tasks,
    tasksLoading: tasksQuery.isLoading,
    updatingRowKeys,
    deletingEntryIds,
    wastePendingRowKeys,
    visibleFields: fields,
    onTaskChange: handleTaskChange,
    onDescriptionChange: handleDescriptionChange,
    onDeleteRow: handleDeleteRow,
    onToggleWaste: handleToggleWaste,
  };
}

export type AgencyReportsSurfaceViewModel = ReturnType<typeof useAgencyReportsSurface>;
