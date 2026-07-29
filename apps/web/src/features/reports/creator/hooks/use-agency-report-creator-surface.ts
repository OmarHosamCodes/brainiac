import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  normalizeReportFieldIds,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import { formatReportHeaderMeta } from "@/features/reports/agency-report-naming";
import { parseShowWasteParam } from "@/features/reports/agency-report-show-waste";
import {
  AGENCY_REPORT_MERGE_TASKS_PARAM,
  parseMergeSameTaskNamesParam,
} from "@/features/reports/agency-report-merge-tasks";
import { fetchAllReportEntries } from "@/features/reports/fetch-report-entries";
import { useAgencyReportAutosave } from "@/features/reports/use-agency-report-autosave";
import { useAgencyReportCreator } from "@/features/reports/use-agency-report-creator";
import { useAgencyReportLabelContext } from "@/features/reports/use-agency-report-label-context";
import { draftToIsoRange, type TimeEntryDraft } from "@/features/time-tracking/agency-time-entry";
import { orpcClient } from "@/lib/orpc";
import { invalidateAgencyTeamQueries } from "@/features/shared/agency-queries";
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
  const [searchParams] = useSearchParams();
  const reportId = searchParams.get("report") ?? "";

  const reportQuery = useQuery({
    queryKey: ["agency-reports", "saved", teamId, reportId],
    queryFn: () => orpcClient.agencyOps.reports.saved.get({ teamId, reportId }),
    enabled: Boolean(teamId && reportId),
  });

  const backParams = useMemo(() => {
    const next = new URLSearchParams(searchParams);
    next.set("section", "reports");
    next.delete("report");
    return next.toString();
  }, [searchParams]);

  const report = reportQuery.data;

  const [exportPhase, setExportPhase] = useState<"idle" | "exporting" | "exported">("idle");
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [wastePending, setWastePending] = useState(false);
  const [deletingReport, setDeletingReport] = useState(false);
  const [reportName, setReportName] = useState("");

  useEffect(() => {
    if (report?.name) {
      setReportName(report.name);
    }
  }, [report?.id, report?.name]);

  const labelContext = useAgencyReportLabelContext(teamId);

  const visibleFields = useMemo<AgencyReportFieldId[]>(
    () => (report ? normalizeReportFieldIds(report.fieldIds) : []),
    [report?.fieldIds],
  );

  const showWaste = useMemo(
    () => parseShowWasteParam(searchParams.get("showWaste")),
    [searchParams],
  );

  const mergeSameTaskNames = useMemo(
    () => parseMergeSameTaskNamesParam(searchParams.get(AGENCY_REPORT_MERGE_TASKS_PARAM)),
    [searchParams],
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
  const creator = useAgencyReportCreator(entries, {
    initialExcludedEntryIds: report?.excludedEntryIds,
    showWaste,
  });

  const autosave = useAgencyReportAutosave({
    teamId,
    reportId,
    name: reportName,
    excludedEntryIds: creator.excludedEntryIds,
    enabled: Boolean(reportName && report),
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
    async (entryId?: string) => {
      const entry =
        (entryId ? creator.visibleEntries.find((item) => item.id === entryId) : null) ??
        creator.selectedEntry;
      if (!entry || !teamId) return;

      const nextIsWaste = !(entry.isWaste === true);
      setWastePending(true);
      try {
        await orpcClient.agencyOps.reports.updateEntry({
          teamId,
          entryId: entry.id,
          isWaste: nextIsWaste,
        });
        creator.setTaskWaste(entry.id, entry.taskId ?? "", nextIsWaste);
        autosave.queueActivity({ action: "waste_toggled", payload: { isWaste: nextIsWaste } });
        void queryClient.invalidateQueries({ queryKey: ["agency-reports", "entries"] });
        void invalidateAgencyTeamQueries(teamId);
      } catch (error) {
        toast.error("Couldn't update entry", {
          description: getErrorMessage(error, "Try again."),
        });
      } finally {
        setWastePending(false);
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
        void handleToggleWaste(creator.selectedEntryId);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [creator, handleExcludeSelected, handleToggleWaste, handleUndoExclude, report]);

  async function handleExport(mode: AgencyReportExportMode = "combined") {
    if (!teamId || exportPhase === "exporting" || !report) return;
    setExportPhase("exporting");
    try {
      const title = reportName || report.name;
      const meta = formatReportHeaderMeta(
        {
          rangeFrom: report.rangeFrom,
          rangeTo: report.rangeTo,
          clientId: report.clientId || undefined,
          projectId: report.projectId || undefined,
          memberUserId: report.memberUserId || undefined,
          createdByUserName: report.createdByUserName,
          visibleEntryCount: creator.visibleEntries.length,
        },
        labelContext,
      );
      const input = {
        teamId,
        reportName: title,
        entries,
        excludedEntryIds: creator.excludedEntryIds,
        entryOverrides: creator.entryOverrides,
        visibleFields,
        showWaste,
        mergeSameTaskNames,
        header: {
          title,
          scopeLine: meta.scopeLine,
          attributionLine: meta.attributionLine,
        },
      };
      const files =
        mode === "per-client"
          ? await exportAgencyReportXlsxPerClient(input)
          : [await exportAgencyReportXlsx(input)];

      if (files.length === 0) {
        toast.error("Nothing to export", {
          description: "No clients remain after the current filters.",
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
      toast.error("Export failed", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  function handleRenameCommitted(trimmed: string) {
    if (report && trimmed !== report.name) {
      autosave.queueActivity({ action: "renamed", payload: { name: trimmed } });
    }
  }

  const handleDeleteReport = useCallback(async () => {
    if (!teamId || !reportId || deletingReport) return;
    if (autosave.state === "pending" || autosave.state === "saving") {
      toast.error("Wait for save to finish", {
        description: "The report is still saving. Try again in a moment.",
      });
      return;
    }

    setDeletingReport(true);
    try {
      await orpcClient.agencyOps.reports.saved.delete({ teamId, reportId });
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "saved", teamId] });
      toast.success("Report deleted");
      navigate(`/agency?${backParams}`);
    } catch (error) {
      toast.error("Couldn't delete report", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setDeletingReport(false);
    }
  }, [autosave.state, backParams, deletingReport, navigate, queryClient, reportId, teamId]);

  const isPending = reportQuery.isPending;
  const isError = reportQuery.isError;
  const errorMessage = getErrorMessage(reportQuery.error, "Try going back to Reports.");
  const entriesQueryErrorMessage = getErrorMessage(entriesQuery.error, "Try refreshing.");
  const refetch = () => {
    void reportQuery.refetch();
  };
  const onBackToReports = useCallback(() => {
    navigate(`/agency?${backParams}`);
  }, [backParams, navigate]);

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
    wastePending,
    deletingReport,
    reportName,
    setReportName,
    labelContext,
    visibleFields,
    mergeSameTaskNames,
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
