import { AlertTriangle, BarChart3, X } from "lucide-react";
import { type CSSProperties } from "react";

import { AgencyProjectHueDot } from "@/features/shared/agency-project-hue-dot";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import { projectHueFor } from "@/features/shared/project-palette";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";
import { type AgencyDashboardSurfaceViewModel } from "./hooks/use-agency-dashboard-surface";

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
  isDark,
}: {
  projectId: string;
  className?: string;
  style?: CSSProperties;
  isDark: boolean;
}) {
  const hue = projectHueFor(projectId);
  return (
    <span
      className={className}
      style={{ ...style, backgroundColor: isDark ? hue.dark : hue.light }}
    />
  );
}

function AllocationSegment({
  project,
  totalSeconds,
  isDark,
}: {
  project: {
    projectId: string;
    projectName: string;
    clientName: string;
    seconds: number;
  };
  totalSeconds: number;
  isDark: boolean;
}) {
  const share = totalSeconds > 0 ? (project.seconds / totalSeconds) * 100 : 0;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="block h-full min-w-1 p-0"
          style={{ width: `${relShare(project.seconds, totalSeconds)}%` }}
          aria-label={`${project.projectName}, ${formatDuration(project.seconds)}, ${share.toFixed(1)} percent`}
        >
          <ProjectHueFill
            projectId={project.projectId}
            className="block size-full"
            isDark={isDark}
          />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="space-y-1 px-3 py-2">
        <p className="font-semibold text-highlighted">{project.projectName}</p>
        <p className="text-muted">{project.clientName || "General"}</p>
        <p className={cn(agencyMetricClass, "text-[11px] text-muted")}>
          {formatDuration(project.seconds)} · {share.toFixed(1)}%
        </p>
      </TooltipContent>
    </Tooltip>
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
  isDark,
  totalButtonId,
  breakdownPanelId,
  onTotalClick,
}: {
  projects: Array<{ projectId: string; hours: number }>;
  totalSeconds: number;
  isDark: boolean;
  totalButtonId: string;
  breakdownPanelId: string;
  onTotalClick: () => void;
}) {
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
        <button
          id={totalButtonId}
          type="button"
          className={cn(
            "rounded-full px-3 py-2 transition-colors hover:bg-elevated",
            agencyFocusRingClass,
          )}
          aria-expanded={false}
          aria-controls={breakdownPanelId}
          onClick={onTotalClick}
        >
          <p className={cn(agencyMetricClass, "text-lg")}>{formatDuration(totalSeconds)}</p>
          <p className="mt-1 text-xs text-muted">Total</p>
        </button>
      </div>
    </div>
  );
}

type HourBreakdownSegment = {
  id: string;
  label: string;
  purpose: string;
  seconds: number;
  barClass: string;
  dotClass: string;
};

function HourBreakdownChart({
  panelId,
  totalSeconds,
  externalSeconds,
  internalSeconds,
  paidSeconds,
  onClose,
}: {
  panelId: string;
  totalSeconds: number;
  externalSeconds: number;
  internalSeconds: number;
  paidSeconds: number;
  onClose: () => void;
}) {
  const wasteSeconds = Math.max(0, externalSeconds - paidSeconds);
  const segments: HourBreakdownSegment[] = [
    {
      id: "paid",
      label: "Paid",
      purpose: "External hours minus waste — the billable client share.",
      seconds: paidSeconds,
      barClass: "bg-primary",
      dotClass: "bg-primary",
    },
    {
      id: "waste",
      label: "Waste",
      purpose: "External time marked as non-billable or waste.",
      seconds: wasteSeconds,
      barClass: "bg-warning",
      dotClass: "bg-warning",
    },
    {
      id: "internal",
      label: "Internal",
      purpose: "Agency and internal-client work, not client-billable.",
      seconds: internalSeconds,
      barClass: "bg-info",
      dotClass: "bg-info",
    },
  ];
  const chartTotal = Math.max(
    1,
    segments.reduce((sum, segment) => sum + segment.seconds, 0),
  );

  return (
    <div id={panelId} className="mt-4" role="region" aria-label="Hour breakdown chart">
      <div className="flex items-center justify-between gap-2">
        <p className={agencyLabelClass}>Hour breakdown</p>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="size-7 text-toned hover:text-highlighted"
          aria-label="Close hour breakdown"
          onClick={onClose}
        >
          <X className="size-4" />
        </Button>
      </div>

      <div className="mt-4 flex items-baseline justify-between gap-3">
        <p className="text-xs text-muted">Total time in range</p>
        <p className={cn(agencyMetricClass, "text-base tabular-nums")}>
          {formatDuration(totalSeconds)}
        </p>
      </div>

      <div
        className="mt-3 flex h-3 overflow-hidden rounded-full bg-elevated"
        role="img"
        aria-label="Paid, waste, and internal time share"
      >
        {segments.map((segment) => {
          if (segment.seconds <= 0) return null;
          const width = Math.max(2, (segment.seconds / chartTotal) * 100);
          return (
            <span
              key={segment.id}
              className={cn("h-full", segment.barClass)}
              style={{ width: `${width}%` }}
              title={`${segment.label}: ${formatDuration(segment.seconds)}`}
            />
          );
        })}
      </div>

      <ul className="mt-5 space-y-4">
        {segments.map((segment) => {
          const share = totalSeconds > 0 ? (segment.seconds / totalSeconds) * 100 : 0;
          return (
            <li key={segment.id} className="min-w-0">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className={cn("size-2.5 shrink-0 rounded-full", segment.dotClass)} />
                  <span className="text-sm font-semibold text-highlighted">{segment.label}</span>
                </div>
                <span className={cn(agencyMetricClass, "shrink-0 tabular-nums text-muted")}>
                  {formatDuration(segment.seconds)}
                  <span className="ml-1.5 text-[10px] font-medium">{share.toFixed(0)}%</span>
                </span>
              </div>
              <p className="mt-1 pl-4.5 text-xs leading-snug text-muted">{segment.purpose}</p>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-elevated">
                <span
                  className={cn("block h-full rounded-full", segment.barClass)}
                  style={{ width: `${Math.max(segment.seconds > 0 ? 2 : 0, share)}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type AgencyDashboardSurfaceViewProps = {
  viewModel: AgencyDashboardSurfaceViewModel;
};

export function AgencyDashboardSurfaceView({ viewModel }: AgencyDashboardSurfaceViewProps) {
  const {
    isLoading,
    isError,
    errorMessage,
    summary,
    rankedProjects,
    totalProjectHours,
    activeTimerByUserId,
    sortedTeamMembers,
    sortedRankedProjects,
    isDark,
    hourBreakdownOpen,
    setHourBreakdownOpen,
    totalButtonId,
    breakdownPanelId,
    onSelectProject,
    onSelectClient,
    refetch,
  } = viewModel;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load dashboard.</p>
        <p className="mt-1 text-xs text-muted">{errorMessage}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
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

      {!summary || summary.totalEntries === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <BarChart3 className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">No time tracked in this range.</p>
          <p className="mt-1 text-xs text-muted">
            Track time on Work, then adjust filters if needed.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <section className="grid gap-4 [content-visibility:auto] lg:grid-cols-[22rem_minmax(0,1fr)]">
            <div className={cn(agencyPanelClass, "relative overflow-hidden p-4")}>
              <p className={agencyLabelClass}>Project share</p>
              {hourBreakdownOpen ? (
                <HourBreakdownChart
                  panelId={breakdownPanelId}
                  totalSeconds={summary.totalSeconds}
                  externalSeconds={summary.projectShareMetrics.externalSeconds}
                  internalSeconds={summary.projectShareMetrics.internalSeconds}
                  paidSeconds={summary.projectShareMetrics.paidSeconds}
                  onClose={() => setHourBreakdownOpen(false)}
                />
              ) : (
                <ProjectShareDonut
                  projects={rankedProjects}
                  totalSeconds={summary.totalSeconds}
                  isDark={isDark}
                  totalButtonId={totalButtonId}
                  breakdownPanelId={breakdownPanelId}
                  onTotalClick={() => setHourBreakdownOpen(true)}
                />
              )}
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
                        <div className="group/project flex min-w-0 items-center gap-2">
                          <AgencyProjectHueDot projectId={project.projectId} className="size-2" />
                          <div className="min-w-0">
                            <button
                              type="button"
                              className={cn(
                                "block max-w-full truncate text-left font-semibold text-highlighted transition-colors hover:text-primary",
                                agencyFocusRingClass,
                              )}
                              onClick={() => onSelectProject?.(project.projectId)}
                            >
                              {project.projectName}
                            </button>
                            {project.clientName ? (
                              <button
                                type="button"
                                className={cn(
                                  "block max-w-full truncate text-left text-[10px] font-medium text-muted",
                                  "max-h-0 opacity-0 transition-[max-height,opacity,color] duration-200 ease-out",
                                  "group-hover/project:max-h-4 group-hover/project:opacity-100",
                                  "group-focus-within/project:max-h-4 group-focus-within/project:opacity-100",
                                  "hover:text-highlighted",
                                  agencyFocusRingClass,
                                )}
                                onClick={() => onSelectClient?.(project.clientId)}
                              >
                                {project.clientName}
                              </button>
                            ) : null}
                          </div>
                        </div>
                        <span className={cn(agencyMetricClass, "text-muted md:text-right")}>
                          {formatDuration(seconds)}
                        </span>
                        <div className="h-3 overflow-hidden rounded-sm bg-elevated">
                          <ProjectHueFill
                            projectId={project.projectId}
                            className="block h-full"
                            style={{ width: `${Math.max(2, share)}%` }}
                            isDark={isDark}
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
              <TooltipProvider delayDuration={120}>
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
                    {sortedTeamMembers.map((member) => {
                      const liveTimer = activeTimerByUserId.get(member.userId);
                      const isTracking = Boolean(liveTimer) || member.isActive;
                      const activity = liveTimer
                        ? {
                            description: liveTimer.description,
                            projectName: liveTimer.projectName,
                            clientName: liveTimer.clientName ?? null,
                          }
                        : member.latestEntry;

                      return (
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
                                <p className="truncate font-bold text-highlighted">
                                  {member.userName}
                                </p>
                                <p className="truncate text-[11px] text-muted">
                                  {member.userEmail}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="max-w-sm px-4 py-3">
                            {activity ? (
                              <div className="min-w-0">
                                <div className="flex min-w-0 items-center gap-1.5">
                                  {isTracking ? (
                                    <span
                                      className="size-1.5 shrink-0 rounded-full bg-primary"
                                      aria-hidden
                                    />
                                  ) : null}
                                  <p className="truncate font-semibold text-highlighted">
                                    {activity.description || "(no description)"}
                                  </p>
                                </div>
                                <p className="truncate text-[11px] text-muted">
                                  {activity.clientName
                                    ? `${activity.projectName} · ${activity.clientName}`
                                    : activity.projectName}
                                </p>
                              </div>
                            ) : (
                              <span className="text-muted">No activity</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full bg-elevated px-2 py-1 text-[11px] font-bold text-muted",
                                isTracking && "gap-1.5",
                              )}
                              aria-label={isTracking ? "Timer running" : "Idle"}
                            >
                              {isTracking ? (
                                <span className="size-1.5 rounded-full bg-primary" aria-hidden />
                              ) : null}
                              {isTracking ? "In progress" : "Idle"}
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
                                  <AllocationSegment
                                    key={project.projectId}
                                    project={project}
                                    totalSeconds={member.totalSeconds}
                                    isDark={isDark}
                                  />
                                ))
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TooltipProvider>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
