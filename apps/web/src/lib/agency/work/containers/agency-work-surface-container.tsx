import type { AgencySegmentId } from "@/lib/agency-segments";
import { useAgencyWorkSurface } from "@/lib/agency/work/hooks/use-agency-work-surface";
import type { AgencyWorkSurfaceView } from "@/lib/schemas/agency-work";

import { AgencyTaskList } from "@/components/agency/agency-task-list";
import { AgencyTaskThread } from "@/components/agency/agency-task-thread";
import { AgencyTimeEntriesLog } from "@/components/agency/agency-time-entries-log";
import { AgencyTimeTracker } from "@/components/agency/agency-time-tracker";
import { AgencyWorkSurfaceEmptyView } from "@/components/agency/work/work-surface/agency-work-surface-empty-view";
import { AgencyWorkSurfaceErrorView } from "@/components/agency/work/work-surface/agency-work-surface-error-view";
import { AgencyWorkSurfaceLayoutView } from "@/components/agency/work/work-surface/agency-work-surface-layout-view";
import { AgencyWorkSurfaceLoadingView } from "@/components/agency/work/work-surface/agency-work-surface-loading-view";
import { AgencyWorkSurfaceMobileTabsView } from "@/components/agency/work/work-surface/agency-work-surface-mobile-tabs-view";
import { AgencyWorkSurfaceTimerStripView } from "@/components/agency/work/work-surface/agency-work-surface-timer-strip-view";

type AgencyWorkSurfaceProps = {
  teamId: string;
  onSelectProject: (projectId: string) => void;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

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
      const showMobileTimerStrip = Boolean(view.mobileTrackingLabel);
      return (
        <AgencyWorkSurfaceLayoutView
          selectedTaskId={view.selectedTaskId}
          mobilePane={view.mobilePane}
          taskRailCollapsed={view.taskRailCollapsed}
          mobileTabs={
            <AgencyWorkSurfaceMobileTabsView
              mobilePane={view.mobilePane}
              onMobilePaneChange={view.onMobilePaneChange}
              onOpenTimePane={view.onOpenTimePane}
            />
          }
          timerStrip={
            showMobileTimerStrip && view.mobileTrackingLabel ? (
              <AgencyWorkSurfaceTimerStripView
                mobileTrackingLabel={view.mobileTrackingLabel}
                onOpenTimePane={view.onOpenTimePane}
              />
            ) : null
          }
          taskRail={
            <AgencyTaskList
              teamId={view.teamId}
              projects={view.projects}
              selectedTaskId={view.selectedTaskId}
              collapsed={view.taskRailCollapsed}
              onSelect={view.onSelectTask}
              onCollapsedChange={view.onCollapsedChange}
              onSelectProject={view.onSelectProject}
            />
          }
          taskThread={
            view.selectedTaskId ? (
              <AgencyTaskThread
                key={view.selectedTaskId}
                teamId={view.teamId}
                taskId={view.selectedTaskId}
                projects={view.projects}
                onBack={() => view.onSelectTask("")}
              />
            ) : null
          }
          timePane={
            <>
              <div className="sticky top-0 z-10 shrink-0 border-b border-default bg-default/90 backdrop-blur-sm supports-[backdrop-filter]:bg-default/80">
                <AgencyTimeTracker teamId={view.teamId} />
              </div>
              <AgencyTimeEntriesLog teamId={view.teamId} />
            </>
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
  const view = useAgencyWorkSurface({ teamId, onSelectProject, onSegmentChange });
  return renderWorkSurfaceView(view);
}
