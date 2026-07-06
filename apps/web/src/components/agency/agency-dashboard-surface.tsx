import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3 } from "lucide-react";
import { useMemo, useState, type CSSProperties } from "react";

import {
  AgencyDashboardCommandBar,
  type RangePreset,
} from "@/components/agency/agency-dashboard-command-bar";
import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import {
  getCurrentTenurePeriodRange,
  resolveDefaultDashboardRangePreset,
} from "@/lib/tenure-utils";
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

function polarToCartesian(cx: number, cy: number, radius: number, angleDeg: number) {
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: cx + radius * Math.cos(angleRad),
    y: cy + radius * Math.sin(angleRad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  const start = polarToCartesian(cx, cy, radius, startAngleDeg);
  const end = polarToCartesian(cx, cy, radius, endAngleDeg);
  const sweep = endAngleDeg - startAngleDeg;
  if (sweep <= 0) return "";
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(3)} ${start.y.toFixed(3)} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`;
}

function ProjectShareDonut({
  projects,
  totalSeconds,
}: {
  projects: Array<{ projectId: string; hours: number }>;
  totalSeconds: number;
}) {
  const { isDark } = useTheme();
  const size = 100;
  const cx = 50;
  const cy = 50;
  const radius = 42;
  const strokeWidth = 11;
  const gapDeg = 2.8;

  const slices = projects.slice(0, 8).map((project) => {
    const hue = projectHueFor(project.projectId);
    return {
      projectId: project.projectId,
      seconds: Math.round(project.hours * 3_600),
      color: isDark ? hue.dark : hue.light,
    };
  });

  const trackedSeconds = slices.reduce((sum, slice) => sum + slice.seconds, 0);
  const total = Math.max(totalSeconds, 1);
  const trackedSweep = (trackedSeconds / total) * 360;
  const totalGap = slices.length > 1 ? (slices.length - 1) * gapDeg : 0;
  const drawableSweep = Math.max(0, trackedSweep - totalGap);

  let angle = -90;
  const arcs = slices
    .map((slice, index) => {
      const share = trackedSeconds > 0 ? slice.seconds / trackedSeconds : 0;
      const sweep = drawableSweep * share;
      const start = angle;
      const end = angle + sweep;
      angle = end + (index < slices.length - 1 ? gapDeg : 0);
      const path = describeArc(cx, cy, radius, start, end);
      if (!path) return null;
      return { ...slice, path };
    })
    .filter((arc): arc is NonNullable<typeof arc> => arc !== null);

  return (
    <div className="relative mt-6 flex aspect-square max-h-72 items-center justify-center">
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="size-full"
        role="img"
        aria-label="Project time share"
      >
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="var(--muted)"
          strokeOpacity={0.35}
          strokeWidth={strokeWidth}
        />
        {arcs.map((arc) => (
          <path
            key={arc.projectId}
            d={arc.path}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        ))}
      </svg>
      <div className="absolute flex size-32 items-center justify-center rounded-full border border-default bg-default text-center">
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
};

export function AgencyDashboardSurface({ teamId }: AgencyDashboardSurfaceProps) {
  const now = useMemo(() => new Date(), []);
  const tenurePolicyQuery = useQuery({
    ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const tenurePolicy = tenurePolicyQuery.data?.policy ?? null;
  const defaultRangePreset = useMemo(
    () => resolveDefaultDashboardRangePreset(tenurePolicy),
    [tenurePolicy],
  );
  const [appliedRangePreset, setAppliedRangePreset] = useState<RangePreset | null>(null);
  const effectiveAppliedRangePreset = appliedRangePreset ?? defaultRangePreset;
  const [appliedCustomFromDate, setAppliedCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc()),
  );
  const [appliedCustomToDate, setAppliedCustomToDate] = useState(toDateInputValue(now));
  const [appliedProjectId, setAppliedProjectId] = useState("");
  const [appliedMemberUserId, setAppliedMemberUserId] = useState("");

  const [draftRangePreset, setDraftRangePreset] = useState<RangePreset | null>(null);
  const effectiveDraftRangePreset = draftRangePreset ?? defaultRangePreset;
  const [draftCustomFromDate, setDraftCustomFromDate] = useState(
    toDateInputValue(startOfWeekUtc()),
  );
  const [draftCustomToDate, setDraftCustomToDate] = useState(toDateInputValue(now));
  const [draftProjectId, setDraftProjectId] = useState("");
  const [draftMemberUserId, setDraftMemberUserId] = useState("");

  const hasPendingFilterChanges =
    effectiveDraftRangePreset !== effectiveAppliedRangePreset ||
    draftProjectId !== appliedProjectId ||
    draftMemberUserId !== appliedMemberUserId ||
    (effectiveDraftRangePreset === "custom" &&
      (draftCustomFromDate !== appliedCustomFromDate ||
        draftCustomToDate !== appliedCustomToDate));

  const range = useMemo(() => {
    const endIso = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    ).toISOString();
    if (effectiveAppliedRangePreset === "tenure") {
      const tenureRange = getCurrentTenurePeriodRange(tenurePolicy, now);
      if (tenureRange) {
        return { from: tenureRange.from, to: tenureRange.to };
      }
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    }
    if (effectiveAppliedRangePreset === "month") {
      return {
        from: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString(),
        to: endIso,
      };
    }
    if (effectiveAppliedRangePreset === "last30") {
      return {
        from: new Date(
          Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
        ).toISOString(),
        to: endIso,
      };
    }
    if (effectiveAppliedRangePreset === "custom") {
      return {
        from: dateInputToIso(appliedCustomFromDate),
        to: dateInputToIso(appliedCustomToDate, true),
      };
    }
    return { from: startOfWeekUtc().toISOString(), to: endIso };
  }, [appliedCustomFromDate, appliedCustomToDate, effectiveAppliedRangePreset, now, tenurePolicy]);

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
        projectId: appliedProjectId || undefined,
        memberUserId: appliedMemberUserId || undefined,
      },
    }),
    enabled: Boolean(teamId),
    placeholderData: keepPreviousData,
  });

  const summary = dashboardQuery.data?.summary ?? null;
  const projects = projectsQuery.data?.items ?? [];
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

  if (dashboardQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-[4.25rem] rounded-2xl" />
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

  function handleApply() {
    setAppliedRangePreset(draftRangePreset);
    setAppliedCustomFromDate(draftCustomFromDate);
    setAppliedCustomToDate(draftCustomToDate);
    setAppliedProjectId(draftProjectId);
    setAppliedMemberUserId(draftMemberUserId);
  }

  function handleReset() {
    setDraftRangePreset(null);
    setDraftProjectId("");
    setDraftMemberUserId("");
    setAppliedRangePreset(null);
    setAppliedProjectId("");
    setAppliedMemberUserId("");
  }

  return (
    <div className="space-y-4 pb-6">
      {summary && summary.totalEntries > 0 ? (
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
      ) : null}

      <AgencyDashboardCommandBar
        rangePreset={effectiveDraftRangePreset}
        onRangePresetChange={setDraftRangePreset}
        customFromDate={draftCustomFromDate}
        onCustomFromChange={setDraftCustomFromDate}
        customToDate={draftCustomToDate}
        onCustomToChange={setDraftCustomToDate}
        projectId={draftProjectId}
        onProjectChange={setDraftProjectId}
        memberUserId={draftMemberUserId}
        onMemberChange={setDraftMemberUserId}
        onApply={handleApply}
        hasPendingChanges={hasPendingFilterChanges}
        onReset={handleReset}
        defaultRangePreset={defaultRangePreset}
        tenureAvailable={Boolean(tenurePolicy?.enabled)}
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
        </>
      )}
    </div>
  );
}
