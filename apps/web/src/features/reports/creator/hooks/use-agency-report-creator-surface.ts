import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "@/lib/navigation";
import { toast } from "sonner";

import {
  allAgencyReportFieldIds,
  normalizeReportFieldIds,
  parseReportFieldsParam,
  serializeReportFieldsParam,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import { computeReportHourMetrics } from "@/features/reports/agency-report-hour-metrics";
import {
  areSameShowWaste,
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  parseShowWasteParam,
  serializeShowWasteParam,
  type AgencyReportShowWaste,
} from "@/features/reports/agency-report-show-waste";
import {
  AGENCY_REPORT_MERGE_TASKS_PARAM,
  parseMergeSameTaskNamesParam,
  serializeMergeSameTaskNamesParam,
} from "@/features/reports/agency-report-merge-tasks";
import { fetchAllReportEntries } from "@/features/reports/fetch-report-entries";
import { useAgencyReportAutosave } from "@/features/reports/use-agency-report-autosave";
import { useAgencyReportCreator } from "@/features/reports/use-agency-report-creator";
import { useAgencyReportLabelContext } from "@/features/reports/use-agency-report-label-context";
import { draftToIsoRange, type TimeEntryDraft } from "@/features/time-tracking/agency-time-entry";
import { orpcClient } from "@/lib/orpc";
import { resolveWasteTogglePatch } from "@/features/time-tracking/agency-entry-group-waste";
import {
  invalidateAgencyDashboardQueries,
  invalidateAgencyEntriesQueries,
  invalidateAgencyReportsQueries,
  useAgencyClientsQuery,
} from "@/features/shared/agency-queries";
import {
  exportAgencyReportXlsx,
  exportAgencyReportXlsxPerClient,
  type AgencyReportExportMode,
} from "@/features/reports/export-agency-report-xlsx";
import { getErrorMessage } from "@/lib/utils/get-error-message";

const PER_CLIENT_DOWNLOAD_STAGGER_MS = 150;

function downloadBlobFile(fileName: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function delay(ms: number) {
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export type UseAgencyReportCreatorSurfaceProps = {
  teamId: string;
};

export function useAgencyReportCreatorSurface({ teamId }: UseAgencyReportCreatorSurfaceProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const reportId = useParams<{ reportId?: string }>().reportId ?? "";

  const reportQuery = useQuery({
    queryKey: ["agency-reports", "saved", teamId, reportId],
    queryFn: () => orpcClient.agencyOps.reports.saved.get({ teamId, reportId }),
    enabled: Boolean(teamId && reportId),
  });

  const reportsListHref = useMemo(() => {
    const next = new URLSearchParams(searchParams);
    next.delete("section");
    next.delete("report");
    const query = next.toString();
    return query ? `/agency/reports?${query}` : "/agency/reports";
  }, [searchParams]);

  const report = reportQuery.data;

  const [exportPhase, setExportPhase] = useState<"idle" | "exporting" | "exported">("idle");
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [deletingReport, setDeletingReport] = useState(false);
  const [reportName, setReportName] = useState("");
  /** Autosave only sees committed titles — drafts while renaming must not flush mid-keystroke. */
  const [committedReportName, setCommittedReportName] = useState("");

  useEffect(() => {
    if (report?.name) {
      setReportName(report.name);
      setCommittedReportName(report.name);
    }
  }, [report?.id, report?.name]);

  const labelContext = useAgencyReportLabelContext(teamId);

  const visibleFields = useMemo<AgencyReportFieldId[]>(() => {
    const fromUrl = searchParams.get("fields");
    if (fromUrl) return parseReportFieldsParam(fromUrl);
    return report ? normalizeReportFieldIds(report.fieldIds) : allAgencyReportFieldIds();
  }, [report, searchParams]);

  const showWaste = useMemo(
    () => parseShowWasteParam(searchParams.get("showWaste")),
    [searchParams],
  );

  const mergeSameTaskNames = useMemo(
    () => parseMergeSameTaskNamesParam(searchParams.get(AGENCY_REPORT_MERGE_TASKS_PARAM)),
    [searchParams],
  );

  const replaceReportSearchParams = useCallback(
    (mutate: (next: URLSearchParams) => void) => {
      const next = new URLSearchParams(searchParams);
      mutate(next);
      next.delete("section");
      next.delete("report");
      setSearchParams(next, { replace: true });
    },
    [searchParams, setSearchParams],
  );

  const handleFieldIdsChange = useCallback(
    (fieldIds: AgencyReportFieldId[]) => {
      replaceReportSearchParams((next) => {
        const nextFields = fieldIds.length > 0 ? fieldIds : allAgencyReportFieldIds();
        next.set("fields", serializeReportFieldsParam(nextFields));
      });
    },
    [replaceReportSearchParams],
  );

  const handleShowWasteChange = useCallback(
    (nextShowWaste: AgencyReportShowWaste) => {
      replaceReportSearchParams((next) => {
        if (areSameShowWaste(nextShowWaste, DEFAULT_AGENCY_REPORT_SHOW_WASTE)) {
          next.delete("showWaste");
        } else {
          next.set("showWaste", serializeShowWasteParam(nextShowWaste));
        }
      });
    },
    [replaceReportSearchParams],
  );

  const handleMergeSameTaskNamesChange = useCallback(
    (nextMerge: boolean) => {
      replaceReportSearchParams((next) => {
        const mergeParam = serializeMergeSameTaskNamesParam(nextMerge);
        if (!mergeParam) {
          next.delete(AGENCY_REPORT_MERGE_TASKS_PARAM);
        } else {
          next.set(AGENCY_REPORT_MERGE_TASKS_PARAM, mergeParam);
        }
      });
    },
    [replaceReportSearchParams],
  );

  const filters = useMemo(() => {
    // Saved reports join multi-select ids into singular fields; split for listEntries.
    const clientIds = (report?.clientId ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const projectIds = (report?.projectId ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    const memberUserIds = (report?.memberUserId ?? "")
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean);
    return {
      clientId: clientIds.length === 1 ? clientIds[0] : undefined,
      projectId: projectIds.length === 1 ? projectIds[0] : undefined,
      memberUserId: memberUserIds.length === 1 ? memberUserIds[0] : undefined,
      clientIds: clientIds.length > 1 ? clientIds : undefined,
      projectIds: projectIds.length > 1 ? projectIds : undefined,
      memberUserIds: memberUserIds.length > 1 ? memberUserIds : undefined,
    };
  }, [report?.clientId, report?.memberUserId, report?.projectId]);

  const range = useMemo(
    () => ({ from: report?.rangeFrom, to: report?.rangeTo }),
    [report?.rangeFrom, report?.rangeTo],
  );
  const rangeReady = Boolean(range.from && range.to);

  const resolvedRange = {
    from: range.from ?? "",
    to: range.to ?? "",
  };

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      resolvedRange.from,
      resolvedRange.to,
      filters.clientId,
      filters.projectId,
      filters.memberUserId,
      filters.clientIds,
      filters.projectIds,
      filters.memberUserIds,
    ],
    queryFn: () => fetchAllReportEntries(teamId, resolvedRange, filters),
    enabled: Boolean(teamId && rangeReady && report),
  });

  const entries = entriesQuery.data ?? [];
  const clientsQuery = useAgencyClientsQuery(teamId);
  const creator = useAgencyReportCreator(entries, {
    initialExcludedEntryIds: report?.excludedEntryIds,
    showWaste,
  });

  const autosave = useAgencyReportAutosave({
    teamId,
    reportId,
    name: committedReportName,
    excludedEntryIds: creator.excludedEntryIds,
    enabled: Boolean(committedReportName && report),
    initialBaseline: report
      ? {
          name: report.name,
          excludedEntryIds: report.excludedEntryIds,
        }
      : undefined,
    onSaved: () => {
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "saved", teamId] });
    },
  });

  const saveEditMutation = useMutation({
    mutationFn: async ({ entryId, draft }: { entryId: string; draft: TimeEntryDraft }) => {
      const rangeResult = draftToIsoRange(draft);
      if ("error" in rangeResult) {
        throw new Error(rangeResult.error);
      }
      return orpcClient.agencyOps.reports.updateEntry({
        teamId,
        entryId,
        description: draft.description,
        startAt: rangeResult.startAt,
        endAt: rangeResult.endAt,
      });
    },
    onSuccess: (updated, variables) => {
      creator.applyEntryOverride(variables.entryId, updated);
      autosave.queueActivity({ action: "entry_edited", payload: { entryId: variables.entryId } });
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "entries"] });
    },
    onError: (error) => {
      toast.error("Couldn't save entry", {
        description: getErrorMessage(error, "Try again."),
      });
    },
  });

  const handleSaveEdit = useCallback(
    async (entryId: string, draft: TimeEntryDraft) => {
      setSavingEntryId(entryId);
      try {
        await saveEditMutation.mutateAsync({ entryId, draft });
      } finally {
        setSavingEntryId(null);
      }
    },
    [saveEditMutation],
  );

  const handleToggleWaste = useCallback(
    async (entryIds?: string[]) => {
      const ids =
        entryIds && entryIds.length > 0
          ? entryIds
          : creator.selectedEntry
            ? [creator.selectedEntry.id]
            : [];
      const entries = ids
        .map((id) => creator.visibleEntries.find((item) => item.id === id))
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
      if (entries.length === 0 || !teamId) return;

      const patch = resolveWasteTogglePatch(entries);
      if (!patch) return;
      const { entryIds: idsToPatch, nextIsWaste } = patch;
      const patchEntries = entries.filter((entry) => idsToPatch.includes(entry.id));
      for (const entry of patchEntries) {
        creator.setTaskWaste(entry.id, entry.taskId ?? "", nextIsWaste);
      }
      if (idsToPatch.length > 1) {
        toast.success(
          nextIsWaste
            ? `Marked ${idsToPatch.length} entries as waste`
            : `Unmarked ${idsToPatch.length} entries as waste`,
        );
      }
      try {
        await Promise.all(
          idsToPatch.map((entryId) =>
            orpcClient.agencyOps.reports.updateEntry({
              teamId,
              entryId,
              isWaste: nextIsWaste,
            }),
          ),
        );
        autosave.queueActivity({ action: "waste_toggled", payload: { isWaste: nextIsWaste } });
        void Promise.all([
          invalidateAgencyEntriesQueries(teamId),
          invalidateAgencyReportsQueries(teamId),
          invalidateAgencyDashboardQueries(teamId),
        ]);
      } catch (error) {
        for (const entry of patchEntries) {
          creator.setTaskWaste(entry.id, entry.taskId ?? "", !nextIsWaste);
        }
        toast.error("Couldn't update entry", {
          description: getErrorMessage(error, "Try again."),
        });
      }
    },
    [autosave, creator, queryClient, teamId],
  );

  const handleExcludeEntry = useCallback(
    (entryId: string) => {
      const excludedId = creator.excludeEntry(entryId);
      if (excludedId) {
        autosave.queueActivity({ action: "entries_excluded", payload: { count: 1 } });
      }
    },
    [autosave, creator],
  );

  const handleExcludeSelected = useCallback(() => {
    if (!creator.selectedEntryId) return;
    handleExcludeEntry(creator.selectedEntryId);
  }, [creator.selectedEntryId, handleExcludeEntry]);

  const handleUndoExclude = useCallback(() => {
    const restoredId = creator.undoLastExclude();
    if (restoredId) {
      autosave.queueActivity({ action: "entries_restored", payload: { count: 1 } });
      toast.success("Restored removed entry");
    }
  }, [autosave, creator]);

  useEffect(() => {
    if (!report) return;

    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        if (event.key === "Escape" && creator.editingEntryId) {
          event.preventDefault();
          creator.cancelEditing();
        }
        return;
      }

      if (event.key === "Escape") {
        creator.clearSelection();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "z") {
        if (creator.canUndo) {
          event.preventDefault();
          handleUndoExclude();
        }
        return;
      }

      if (!creator.selectedEntryId) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        handleExcludeSelected();
        return;
      }

      if (event.key === "e" || event.key === "E") {
        event.preventDefault();
        creator.startEditing(creator.selectedEntryId);
        return;
      }

      if (event.key === "w" || event.key === "W") {
        if (!creator.selectedEntry?.taskId) return;
        event.preventDefault();
        void handleToggleWaste([creator.selectedEntryId]);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [creator, handleExcludeSelected, handleToggleWaste, handleUndoExclude, report]);

  async function handleExport(mode: AgencyReportExportMode = "combined") {
    if (!teamId || exportPhase === "exporting" || !report) return;
    setExportPhase("exporting");
    try {
      const input = {
        teamId,
        reportName: reportName || report.name,
        entries,
        excludedEntryIds: creator.excludedEntryIds,
        entryOverrides: creator.entryOverrides,
        visibleFields,
        showWaste,
        mergeSameTaskNames,
      };
      const files =
        mode === "per-client"
          ? await exportAgencyReportXlsxPerClient(input)
          : [await exportAgencyReportXlsx(input)];

      if (files.length === 0) {
        toast.error("Nothing to export", {
          description: "No clients left after the current filters.",
        });
        setExportPhase("idle");
        return;
      }

      for (const [index, file] of files.entries()) {
        downloadBlobFile(file.fileName, file.blob);
        if (index < files.length - 1) {
          await delay(PER_CLIENT_DOWNLOAD_STAGGER_MS);
        }
      }

      autosave.queueActivity({ action: "exported" });
      setExportPhase("exported");
      window.setTimeout(() => {
        setExportPhase((current) => (current === "exported" ? "idle" : current));
      }, 1600);
    } catch (error) {
      setExportPhase("idle");
      toast.error("Couldn't export", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  function handleRenameCommitted(trimmed: string) {
    setCommittedReportName(trimmed);
    if (report && trimmed !== report.name) {
      autosave.queueActivity({ action: "renamed", payload: { name: trimmed } });
    }
  }

  const handleDeleteReport = useCallback(async () => {
    if (!teamId || !reportId || deletingReport) return;
    if (autosave.state === "pending" || autosave.state === "saving") {
      toast.error("Still saving", {
        description: "Try again in a moment.",
      });
      return;
    }

    setDeletingReport(true);
    try {
      await orpcClient.agencyOps.reports.saved.delete({ teamId, reportId });
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "saved", teamId] });
      toast.success("Report deleted");
      navigate(reportsListHref);
    } catch (error) {
      toast.error("Couldn't delete report", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setDeletingReport(false);
    }
  }, [autosave.state, deletingReport, navigate, queryClient, reportId, reportsListHref, teamId]);

  const hourMetrics = useMemo(
    () => computeReportHourMetrics(creator.visibleEntries, clientsQuery.data?.items ?? []),
    [clientsQuery.data?.items, creator.visibleEntries],
  );

  const isPending = reportQuery.isPending;
  const isError = reportQuery.isError;
  const errorMessage = getErrorMessage(reportQuery.error, "Try going back to Reports.");
  const entriesQueryErrorMessage = getErrorMessage(entriesQuery.error, "Try refreshing.");
  const refetch = () => {
    void reportQuery.refetch();
  };
  const onBackToReports = useCallback(() => {
    navigate(reportsListHref);
  }, [navigate, reportsListHref]);

  return {
    reportId,
    report,
    isPending,
    isError,
    errorMessage,
    refetch,
    onBackToReports,
    exportPhase,
    savingEntryId,
    deletingReport,
    reportName,
    setReportName,
    labelContext,
    visibleFields,
    showWaste,
    mergeSameTaskNames,
    hourMetrics,
    clients: clientsQuery.data?.items ?? [],
    onFieldIdsChange: handleFieldIdsChange,
    onShowWasteChange: handleShowWasteChange,
    onMergeSameTaskNamesChange: handleMergeSameTaskNamesChange,
    rangeReady,
    entriesQueryPending: entriesQuery.isPending,
    entriesQueryError: entriesQuery.isError,
    entriesQueryErrorMessage,
    refetchEntries: () => {
      void entriesQuery.refetch();
    },
    creator,
    autosave,
    handleSaveEdit,
    handleToggleWaste,
    handleExcludeEntry,
    handleUndoExclude,
    handleExport,
    handleRenameCommitted,
    handleDeleteReport,
  };
}

export type AgencyReportCreatorSurfaceViewModel = ReturnType<typeof useAgencyReportCreatorSurface>;
