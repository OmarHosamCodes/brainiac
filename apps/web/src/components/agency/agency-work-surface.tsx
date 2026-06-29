import { AlertTriangle, Briefcase, Building2, FolderKanban } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgencyTaskList } from "@/components/agency/agency-task-list";
import { AgencyTaskThread } from "@/components/agency/agency-task-thread";
import { AgencyTimeEntriesLog } from "@/components/agency/agency-time-entries-log";
import { AgencyTimeTracker } from "@/components/agency/agency-time-tracker";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencySegmentId } from "@/lib/agency-segments";
import { useAgencyActiveTimerQuery, useAgencyProjectsQuery } from "@/lib/queries/agency";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTaskRailTrackingStripClass,
  agencyTimePaneClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { shellLoadingPanelClass } from "@/lib/utils/app-shell-ui";

type AgencyWorkSurfaceProps = {
  teamId: string;
  onSelectProject: (projectId: string) => void;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function AgencyWorkSurface({
  teamId,
  onSelectProject,
  onSegmentChange,
}: AgencyWorkSurfaceProps) {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [mobilePane, setMobilePane] = useState<"tasks" | "time">("tasks");
  const [taskRailCollapsed, setTaskRailCollapsed] = useState(false);
  const [trackingNow, setTrackingNow] = useState(Date.now());

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const activeTimerQuery = useAgencyActiveTimerQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  const showEmptyProjects =
    projectsQuery.isSuccess && projects.length === 0 && !projectsQuery.isFetching;

  const mobileTrackingLabel = useMemo(() => {
    if (!activeTimer || activeTimer.teamId !== teamId) return null;
    const startedAt = new Date(activeTimer.startedAt).getTime();
    if (Number.isNaN(startedAt)) return null;
    const elapsedSeconds = Math.max(0, Math.floor((trackingNow - startedAt) / 1_000));
    return formatDuration(elapsedSeconds);
  }, [activeTimer, teamId, trackingNow]);

  useEffect(() => {
    if (!activeTimer || activeTimer.teamId !== teamId) return;
    const tickerHandle = setInterval(() => setTrackingNow(Date.now()), 1_000);
    return () => clearInterval(tickerHandle);
  }, [activeTimer, teamId]);

  useEffect(() => {
    setSelectedTaskId("");
    setMobilePane("tasks");
  }, [teamId]);

  function openTimePane() {
    setSelectedTaskId("");
    setMobilePane("time");
  }

  if (projectsQuery.isError) {
    return (
      <div className={agencyErrorPanelClass} role="alert">
        <AlertTriangle className="mx-auto size-5 text-error" />
        <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load work data.</p>
        <p className="mt-1 text-xs text-muted">
          {getErrorMessage(projectsQuery.error, "Try refreshing.")}
        </p>
        <Button
          variant="secondary"
          size="sm"
          className="mt-3"
          onClick={() => void projectsQuery.refetch()}
        >
          Retry
        </Button>
      </div>
    );
  }

  if (projectsQuery.isPending) {
    return (
      <div
        className={[shellLoadingPanelClass, "flex h-full min-h-0 flex-col gap-4"].join(" ")}
        aria-busy="true"
        aria-label="Loading work data"
      >
        <Skeleton className="h-10 w-full rounded-xl lg:hidden" />
        <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row">
          <Skeleton className="h-full min-h-48 w-full rounded-xl lg:w-[28rem] lg:shrink-0" />
          <Skeleton className="h-full min-h-48 flex-1 rounded-xl" />
        </div>
      </div>
    );
  }

  if (showEmptyProjects) {
    return (
      <div className={agencyEmptyPanelClass}>
        <Briefcase className="mx-auto size-7 text-muted" />
        <p className="mt-4 text-sm font-bold text-highlighted">No projects yet.</p>
        <p className="mt-1 text-xs text-muted">
          Go to Clients to add a client, then Projects to create your first project and start
          tracking work and time.
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          <Button variant="secondary" size="sm" onClick={() => onSegmentChange("clients")}>
            <Building2 className="size-4" />
            Add client
          </Button>
          <Button variant="secondary" size="sm" onClick={() => onSegmentChange("projects")}>
            <FolderKanban className="size-4" />
            New project
          </Button>
        </div>
      </div>
    );
  }

  const showMobileTimerStrip = Boolean(mobileTrackingLabel);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4 overflow-hidden lg:flex-row">
      {!selectedTaskId ? (
        <div
          className="inline-flex rounded-full border border-default bg-elevated p-1 lg:hidden"
          role="tablist"
          aria-label="Work panes"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === "tasks"}
            className={[
              "rounded-full px-3 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none",
              mobilePane === "tasks" ? "bg-default text-highlighted" : "text-muted",
            ].join(" ")}
            onClick={() => setMobilePane("tasks")}
          >
            Tasks
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobilePane === "time"}
            className={[
              "rounded-full px-3 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none",
              mobilePane === "time" ? "bg-default text-highlighted" : "text-muted",
            ].join(" ")}
            onClick={() => openTimePane()}
          >
            Time
          </button>
        </div>
      ) : null}

      {showMobileTimerStrip ? (
        <div className={["lg:hidden", agencyTaskRailTrackingStripClass].join(" ")}>
          <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
          <span className={["flex-1 font-mono tabular-nums", agencyMetricClass].join(" ")}>
            Tracking · {mobileTrackingLabel}
          </span>
          <button
            type="button"
            className={[
              "shrink-0 text-xs font-semibold text-primary underline-offset-2 hover:underline",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
            ].join(" ")}
            onClick={openTimePane}
          >
            View timer
          </button>
        </div>
      ) : null}

      <div
        className={[
          "min-h-0 min-w-0 transition-[width,max-width] duration-200 ease-out motion-reduce:transition-none lg:sticky lg:top-0 lg:h-full lg:flex-none lg:self-start",
          taskRailCollapsed ? "lg:w-[5.5rem] lg:max-w-[5.5rem]" : "lg:w-[28rem] lg:max-w-[28rem]",
          selectedTaskId ? "hidden lg:block" : "",
          !selectedTaskId && mobilePane !== "tasks" ? "hidden lg:block" : "",
        ].join(" ")}
      >
        <AgencyTaskList
          teamId={teamId}
          projects={projects}
          selectedTaskId={selectedTaskId}
          collapsed={taskRailCollapsed}
          onSelect={setSelectedTaskId}
          onCollapsedChange={setTaskRailCollapsed}
          onSelectProject={onSelectProject}
        />
      </div>

      {selectedTaskId ? (
        <div className="min-h-0 min-w-0 flex-1 lg:h-full">
          <AgencyTaskThread
            key={selectedTaskId}
            teamId={teamId}
            taskId={selectedTaskId}
            projects={projects}
            onBack={() => setSelectedTaskId("")}
          />
        </div>
      ) : (
        <div
          className={[
            agencyTimePaneClass,
            "min-h-0 min-w-0 flex-1 overflow-hidden",
            mobilePane !== "time" ? "hidden lg:flex" : "flex",
          ].join(" ")}
        >
          <AgencyTimeTracker teamId={teamId} />
          <AgencyTimeEntriesLog teamId={teamId} />
        </div>
      )}
    </div>
  );
}
