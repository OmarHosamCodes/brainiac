import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "@/lib/navigation";
import { toast } from "sonner";

import { computeReportHourMetrics } from "@/features/reports/agency-report-hour-metrics";
import { buildWasteOrchPrompt } from "@/features/reports/agency-report-orch-waste";
import { fetchAllReportEntries } from "@/features/reports/fetch-report-entries";
import type { AgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { orpcClient } from "@/lib/orpc";
import {
  invalidateAgencyDashboardQueries,
  invalidateAgencyEntriesQueries,
  invalidateAgencyReportsQueries,
  useAgencyClientsQuery,
  useAgencyProjectsQuery,
} from "@/features/shared/agency-queries";
import { useAgencyProjectTasksForChooserQuery } from "@/features/shared/agency-task-chooser-catalog";
import { allAgencyReportFieldIds } from "@/features/reports/agency-report-fields";
import { findProjectTaskInCache } from "@/features/shared/agency-query-cache";
import {
  applyReportEntriesWaste,
  groupEntriesForDisplay,
  type AggregatedReportRow,
  type AgencyReportEntry,
} from "@/features/reports/agency-report-grouping";
import { selectEntriesForDetailsRow } from "@/features/reports/hooks/use-agency-report-entry-details-dialog";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { formatDuration } from "@/lib/utils/format-duration";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";
import { useWorkspaceAgentStore } from "@/features/workspace-agent/stores/workspace-agent-store";

const SAVED_TICK_MS = 1200;

export type UseAgencyReportsSurfaceProps = {
  teamId: string;
  filters: AgencyTimeRangeFilters;
};

export function useAgencyReportsSurface({ teamId, filters }: UseAgencyReportsSurfaceProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const deletingEntryIds = useAgencyTimeTrackingStore((state) => state.deletingEntryIds);
  const { range, projectId, memberUserId, clientId, clientIds, projectIds, memberUserIds } =
    filters;
  const [updatingRowKeys, setUpdatingRowKeys] = useState<Set<string>>(() => new Set());
  const [savedRowKeys, setSavedRowKeys] = useState<Set<string>>(() => new Set());
  const [detailsRowKey, setDetailsRowKey] = useState<string | null>(null);
  const [detailsRowLabel, setDetailsRowLabel] = useState("");
  const savedTickTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    return () => {
      for (const timer of savedTickTimersRef.current.values()) {
        clearTimeout(timer);
      }
      savedTickTimersRef.current.clear();
    };
  }, []);

  const flashSavedRow = useCallback((rowKey: string) => {
    setSavedRowKeys((current) => new Set(current).add(rowKey));
    const existing = savedTickTimersRef.current.get(rowKey);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setSavedRowKeys((current) => {
        const next = new Set(current);
        next.delete(rowKey);
        return next;
      });
      savedTickTimersRef.current.delete(rowKey);
    }, SAVED_TICK_MS);
    savedTickTimersRef.current.set(rowKey, timer);
  }, []);
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
  const clientsQuery = useAgencyClientsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.items ?? [];
  const clients = clientsQuery.data?.items ?? [];

  const taskChangeMutation = useMutation({
    mutationFn: async ({ row, taskId }: { row: AggregatedReportRow; taskId: string }) => {
      const task =
        tasks.find((item) => item.id === taskId) ?? findProjectTaskInCache(teamId, taskId);
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
      if (row.entryCount > 1 && !window.confirm(`Update ${row.entryCount} time entries?`)) {
        return;
      }

      setUpdatingRowKeys((current) => new Set(current).add(row.key));
      try {
        await descriptionChangeMutation.mutateAsync({ row, description });
        flashSavedRow(row.key);
      } finally {
        setUpdatingRowKeys((current) => {
          const next = new Set(current);
          next.delete(row.key);
          return next;
        });
      }
    },
    [descriptionChangeMutation, flashSavedRow, teamId],
  );

  const handleTaskChange = useCallback(
    async (row: AggregatedReportRow, taskId: string) => {
      if (!teamId || row.taskId === taskId) return;
      if (row.entryCount > 1 && !window.confirm(`Update ${row.entryCount} time entries?`)) {
        return;
      }

      setUpdatingRowKeys((current) => new Set(current).add(row.key));
      try {
        await taskChangeMutation.mutateAsync({ row, taskId });
        flashSavedRow(row.key);
      } finally {
        setUpdatingRowKeys((current) => {
          const next = new Set(current);
          next.delete(row.key);
          return next;
        });
      }
    },
    [flashSavedRow, taskChangeMutation, teamId],
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
      if (!teamId || row.entries.length === 0) return;

      const nextIsWaste = !row.entries.every((entry) => entry.isWaste === true);
      const entryIds = nextIsWaste
        ? row.entries.map((entry) => entry.id)
        : row.entries.filter((entry) => entry.isWaste === true).map((entry) => entry.id);
      if (entryIds.length === 0) return;
      const snapshots = queryClient.getQueriesData<AgencyReportEntry[]>({
        queryKey: ["agency-reports", "entries", teamId],
      });
      for (const [queryKey, data] of snapshots) {
        if (!data) continue;
        queryClient.setQueryData(
          queryKey,
          applyReportEntriesWaste(data, new Set(entryIds), nextIsWaste),
        );
      }
      if (entryIds.length > 1) {
        toast.success(
          nextIsWaste
            ? `Marked ${entryIds.length} entries as waste`
            : `Unmarked ${entryIds.length} entries as waste`,
        );
      }
      try {
        await Promise.all(
          entryIds.map((entryId) =>
            orpcClient.agencyOps.reports.updateEntry({
              teamId,
              entryId,
              isWaste: nextIsWaste,
            }),
          ),
        );
        void Promise.all([
          invalidateAgencyEntriesQueries(teamId),
          invalidateAgencyReportsQueries(teamId),
          invalidateAgencyDashboardQueries(teamId),
        ]);
        flashSavedRow(row.key);
      } catch (error) {
        for (const [queryKey, data] of snapshots) {
          queryClient.setQueryData(queryKey, data);
        }
        toast.error("Couldn't update entry", {
          description: getErrorMessage(error, "Try again."),
        });
      }
    },
    [flashSavedRow, queryClient, teamId],
  );

  const handleAskOrchWaste = useCallback((row: AggregatedReportRow) => {
    if (row.entryCount !== 1 || row.entries.length !== 1) return;
    const entry = row.entries[0];
    if (!entry) return;
    useWorkspaceAgentStore.getState().seedComposer({
      text: buildWasteOrchPrompt({
        entryId: entry.id,
        description: row.description || row.taskTitle || "",
        durationLabel: formatDuration(row.durationSeconds, "clock"),
      }),
      toolPreset: "agent",
    });
  }, []);

  const handleGoToTracker = useCallback(() => {
    navigate("/agency");
  }, [navigate]);
  const handleEditDetails = useCallback((row: AggregatedReportRow) => {
    if (row.entries.length === 0) return;
    setDetailsRowKey(row.key);
    setDetailsRowLabel(row.taskTitle || row.description || row.projectName);
  }, []);

  const handleDetailsOpenChange = useCallback((open: boolean) => {
    if (!open) {
      setDetailsRowKey(null);
      setDetailsRowLabel("");
    }
  }, []);

  // Reports surface always shows waste; Show waste filters apply only in create-report.
  const entries = useMemo(() => entriesQuery.data ?? [], [entriesQuery.data]);
  const clientGroups = useMemo(() => groupEntriesForDisplay(entries), [entries]);
  const detailsEntries = useMemo(
    () => selectEntriesForDetailsRow(entriesQuery.data ?? [], detailsRowKey),
    [detailsRowKey, entriesQuery.data],
  );
  const isPending = entriesQuery.isPending && !entriesQuery.isPlaceholderData;
  const isError = entriesQuery.isError;
  const error = getErrorMessage(entriesQuery.error, "Try refreshing.");
  const hourMetrics = useMemo(() => computeReportHourMetrics(entries, clients), [clients, entries]);
  const refetch = () => {
    void entriesQuery.refetch();
  };

  return {
    teamId,
    entries,
    clientGroups,
    isPending,
    isError,
    error,
    refetch,
    hourMetrics,
    clients,
    projects,
    tasks,
    tasksLoading: tasksQuery.isLoading,
    updatingRowKeys,
    savedRowKeys,
    deletingEntryIds,
    visibleFields: allAgencyReportFieldIds(),
    detailsOpen: detailsRowKey !== null,
    detailsEntries,
    detailsLabel: detailsRowLabel,
    onTaskChange: handleTaskChange,
    onDescriptionChange: handleDescriptionChange,
    onEditDetails: handleEditDetails,
    onDetailsOpenChange: handleDetailsOpenChange,
    onDeleteRow: handleDeleteRow,
    onToggleWaste: handleToggleWaste,
    onAskOrchWaste: handleAskOrchWaste,
    onGoToTracker: handleGoToTracker,
  };
}

export type AgencyReportsSurfaceViewModel = ReturnType<typeof useAgencyReportsSurface>;
