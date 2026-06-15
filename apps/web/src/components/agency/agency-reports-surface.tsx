import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart2, Download } from "lucide-react";
import { useImperativeHandle, useEffect, useMemo, useState, forwardRef } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyLabelClass,
  agencyMetricClass,
} from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { projectHueStyle } from "@/lib/utils/project-palette";

export type AgencyReportsSurfaceHandle = {
  downloadCsv: () => Promise<void>;
  canExport: boolean;
  isExporting: boolean;
};

type AgencyReportsSurfaceProps = {
  teamId: string;
  hideToolbarExport?: boolean;
  onExportStateChange?: (state: { canExport: boolean; isExporting: boolean }) => void;
};

type RangePreset = "week" | "month" | "last30";

const PRESET_LABEL: Record<RangePreset, string> = {
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
};

function startOfWeekUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

function relShare(hours: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((hours / total) * 100));
}

function formatHours(value: number): string {
  if (value === 0) return "0h";
  const whole = Math.floor(value);
  const minutes = Math.round((value - whole) * 60);
  if (minutes === 0) return `${whole}h`;
  return `${whole}h ${String(minutes).padStart(2, "0")}m`;
}

export const AgencyReportsSurface = forwardRef<AgencyReportsSurfaceHandle, AgencyReportsSurfaceProps>(
  function AgencyReportsSurface({ teamId, hideToolbarExport = false, onExportStateChange }, ref) {
  const [rangePreset, setRangePreset] = useState<RangePreset>("week");

  const range = useMemo(() => {
    const now = new Date();
    const endIso = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    ).toISOString();

    if (rangePreset === "month") {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { from: start.toISOString(), to: endIso };
    }
    if (rangePreset === "last30") {
      const start = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
      );
      return { from: start.toISOString(), to: endIso };
    }
    return { from: startOfWeekUtc().toISOString(), to: endIso };
  }, [rangePreset]);

  const summaryQuery = useQuery({
    ...orpc.agencyOps.reports.summary.queryOptions({
      input: { teamId, from: range.from, to: range.to },
    }),
    enabled: Boolean(teamId),
  });

  const summary = summaryQuery.data?.summary ?? null;
  const canExport = Boolean(summary && summary.totalEntries > 0);

  const exportCsvMutation = useMutation(orpc.agencyOps.reports.exportCsv.mutationOptions());

  async function downloadCsv() {
    if (!teamId) return;
    try {
      const result = await exportCsvMutation.mutateAsync({
        teamId,
        from: range.from,
        to: range.to,
      });
      const blob = new Blob([result.csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = result.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("Export ready", {
        description: `${result.totalRows} rows in ${result.fileName}`,
      });
    } catch (error) {
      toast.error("Export failed", {
        description: getErrorMessage(error, "Try again."),
      });
    }
  }

  useImperativeHandle(
    ref,
    () => ({
      downloadCsv,
      canExport,
      isExporting: exportCsvMutation.isPending,
    }),
    [canExport, exportCsvMutation.isPending, range.from, range.to, teamId],
  );

  useEffect(() => {
    onExportStateChange?.({
      canExport,
      isExporting: exportCsvMutation.isPending,
    });
  }, [canExport, exportCsvMutation.isPending, onExportStateChange]);

  return (
    <div className="agency-reports space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-full border border-default bg-elevated p-1">
          {(["week", "month", "last30"] as const).map((preset) => (
            <button
              key={preset}
              type="button"
              className={[
                "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
                rangePreset === preset
                  ? "bg-default text-highlighted"
                  : "text-muted hover:text-highlighted",
              ].join(" ")}
              aria-pressed={rangePreset === preset}
              onClick={() => setRangePreset(preset)}
            >
              {PRESET_LABEL[preset]}
            </button>
          ))}
        </div>

        {!hideToolbarExport ? (
          <div className="ml-auto">
            <Button
              variant="secondary"
              size="sm"
              disabled={!summary || summary.totalEntries === 0 || exportCsvMutation.isPending}
              onClick={() => void downloadCsv()}
            >
              <Download />
              Export CSV
            </Button>
          </div>
        ) : null}
      </div>

      {summaryQuery.isPending ? (
        <div className="grid gap-4 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      ) : summaryQuery.isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load reports.</p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(summaryQuery.error, "Try refreshing.")}
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={() => void summaryQuery.refetch()}>
            Retry
          </Button>
        </div>
      ) : !summary || summary.totalEntries === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart2 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No time logged in this range.</p>
          <p className="mt-1 text-xs text-muted">Track time on Work, then come back here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-default pb-3 text-xs">
            <div>
              <span className={agencyLabelClass}>Total hours</span>
              <span className={["ml-2", agencyMetricClass].join(" ")}>{formatHours(summary.totalHours)}</span>
            </div>
            <div>
              <span className={agencyLabelClass}>Entries</span>
              <span className={["ml-2", agencyMetricClass].join(" ")}>{summary.totalEntries}</span>
            </div>
            <div>
              <span className={agencyLabelClass}>Active members</span>
              <span className={["ml-2", agencyMetricClass].join(" ")}>{summary.teamActivity.length}</span>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-default bg-default">
              <header className="border-b border-default px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Hours by client</p>
              </header>
              <ul className="divide-y divide-default">
                {summary.timeDistributionByClient.map((row) => (
                  <li key={row.clientId} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-xs font-bold text-highlighted">{row.clientName}</span>
                      <span className="font-mono text-[11px] tabular-nums text-muted">
                        {formatHours(row.hours)}
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${relShare(row.hours, summary.totalHours)}%` }}
                      />
                    </div>
                  </li>
                ))}
                {summary.timeDistributionByClient.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-muted">No data.</li>
                ) : null}
              </ul>
            </article>

            <article className="rounded-2xl border border-default bg-default">
              <header className="border-b border-default px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Hours by project</p>
              </header>
              <ul className="divide-y divide-default">
                {summary.timeDistributionByProject.map((row) => (
                  <li key={row.projectId} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          className="agency-reports__dot inline-block size-2 shrink-0 rounded-full"
                          aria-hidden="true"
                          style={projectHueStyle(row.projectId)}
                        />
                        <span className="truncate text-xs font-bold text-highlighted">{row.projectName}</span>
                      </div>
                      <span className="font-mono text-[11px] tabular-nums text-muted">
                        {formatHours(row.hours)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted">{row.clientName}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-elevated">
                      <div
                        className="agency-reports__hue-bar h-full rounded-full"
                        style={{
                          width: `${relShare(row.hours, summary.totalHours)}%`,
                          ...projectHueStyle(row.projectId),
                        }}
                      />
                    </div>
                  </li>
                ))}
                {summary.timeDistributionByProject.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-muted">No data.</li>
                ) : null}
              </ul>
            </article>

            <article className="rounded-2xl border border-default bg-default">
              <header className="border-b border-default px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Team activity</p>
              </header>
              <ul className="divide-y divide-default">
                {summary.teamActivity.map((row) => (
                  <li key={row.userId} className="px-4 py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-xs font-bold text-highlighted">{row.userName}</span>
                      <span className="font-mono text-[11px] tabular-nums text-muted">
                        {formatHours(row.hours)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] text-muted">{row.userEmail}</p>
                    <div className="mt-2 h-1.5 rounded-full bg-elevated">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${relShare(row.hours, summary.totalHours)}%` }}
                      />
                    </div>
                  </li>
                ))}
                {summary.teamActivity.length === 0 ? (
                  <li className="px-4 py-6 text-center text-xs text-muted">No data.</li>
                ) : null}
              </ul>
            </article>
          </div>
        </div>
      )}
    </div>
  );
},
);
