import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { AgencyTaskThreadContainer } from "@/features/task-management/containers/agency-task-thread-container";
import { useAgencyWorkSurface } from "@/features/task-management/hooks/use-agency-work-surface";
import { AgencyWorkSurfaceTasksBoardContainer } from "@/features/task-management/work-surface/containers/agency-work-surface-tasks-board-container";

import { AgencyTimeEntriesLog } from "@/features/time-tracking/entries/agency-time-entries-log";
import { AgencyTimeTracker } from "@/features/time-tracking/agency-time-tracker";
import { AgencyWorkSurfaceCreateTaskPopover } from "@/features/task-management/work-surface/agency-work-surface-create-task-popover";
import { AgencyWorkSurfaceRootView } from "@/features/task-management/work-surface/agency-work-surface-root-view";

type AgencyWorkSurfaceProps = {
  teamId: string;
  onSelectProject: (projectId: string) => void;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

function renderWorkSurfaceContent(
  view: Extract<ReturnType<typeof useAgencyWorkSurface>, { status: "ready" }>,
) {
  switch (view.activeTab) {
    case "sessions":
      return <AgencyTimeEntriesLog teamId={view.teamId} />;
    case "tasks":
      if (view.selectedTaskId) {
        return (
          <AgencyTaskThreadContainer
            teamId={view.teamId}
            taskId={view.selectedTaskId}
            projects={view.projects}
            onBack={() => view.onSelectTask("")}
          />
        );
      }
      return (
        <AgencyWorkSurfaceTasksBoardContainer
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

export function AgencyWorkSurface({
  teamId,
  onSelectProject,
  onSegmentChange,
}: AgencyWorkSurfaceProps) {
  const view = useAgencyWorkSurface({ teamId, onSelectProject, onSegmentChange });
  const readyView = view.status === "ready" ? view : null;

  return (
    <AgencyWorkSurfaceRootView
      view={view}
      trackerControl={readyView ? <AgencyTimeTracker teamId={readyView.teamId} /> : null}
      content={readyView ? renderWorkSurfaceContent(readyView) : null}
      createTaskControl={
        readyView ? (
          <AgencyWorkSurfaceCreateTaskPopover
            teamId={readyView.teamId}
            projects={readyView.projects}
          />
        ) : null
      }
    />
  );
}
