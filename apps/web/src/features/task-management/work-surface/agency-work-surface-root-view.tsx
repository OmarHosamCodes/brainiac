import type { ReactNode } from "react";

import type { AgencyWorkSurfaceView } from "@/features/task-management/agency-work";
import { agencyTimeLogPanelClass, agencyTimeTrackerPanelClass } from "@/features/shared/agency-ui";
import { AgencyTaskThreadShellView } from "@/features/task-management/task-thread/agency-task-thread-shell-view";
import { AgencyWorkSurfaceEmptyView } from "@/features/task-management/work-surface/agency-work-surface-empty-view";
import { AgencyWorkSurfaceErrorView } from "@/features/task-management/work-surface/agency-work-surface-error-view";
import { AgencyWorkSurfaceLayoutView } from "@/features/task-management/work-surface/agency-work-surface-layout-view";
import { AgencyWorkSurfaceLoadingView } from "@/features/task-management/work-surface/agency-work-surface-loading-view";
import { cn } from "@/lib/utils";

type AgencyWorkSurfaceRootViewProps = {
  view: AgencyWorkSurfaceView;
  trackerControl: ReactNode;
  content: ReactNode;
  taskRail?: ReactNode;
  threadOpen: { title: string } | null;
  onThreadBack: () => void;
};

export function AgencyWorkSurfaceRootView({
  view,
  trackerControl,
  content,
  taskRail,
  threadOpen,
  onThreadBack,
}: AgencyWorkSurfaceRootViewProps) {
  const threadCover = threadOpen ? (
    <AgencyTaskThreadShellView title={threadOpen.title} onBack={onThreadBack} />
  ) : null;

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
          contentPane={
            <div className={cn(agencyTimeLogPanelClass, "min-h-0")} aria-label="Time entries">
              {content}
            </div>
          }
          taskRail={taskRail}
          threadCover={threadCover}
        />
      );
      break;
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }

  return <div className="flex min-h-0 flex-1 flex-col">{surface}</div>;
}
