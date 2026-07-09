import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, BarChart2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import {
  AgencyReportCreatorHeader,
  AgencyReportCreatorHeaderSkeleton,
} from "@/features/reports/creator/agency-report-creator-header";
import { AgencyReportCreatorTable } from "@/features/reports/creator/agency-report-creator-table";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import {
  normalizeReportFieldIds,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import { fetchAllReportEntries } from "@/features/reports/fetch-report-entries";
import { useAgencyReportAutosave } from "@/features/reports/use-agency-report-autosave";
import { useAgencyReportCreator } from "@/features/reports/use-agency-report-creator";
import { useAgencyReportLabelContext } from "@/features/reports/use-agency-report-label-context";
import { draftToIsoRange, type TimeEntryDraft } from "@/features/time-tracking/agency-time-entry";
import { orpcClient } from "@/lib/orpc";
import { invalidateAgencyTeamQueries } from "@/features/shared/agency-queries";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/features/shared/agency-ui";
import { exportAgencyReportXlsx } from "@/features/reports/export-agency-report-xlsx";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyReportCreatorSurfaceProps = {
  teamId: string;
};

export function AgencyReportCreatorSurface({ teamId }: AgencyReportCreatorSurfaceProps) {
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

  if (!reportId) {
    return (
      <div className={agencyEmptyPanelClass}>
        <BarChart2 className="mx-auto size-7 text-muted" />
        <p className="mt-4 text-sm font-bold text-highlighted">No report selected.</p>
        <p className="mt-1 text-xs text-muted">Go back to Reports and create or open a report.</p>
      </div>
    );
  }

  if (reportQuery.isPending) {
    return (
      <div className="agency-report-creator space-y-4">
        <AgencyReportCreatorHeaderSkeleton />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (reportQuery.isError || !reportQuery.data) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load report.</p>
        <p className="mt-1 text-xs text-muted">
          {getErrorMessage(reportQuery.error, "Try going back to Reports.")}
        </p>
        <Button variant="secondary" size="sm" className="mt-3" asChild>
          <Link to={`/agency?${backParams}`}>Back to Reports</Link>
        </Button>
      </div>
    );
  }

  return (
    <AgencyReportCreatorLoaded
      teamId={teamId}
      reportId={reportId}
      report={reportQuery.data}
      backParams={backParams}
    />
  );
}

type SavedReportRecord = NonNullable<
  Awaited<ReturnType<typeof orpcClient.agencyOps.reports.saved.get>>
>;

function AgencyReportCreatorLoaded({
  teamId,
  reportId,
  report,
  backParams,
}: {
  teamId: string;
  reportId: string;
  report: SavedReportRecord;
  backParams: string;
}) {
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [wastePending, setWastePending] = useState(false);
  const [reportName, setReportName] = useState(report.name);
  const labelContext = useAgencyReportLabelContext(teamId);

  const visibleFields = useMemo<AgencyReportFieldId[]>(
    () => normalizeReportFieldIds(report.fieldIds),
    [report.fieldIds],
  );

  const filters = useMemo(
    () => ({
      clientId: report.clientId || undefined,
      projectId: report.projectId || undefined,
      memberUserId: report.memberUserId || undefined,
    }),
    [report.clientId, report.memberUserId, report.projectId],
  );

  const range = useMemo(
    () => ({ from: report.rangeFrom, to: report.rangeTo }),
    [report.rangeFrom, report.rangeTo],
  );
  const rangeReady = Boolean(range.from && range.to);

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      range.from,
      range.to,
      filters.clientId,
      filters.projectId,
      filters.memberUserId,
    ],
    queryFn: () => fetchAllReportEntries(teamId, range, filters),
    enabled: Boolean(teamId && rangeReady),
  });

  const entries = entriesQuery.data ?? [];
  const creator = useAgencyReportCreator(entries, {
    initialExcludedEntryIds: report.excludedEntryIds,
  });

  const autosave = useAgencyReportAutosave({
    teamId,
    reportId,
    name: reportName,
    excludedEntryIds: creator.excludedEntryIds,
    enabled: Boolean(reportName),
    initialBaseline: {
      name: report.name,
      excludedEntryIds: report.excludedEntryIds,
    },
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
      toast.success("Entry updated");
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

  const handleToggleWaste = useCallback(async () => {
    const entry = creator.selectedEntry;
    if (!entry?.taskId || !teamId) return;

    const nextIsWaste = !(entry.taskIsWaste === true);
    setWastePending(true);
    try {
      await orpcClient.agencyOps.projectTasks.update({
        teamId,
        taskId: entry.taskId,
        isWaste: nextIsWaste,
      });
      creator.setTaskWaste(entry.id, entry.taskId, nextIsWaste);
      autosave.queueActivity({ action: "waste_toggled", payload: { isWaste: nextIsWaste } });
      void queryClient.invalidateQueries({ queryKey: ["agency-reports", "entries"] });
      void invalidateAgencyTeamQueries(teamId);
      toast.success(nextIsWaste ? "Marked as waste" : "Unmarked as waste");
    } catch (error) {
      toast.error("Couldn't update task", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setWastePending(false);
    }
  }, [autosave, creator, queryClient, teamId]);

  const handleExcludeSelected = useCallback(() => {
    const excludedId = creator.excludeSelectedEntry();
    if (excludedId) {
      autosave.queueActivity({ action: "entries_excluded", payload: { count: 1 } });
    }
  }, [autosave, creator]);

  const handleUndoExclude = useCallback(() => {
    const restoredId = creator.undoLastExclude();
    if (restoredId) {
      autosave.queueActivity({ action: "entries_restored", payload: { count: 1 } });
      toast.success("Restored removed entry");
    }
  }, [autosave, creator]);

  useEffect(() => {
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
        creator.startEditingSelected();
        return;
      }

      if (event.key === "w" || event.key === "W") {
        if (!creator.selectedEntry?.taskId) return;
        event.preventDefault();
        void handleToggleWaste();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [creator, handleExcludeSelected, handleToggleWaste, handleUndoExclude]);

  async function handleExport() {
    if (!teamId || exporting || !report) return;
    setExporting(true);
    try {
      const { fileName, blob } = await exportAgencyReportXlsx({
        teamId,
        reportName: reportName || report.name,
        entries,
        excludedEntryIds: creator.excludedEntryIds,
        entryOverrides: creator.entryOverrides,
        visibleFields,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      autosave.queueActivity({ action: "exported" });
      toast.success(`${reportName || report.name} exported`);
    } catch (error) {
      toast.error("Export failed", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setExporting(false);
    }
  }

  function handleRenameCommitted(trimmed: string) {
    if (trimmed !== report.name) {
      autosave.queueActivity({ action: "renamed", payload: { name: trimmed } });
    }
  }

  return (
    <div className="agency-report-creator space-y-4">
      <AgencyReportCreatorHeader
        backHref={`/agency?${backParams}`}
        reportName={reportName}
        fallbackName={report.name}
        onReportNameChange={setReportName}
        onRenameCommitted={handleRenameCommitted}
        report={{
          rangeFrom: report.rangeFrom,
          rangeTo: report.rangeTo,
          clientId: report.clientId,
          projectId: report.projectId,
          memberUserId: report.memberUserId,
          createdByUserName: report.createdByUserName,
        }}
        labelContext={labelContext}
        visibleEntryCount={creator.visibleEntries.length}
        canUndo={creator.canUndo}
        onUndo={handleUndoExclude}
        autosaveState={autosave.state}
        lastSavedAt={autosave.lastSavedAt}
        onRetrySave={autosave.retry}
        exporting={exporting}
        onExport={() => void handleExport()}
        teamId={teamId}
        reportId={reportId}
      />

      {!rangeReady ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">Missing date range.</p>
          <p className="mt-1 text-xs text-muted">This report has an invalid date range.</p>
        </div>
      ) : entriesQuery.isPending ? (
        <div className="overflow-hidden rounded-2xl border border-default bg-default">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="border-b border-default px-4 py-3">
              <Skeleton className="h-4 w-full max-w-md" />
            </div>
          ))}
        </div>
      ) : entriesQuery.isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load report entries.</p>
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
      ) : creator.visibleEntries.length === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No entries in this report.</p>
          <p className="mt-1 text-xs text-muted">
            All rows were removed or nothing matched the filters.
          </p>
        </div>
      ) : (
        <AgencyReportCreatorTable
          creator={creator}
          visibleFields={visibleFields}
          onSaveEdit={handleSaveEdit}
          onToggleWaste={() => void handleToggleWaste()}
          savingEntryId={savingEntryId}
          wastePending={wastePending}
        />
      )}
    </div>
  );
}
