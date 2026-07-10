import type { ReactNode } from "react";

import type { AgencyWorkSurfaceView } from "@/features/task-management/agency-work";
import { agencyTimeLogPanelClass, agencyTimeTrackerPanelClass } from "@/features/shared/agency-ui";
import { AgencyWorkSurfaceEmptyView } from "@/features/task-management/work-surface/agency-work-surface-empty-view";
import { AgencyWorkSurfaceErrorView } from "@/features/task-management/work-surface/agency-work-surface-error-view";
import { AgencyWorkSurfaceLayoutView } from "@/features/task-management/work-surface/agency-work-surface-layout-view";
import { AgencyWorkSurfaceLoadingView } from "@/features/task-management/work-surface/agency-work-surface-loading-view";
import { AgencyWorkSurfaceTabsView } from "@/features/task-management/work-surface/agency-work-surface-tabs-view";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceRootViewProps = {
  view: AgencyWorkSurfaceView;
  trackerControl: ReactNode;
  content: ReactNode;
  createTaskControl: ReactNode;
};

export function AgencyWorkSurfaceRootView({
  view,
  trackerControl,
  content,
  createTaskControl,
}: AgencyWorkSurfaceRootViewProps) {
  let surface: ReactNode;

  switch (view.status) {
    case "loading":
      surface = <AgencyWorkSurfaceLoadingView />;
      break;
    case "error":
      surface = <AgencyWorkSurfaceErrorView message={view.message} onRetry={view.onRetry} />;
      break;
    case "empty":
      surface = (
        <AgencyWorkSurfaceEmptyView
          onGoToClients={view.onGoToClients}
          onGoToProjects={view.onGoToProjects}
        />
      );
      break;
    case "ready":
      surface = (
        <AgencyWorkSurfaceLayoutView
          trackerPane={<div className={agencyTimeTrackerPanelClass}>{trackerControl}</div>}
          tabBar={
            <AgencyWorkSurfaceTabsView
              activeTab={view.activeTab}
              onTabChange={view.onTabChange}
              createTaskControl={createTaskControl}
            />
          }
          contentPane={
            <div
              role="tabpanel"
              id={`agency-work-panel-${view.activeTab}`}
              aria-labelledby={`agency-work-tab-${view.activeTab}`}
              className={cn(agencyTimeLogPanelClass, "min-h-0 rounded-t-none border-t-0")}
            >
              {content}
            </div>
          }
        />
      );
      break;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }

  return <div className="flex min-h-0 flex-1 flex-col pb-4">{surface}</div>;
}
