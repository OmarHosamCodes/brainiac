import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { useAgencyJourneyLiveSync } from "@/features/task-management/hooks/use-agency-journey-live-sync";
import { useAgencyWorkSurface } from "@/features/task-management/hooks/use-agency-work-surface";
import { AgencyWorkSurfaceTaskPane } from "@/features/task-management/containers/agency-work-surface-task-pane-container";
import type { AgencyWorkSurfaceView } from "@/features/task-management/agency-work";

import { AgencyTimeEntriesLog } from "@/features/time-tracking/entries/agency-time-entries-log";
import { AgencyTimeTracker } from "@/features/time-tracking/agency-time-tracker";
import { AgencyWorkSurfaceEmptyView } from "@/features/task-management/work-surface/agency-work-surface-empty-view";
import { AgencyWorkSurfaceErrorView } from "@/features/task-management/work-surface/agency-work-surface-error-view";
import { AgencyWorkSurfaceLayoutView } from "@/features/task-management/work-surface/agency-work-surface-layout-view";
import { AgencyWorkSurfaceLoadingView } from "@/features/task-management/work-surface/agency-work-surface-loading-view";
import { AgencyWorkSurfaceTabsView } from "@/features/task-management/work-surface/agency-work-surface-tabs-view";
import { agencyTimeLogPanelClass, agencyTimeTrackerPanelClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceProps = {
  teamId: string;
  onSelectProject: (projectId: string) => void;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

function renderWorkSurfaceContent(view: Extract<AgencyWorkSurfaceView, { status: "ready" }>) {
  switch (view.activeTab) {
    case "sessions":
      return <AgencyTimeEntriesLog teamId={view.teamId} />;
    case "my-tasks":
    case "done":
    case "delegated":
      return (
        <AgencyWorkSurfaceTaskPane
          tab={view.activeTab}
          teamId={view.teamId}
          projects={view.projects}
          selectedTaskId={view.selectedTaskId}
          onSelectTask={view.onSelectTask}
          onSelectProject={view.onSelectProject}
        />
      );
    default: {
      const _exhaustive: never = view.activeTab;
      return _exhaustive;
    }
  }
}

function renderWorkSurfaceView(view: AgencyWorkSurfaceView) {
  switch (view.status) {
    case "loading":
      return <AgencyWorkSurfaceLoadingView />;
    case "error":
      return <AgencyWorkSurfaceErrorView message={view.message} onRetry={view.onRetry} />;
    case "empty":
      return (
        <AgencyWorkSurfaceEmptyView
          onGoToClients={view.onGoToClients}
          onGoToProjects={view.onGoToProjects}
        />
      );
    case "ready": {
      return (
        <AgencyWorkSurfaceLayoutView
          trackerPane={
            <div className={agencyTimeTrackerPanelClass}>
              <AgencyTimeTracker teamId={view.teamId} />
            </div>
          }
          tabBar={
            <AgencyWorkSurfaceTabsView
              teamId={view.teamId}
              projects={view.projects}
              activeTab={view.activeTab}
              onTabChange={view.onTabChange}
            />
          }
          contentPane={
            <div
              role="tabpanel"
              id={`agency-work-panel-${view.activeTab}`}
              aria-labelledby={`agency-work-tab-${view.activeTab}`}
              className={cn(agencyTimeLogPanelClass, "min-h-0 rounded-t-none border-t-0")}
            >
              {renderWorkSurfaceContent(view)}
            </div>
          }
        />
      );
    }
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

export function AgencyWorkSurface({
  teamId,
  onSelectProject,
  onSegmentChange,
}: AgencyWorkSurfaceProps) {
  useAgencyJourneyLiveSync({ teamId });
  const view = useAgencyWorkSurface({ teamId, onSelectProject, onSegmentChange });
  return <div className="flex min-h-0 flex-1 flex-col pb-4">{renderWorkSurfaceView(view)}</div>;
}
