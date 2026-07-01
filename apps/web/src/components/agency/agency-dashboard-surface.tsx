import { useMutation, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3 } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import { toast } from "sonner";

import {
  AgencyDashboardCommandBar,
  type RangePreset,
} from "@/components/agency/agency-dashboard-command-bar";
import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { projectHueFor } from "@/lib/utils/project-palette";
import { cn } from "@/lib/utils";
import { useTheme } from "@/stores/theme";

function startOfWeekUtc(): Date {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date;
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateInputToIso(value: string, endOfDay = false): string {
  if (!value) return new Date().toISOString();
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1));
  if (endOfDay) date.setUTCHours(23, 59, 59, 999);
  return date.toISOString();
}

function formatShortDuration(seconds: number): string {
  if (seconds <= 0) return "0h";
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.round((seconds % 3_600) / 60);
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

function formatChartDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatActivityDateLabel(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function relShare(seconds: number, totalSeconds: number): number {
  if (totalSeconds <= 0) return 0;
  return Math.max(2, Math.min(100, (seconds / totalSeconds) * 100));
}

function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function ProjectHueFill({
  projectId,
  className,
  style,
}: {
  projectId: string;
  className?: string;
  style?: CSSProperties;
}) {
  const { isDark } = useTheme();
  const hue = projectHueFor(projectId);
  return (
    <span
      className={className}
      style={{ ...style, backgroundColor: isDark ? hue.dark : hue.light }}
    />
  );
}

function ProjectShareDonut({
  projects,
  totalSeconds,
}: {
  projects: Array<{ projectId: string; hours: number }>;
  totalSeconds: number;
}) {
  const { isDark } = useTheme();
  let cursor = 0;
  const stops = projects.slice(0, 8).map((project) => {
    const hue = projectHueFor(project.projectId);
    const color = isDark ? hue.dark : hue.light;
    const next = cursor + (project.hours * 3_600 * 100) / Math.max(totalSeconds, 1);
    const stop = `${color} ${cursor.toFixed(2)}% ${next.toFixed(2)}%`;
    cursor = next;
    return stop;
  });
  const background =
    stops.length > 0
      ? `conic-gradient(${stops.join(", ")}, var(--muted) ${cursor.toFixed(2)}% 100%)`
      : "var(--muted)";

  return (
    <div
      className="mt-6 flex aspect-square max-h-72 items-center justify-center rounded-full p-8"
      style={{ background }}
      role="img"
      aria-label="Project time share"
    >
      <div className="flex size-32 items-center justify-center rounded-full border border-default bg-default text-center">
        <div>
          <p className={cn(agencyMetricClass, "text-lg")}>{formatDuration(totalSeconds)}</p>
          <p className="mt-1 text-xs text-muted">logged</p>
        </div>
      </div>
    </div>
  );
}

type AgencyDashboardSurfaceProps = {
  teamId: string;
  onExportStateChange?: (state: { canExport: boolean; isExporting: boolean }) => void;
};

export type AgencyDashboardSurfaceHandle = {
  downloadCsv: () => Promise<void>;
  canExport: boolean;
  isExporting: boolean;
};

export const AgencyDashboardSurface = forwardRef<
  AgencyDashboardSurfaceHandle,
  AgencyDashboardSurfaceProps
>(function AgencyDashboardSurface({ teamId, onExportStateChange }, ref) {
  const [rangePreset, setRangePreset] = useState<RangePreset>("last30");
  const now = useMemo(() => new Date(), []);
  const [customFromDate, setCustomFromDate] = useState(toDateInputValue(startOfWeekUtc()));
  const [customToDate, setCustomToDate] = useState(toDateInputValue(now));
  const [projectId, setProjectId] = useState("");
  const [memberUserId, setMemberUserId] = useState("");

  const range = useMemo(() => {
    const endIso = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    ).toISOString();
    if (rangePreset === "month") {
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
        to: endIso,
      };
    }
    if (rangePreset === "last30") {
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    }
    if (rangePreset === "custom") {
      return { from: dateInputToIso(customFromDate), to: dateInputToIso(customToDate, true) };
    }
    return { from: startOfWeekUtc().toISOString(), to: endIso };
  }, [customFromDate, customToDate, now, rangePreset]);

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const dashboardQuery = useQuery({
    ...orpc.agencyOps.reports.dashboard.queryOptions({
      input: {
        teamId,
        from: range.from,
        to: range.to,
        projectId: projectId || undefined,
        memberUserId: memberUserId || undefined,
      },
    }),
    enabled: Boolean(teamId),
  });

  const exportCsvMutation = useMutation(orpc.agencyOps.reports.exportCsv.mutationOptions());

  const summary = dashboardQuery.data?.summary ?? null;
  const canExport = Boolean(summary && summary.totalEntries > 0);
  const projects = projectsQuery.data?.items ?? [];
  const maxDaySeconds = Math.max(
    ...(summary?.dailyBuckets.map((bucket) => bucket.totalSeconds) ?? [0]),
    1,
  );
  const rankedProjects = summary?.timeDistributionByProject.slice(0, 10) ?? [];
  const totalProjectHours =
    summary?.timeDistributionByProject.reduce((sum, row) => sum + row.hours, 0) ?? 0;

  const sortedTeamMembers = useMemo(() => {
    const members = summary?.teamMembers ?? [];
    return [...members].sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [summary?.teamMembers]);

  const sortedRankedProjects = useMemo(() => {
    const list = [...rankedProjects];
    return list.sort((a, b) => b.hours - a.hours);
  }, [rankedProjects]);

  const downloadCsv = useCallback(async () => {
    if (!teamId) return;
    try {
      const result = await exportCsvMutation.mutateAsync({
        teamId,
        from: range.from,
        to: range.to,
        projectId: projectId || undefined,
        memberUserId: memberUserId || undefined,
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
      toast.error("Export failed", { description: getErrorMessage(error, "Try again.") });
    }
  }, [exportCsvMutation, memberUserId, projectId, range.from, range.to, teamId]);

  useImperativeHandle(
    ref,
    () => ({
      downloadCsv,
      canExport,
      isExporting: exportCsvMutation.isPending,
    }),
    [canExport, downloadCsv, exportCsvMutation.isPending],
  );

  useEffect(() => {
    onExportStateChange?.({ canExport, isExporting: exportCsvMutation.isPending });
  }, [canExport, exportCsvMutation.isPending, onExportStateChange]);

  if (dashboardQuery.isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[4.25rem] rounded-2xl" />
        <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-[28rem] rounded-2xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (dashboardQuery.isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load dashboard.</p>
        <p className="mt-1 text-xs text-muted">
          {getErrorMessage(dashboardQuery.error, "Try refreshing.")}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => void dashboardQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  function handleReset() {
    setRangePreset("last30");
    setProjectId("");
    setMemberUserId("");
  }

  return (
    <div className="space-y-4 pb-6">
      <AgencyDashboardCommandBar
        rangePreset={rangePreset}
        onRangePresetChange={setRangePreset}
        customFromDate={customFromDate}
        onCustomFromChange={setCustomFromDate}
        customToDate={customToDate}
        onCustomToChange={setCustomToDate}
        projectId={projectId}
        onProjectChange={setProjectId}
        memberUserId={memberUserId}
        onMemberChange={setMemberUserId}
        onReset={handleReset}
        projects={projects}
        members={summary?.teamMembers ?? []}
        projectsLoading={projectsQuery.isPending}
      />

      {!summary || summary.totalEntries === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart3 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No time tracked in this range.</p>
          <p className="mt-1 text-xs text-muted">
            Track time on Work, then adjust filters if needed.
          </p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-b border-default pb-3 text-xs">
            <div>
              <span className={agencyLabelClass}>Total time</span>
              <span className={cn("ml-2", agencyMetricClass)}>
                {formatDuration(summary.totalSeconds)}
              </span>
            </div>
            <div className="min-w-0 max-w-xs">
              <span className={agencyLabelClass}>Top project</span>
              <span className="ml-2 truncate font-semibold text-highlighted">
                {summary.topProject?.projectName ?? "None"}
              </span>
            </div>
            <div className="min-w-0 max-w-xs">
              <span className={agencyLabelClass}>Top client</span>
              <span className="ml-2 truncate font-semibold text-highlighted">
                {summary.topClient?.clientName ?? "None"}
              </span>
            </div>
            <div>
              <span className={agencyLabelClass}>Active timers</span>
              <span className={cn("ml-2", agencyMetricClass, "text-primary")}>
                {summary.activeTimerCount}
              </span>
            </div>
          </div>

          <section className={cn(agencyPanelClass, "overflow-hidden")}>
            <header className="flex items-center justify-between border-b border-default px-4 py-3">
              <p className={agencyLabelClass}>Team activity</p>
              <p className={cn(agencyMetricClass, "text-[11px] text-muted")}>
                {summary.teamMembers.length} members
              </p>
            </header>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[62rem] text-left text-xs">
                <thead className="border-b border-default bg-elevated text-[11px] font-bold uppercase tracking-[0.14em] text-muted">
                  <tr>
                    <th scope="col" className="px-4 py-2.5">
                      Team member
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Latest activity
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Current
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right">
                      Total tracked
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Allocation
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-default">
                  {sortedTeamMembers.map((member) => (
                    <tr
                      key={member.userId}
                      className="transition-colors hover:bg-elevated/55 motion-reduce:transition-none"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          {member.avatar ? (
                            <img
                              src={member.avatar}
                              alt={member.userName}
                              className="size-8 rounded-xl object-cover"
                            />
                          ) : (
                            <span
                              className="flex size-8 items-center justify-center rounded-xl bg-muted text-[11px] font-bold text-highlighted"
                              aria-hidden
                            >
                              {initials(member.userName)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate font-bold text-highlighted">{member.userName}</p>
                            <p className="truncate text-[11px] text-muted">{member.userEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-sm px-4 py-3">
                        {member.latestEntry ? (
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-highlighted">
                              {member.latestEntry.description || "(no description)"}
                            </p>
                            <p className="truncate text-[11px] text-muted">
                              {member.latestEntry.projectName} · {member.latestEntry.clientName}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted">No activity</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center gap-1.5 rounded-full bg-elevated px-2 py-1 text-[11px] font-bold text-muted"
                          aria-label={member.isActive ? "Timer running" : "Idle"}
                        >
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              member.isActive ? "bg-primary" : "bg-muted",
                            )}
                            aria-hidden
                          />
                          {member.isActive ? "In progress" : "Idle"}
                        </span>
                      </td>
                      <td className={cn("px-4 py-3 text-right", agencyMetricClass)}>
                        {formatDuration(member.totalSeconds)}
                      </td>
                      <td className="px-4 py-3">
                        <div
                          className="flex h-4 overflow-hidden rounded-sm bg-elevated"
                          role="img"
                          aria-label={`Project allocation for ${member.userName}`}
                        >
                          {member.projectBreakdown.length === 0 ? (
                            <span className="h-full w-full bg-muted/30" />
                          ) : (
                            member.projectBreakdown.map((project) => (
                              <ProjectHueFill
                                key={project.projectId}
                                projectId={project.projectId}
                                className="block h-full min-w-1"
                                style={{
                                  width: `${relShare(project.seconds, member.totalSeconds)}%`,
                                }}
                              />
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section className={cn(agencyPanelClass, "p-4 [content-visibility:auto]")}>
            <div className="mb-4 flex items-center justify-between">
              <p className={agencyLabelClass}>Daily timeline</p>
              <p className="text-[11px] text-muted">Stacked by project</p>
            </div>
            <div
              className="flex h-56 items-end gap-2 overflow-x-auto border-b border-default pb-3"
              role="img"
              aria-label="Daily tracked time stacked by project"
            >
              {summary.dailyBuckets.map((bucket) => (
                <div key={bucket.date} className="flex min-w-12 flex-1 flex-col items-center gap-2">
                  <div
                    className="flex w-full min-w-8 flex-col-reverse overflow-hidden rounded-sm bg-elevated"
                    style={{
                      height: `${Math.max(3, (bucket.totalSeconds / maxDaySeconds) * 100)}%`,
                    }}
                    title={`${formatActivityDateLabel(bucket.date)} · ${formatShortDuration(bucket.totalSeconds)}`}
                    aria-label={`${formatActivityDateLabel(bucket.date)}, ${formatShortDuration(bucket.totalSeconds)}`}
                  >
                    {bucket.segments.map((segment) => (
                      <ProjectHueFill
                        key={segment.projectId}
                        projectId={segment.projectId}
                        className="block w-full"
                        style={{ height: `${relShare(segment.seconds, bucket.totalSeconds)}%` }}
                      />
                    ))}
                  </div>
                  <span className="whitespace-nowrap text-[11px] tabular-nums text-muted">
                    {formatChartDateLabel(bucket.date)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <section className="grid gap-4 [content-visibility:auto] lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className={cn(agencyPanelClass, "p-4")}>
              <p className={agencyLabelClass}>Project share</p>
              <ProjectShareDonut projects={rankedProjects} totalSeconds={summary.totalSeconds} />
            </div>
            <div className={cn(agencyPanelClass, "p-4")}>
              <p className={agencyLabelClass}>Ranked projects</p>
              {rankedProjects.length === 0 ? (
                <p className="mt-4 text-xs text-muted">No project breakdown in this range.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {sortedRankedProjects.map((project) => {
                    const seconds = Math.round(project.hours * 3_600);
                    const share =
                      totalProjectHours > 0 ? (project.hours / totalProjectHours) * 100 : 0;
                    return (
                      <div
                        key={project.projectId}
                        className="grid gap-2 text-xs md:grid-cols-[minmax(12rem,1fr)_6rem_minmax(12rem,1.5fr)_3.5rem] md:items-center"
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <AgencyProjectHueDot projectId={project.projectId} className="size-2" />
                          <span className="truncate font-semibold text-highlighted">
                            {project.projectName}
                          </span>
                        </div>
                        <span className={cn(agencyMetricClass, "text-muted md:text-right")}>
                          {formatDuration(seconds)}
                        </span>
                        <div className="h-3 overflow-hidden rounded-sm bg-elevated">
                          <ProjectHueFill
                            projectId={project.projectId}
                            className="block h-full"
                            style={{ width: `${Math.max(2, share)}%` }}
                          />
                        </div>
                        <span className={cn(agencyMetricClass, "text-muted md:text-right")}>
                          {share.toFixed(1)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
});
