import { AlertTriangle, BarChart3 } from "lucide-react";

import { AgencyProjectHueDot } from "@/features/shared/agency-project-hue-dot";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyPanelClass,
} from "@/features/shared/agency-ui";
import { Button } from "@/ui/button";
import { Skeleton } from "@/ui/skeleton";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { projectHueFor } from "@/lib/utils/project-palette";
import { cn } from "@/lib/utils";
import type { AgencyDashboardSurfaceViewModel } from "./hooks/use-agency-dashboard-surface";

type Props = { viewModel: AgencyDashboardSurfaceViewModel };

export function AgencyDashboardSurfaceView({ viewModel }: Props) {
  const {
    isLoading,
    isError,
    error,
    summary,
    rankedProjects,
    totalProjectHours,
    sortedRankedProjects,
    isDark,
    refetch,
  } = viewModel;

  if (isLoading)
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-2xl rounded-xl" />
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    );
  if (isError)
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load dashboard.</p>
        <p className="mt-1 text-xs text-muted">{getErrorMessage(error, "Try refreshing.")}</p>
        <Button variant="secondary" size="sm" className="mt-3" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
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
            <div className={cn(agencyPanelClass, "p-4")}>
              <p className={agencyLabelClass}>Project share</p>
              <div className="relative mt-6 flex aspect-square max-h-72 items-center justify-center">
                <svg
                  viewBox="0 0 100 100"
                  className="size-full"
                  role="img"
                  aria-label="Project time share"
                >
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    stroke="var(--muted)"
                    strokeOpacity="0.35"
                    strokeWidth="11"
                  />
                </svg>
                <div className="absolute flex size-32 items-center justify-center rounded-full border border-default bg-default text-center">
                  <div>
                    <p className={cn(agencyMetricClass, "text-lg")}>
                      {formatDuration(totalProjectHours * 3600)}
                    </p>
                    <p className="mt-1 text-xs text-muted">logged</p>
                  </div>
                </div>
              </div>
            </div>
            <div className={cn(agencyPanelClass, "p-4")}>
              <p className={agencyLabelClass}>Ranked projects</p>
              {rankedProjects.length === 0 ? (
                <p className="mt-4 text-xs text-muted">No project breakdown in this range.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {sortedRankedProjects.map((project) => {
                    const seconds = Math.round(project.hours * 3600);
                    const share =
                      summary.totalSeconds > 0
                        ? Math.round((seconds / summary.totalSeconds) * 100)
                        : 0;
                    return (
                      <div key={project.projectId} className="space-y-1.5">
                        <div className="flex items-center justify-between gap-3 text-xs">
                          <div className="flex min-w-0 items-center gap-2">
                            <AgencyProjectHueDot projectId={project.projectId} />
                            <span className="truncate font-semibold text-highlighted">
                              {project.projectName}
                            </span>
                          </div>
                          <span className="font-mono text-[11px] tabular-nums text-muted">
                            {formatDuration(seconds)}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-elevated">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${share}%`,
                              backgroundColor: isDark
                                ? projectHueFor(project.projectId).dark
                                : projectHueFor(project.projectId).light,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
