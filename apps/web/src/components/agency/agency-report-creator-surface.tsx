import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, BarChart2, Loader2 } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { toast } from "sonner";

import { AgencyReportCreatorTable } from "@/components/agency/agency-report-creator-table";
import { AgencyReportFloatingCommandBar } from "@/components/agency/agency-report-floating-command-bar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchAllReportEntries } from "@/lib/agency/reports/fetch-report-entries";
import { useAgencyReportCreator } from "@/lib/agency/reports/use-agency-report-creator";
import { draftToIsoRange, type TimeEntryDraft } from "@/lib/schemas/agency-time-entry";
import { orpcClient } from "@/lib/orpc";
import { invalidateAgencyTeamQueries } from "@/lib/queries/agency";
import { agencyEmptyPanelClass, agencyErrorPanelClass } from "@/lib/utils/agency-ui";
import { exportAgencyReportXlsx } from "@/lib/utils/export-agency-report-xlsx";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyReportCreatorSurfaceProps = {
  teamId: string;
};

export function AgencyReportCreatorSurface({ teamId }: AgencyReportCreatorSurfaceProps) {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [exporting, setExporting] = useState(false);
  const [savingEntryId, setSavingEntryId] = useState<string | null>(null);
  const [wastePending, setWastePending] = useState(false);

  const from = searchParams.get("from") ?? "";
  const to = searchParams.get("to") ?? "";
  const clientId = searchParams.get("client") ?? undefined;
  const projectId = searchParams.get("project") ?? undefined;
  const memberUserId = searchParams.get("member") ?? undefined;

  const filters = useMemo(
    () => ({ clientId, projectId, memberUserId }),
    [clientId, memberUserId, projectId],
  );

  const range = useMemo(() => ({ from, to }), [from, to]);
  const rangeReady = Boolean(from && to);

  const entriesQuery = useQuery({
    queryKey: [
      "agency-reports",
      "entries",
      teamId,
      range.from,
      range.to,
      clientId,
      projectId,
      memberUserId,
    ],
    queryFn: () => fetchAllReportEntries(teamId, range, filters),
    enabled: Boolean(teamId && rangeReady),
  });

  const entries = entriesQuery.data ?? [];
  const creator = useAgencyReportCreator(entries);

  const backParams = useMemo(() => {
    const next = new URLSearchParams(searchParams);
    next.set("section", "reports");
    next.delete("report");
    return next.toString();
  }, [searchParams]);

  const saveEditMutation = useMutation({
    mutationFn: async ({
      entryId,
      draft,
    }: {
      entryId: string;
      draft: TimeEntryDraft;
    }) => {
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
  }, [creator, queryClient, teamId]);

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
          creator.undoLastExclude();
          toast.success("Restored removed entry");
        }
        return;
      }

      if (!creator.selectedEntryId) return;

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        creator.excludeSelectedEntry();
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
  }, [creator, handleToggleWaste]);

  async function handleExport() {
    if (!teamId || exporting) return;
    setExporting(true);
    try {
      const { fileName, blob } = await exportAgencyReportXlsx({
        teamId,
        entries,
        excludedEntryIds: creator.excludedEntryIds,
        entryOverrides: creator.entryOverrides,
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Export ready", { description: fileName });
    } catch (error) {
      toast.error("Export failed", {
        description: getErrorMessage(error, "Try again."),
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="agency-report-creator space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" className="h-8 px-2" asChild>
            <Link to={`/agency?${backParams}`}>
              <ArrowLeft className="size-4" />
              Reports
            </Link>
          </Button>
          <h2 className="text-sm font-bold text-highlighted">Report</h2>
          {creator.canUndo ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-2 text-xs"
              onClick={() => {
                creator.undoLastExclude();
                toast.success("Restored removed entry");
              }}
            >
              Undo
            </Button>
          ) : null}
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <Button
            variant="secondary"
            size="sm"
            disabled={creator.visibleEntries.length === 0 || exporting}
            onClick={() => void handleExport()}
          >
            {exporting ? (
              <>
                <Loader2 className="size-3.5 animate-spin motion-reduce:animate-none" />
                Exporting…
              </>
            ) : (
              "Export to Sheets"
            )}
          </Button>
          <p className="text-[10px] text-muted">Downloads .xlsx — open in Google Sheets</p>
        </div>
      </header>

      {!rangeReady ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">Missing date range.</p>
          <p className="mt-1 text-xs text-muted">Go back to Reports and create a report from filters.</p>
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
          onSaveEdit={handleSaveEdit}
          savingEntryId={savingEntryId}
        />
      )}

      <AgencyReportFloatingCommandBar
        visible={Boolean(creator.selectedEntryId && !creator.editingEntryId)}
        anchor={creator.commandBarAnchor}
        canUndo={creator.canUndo}
        canMarkWaste={Boolean(creator.selectedEntry?.taskId)}
        isWaste={creator.selectedEntry?.taskIsWaste === true}
        wastePending={wastePending}
        onDelete={creator.excludeSelectedEntry}
        onToggleWaste={() => void handleToggleWaste()}
        onEdit={creator.startEditingSelected}
        onUndo={() => {
          creator.undoLastExclude();
          toast.success("Restored removed entry");
        }}
        onDismiss={creator.clearSelection}
      />
    </div>
  );
}
