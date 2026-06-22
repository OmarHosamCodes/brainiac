import { AlertTriangle, Briefcase } from "lucide-react";
import { useState } from "react";

import { AgencyTaskList } from "@/components/agency/agency-task-list";
import { AgencyTaskThread } from "@/components/agency/agency-task-thread";
import { AgencyTimeEntriesLog } from "@/components/agency/agency-time-entries-log";
import { AgencyTimeTracker } from "@/components/agency/agency-time-tracker";
import { Button } from "@/components/ui/button";
import { useAgencyProjectsQuery } from "@/lib/queries/agency";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyTimePaneClass,
} from "@/lib/utils/agency-ui";
import { getErrorMessage } from "@/lib/utils/get-error-message";

type AgencyWorkSurfaceProps = {
  teamId: string;
  onSelectProject: (projectId: string) => void;
};

export function AgencyWorkSurface({ teamId, onSelectProject }: AgencyWorkSurfaceProps) {
  const [selectedTaskId, setSelectedTaskId] = useState("");
  const [mobilePane, setMobilePane] = useState<"tasks" | "time">("tasks");
  const [taskRailCollapsed, setTaskRailCollapsed] = useState(false);

  const projectsQuery = useAgencyProjectsQuery(teamId);
  const projects = projectsQuery.data?.items ?? [];
  const showEmptyProjects =
    projectsQuery.isSuccess && projects.length === 0 && !projectsQuery.isFetching;

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

  if (showEmptyProjects) {
    return (
      <div className={agencyEmptyPanelClass}>
        <Briefcase className="mx-auto size-7 text-muted" />
        <p className="mt-4 text-sm font-bold text-highlighted">No projects yet.</p>
        <p className="mt-1 text-xs text-muted">
          Add a client and project to start tracking work and time.
        </p>
      </div>
    );
  }

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
              "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
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
              "rounded-full px-3 py-1 text-[11px] font-bold transition-colors",
              mobilePane === "time" ? "bg-default text-highlighted" : "text-muted",
            ].join(" ")}
            onClick={() => setMobilePane("time")}
          >
            Time
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
