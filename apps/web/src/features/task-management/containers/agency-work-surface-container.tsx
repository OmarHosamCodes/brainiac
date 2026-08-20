import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { useAgencyWorkSurface } from "@/features/task-management/hooks/use-agency-work-surface";
import { AgencyMyTasksRail } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail";
import { AgencyTaskThread } from "@/features/task-management/task-thread/agency-task-thread";
import { AgencyTimeEntriesLog } from "@/features/time-tracking/entries/agency-time-entries-log";
import { AgencyTimeTracker } from "@/features/time-tracking/agency-time-tracker";
import { AgencyWorkSurfaceRootView } from "@/features/task-management/work-surface/agency-work-surface-root-view";

type AgencyWorkSurfaceProps = {
  teamId: string;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

export function AgencyWorkSurface({ teamId, onSegmentChange }: AgencyWorkSurfaceProps) {
  const { view, thread } = useAgencyWorkSurface({ teamId, onSegmentChange });
  const readyView = view.status === "ready" ? view : null;

  return (
    <AgencyWorkSurfaceRootView
      view={view}
      trackerControl={readyView ? <AgencyTimeTracker teamId={readyView.teamId} /> : null}
      content={readyView ? <AgencyTimeEntriesLog teamId={readyView.teamId} /> : null}
      taskRail={
        readyView ? (
          <AgencyMyTasksRail
            teamId={readyView.teamId}
            openThreadTaskId={thread.openTaskId}
            onTitleOpenThread={thread.onTitleOpenThread}
          />
        ) : null
      }
      threadCover={
        readyView && thread.openTaskId && thread.openTaskMeta ? (
          <AgencyTaskThread
            teamId={readyView.teamId}
            taskId={thread.openTaskId}
            title={thread.openTaskMeta.title}
            projectId={thread.openTaskMeta.projectId}
            projectName={thread.openTaskMeta.projectName}
            assignedToTeam={thread.openTaskMeta.assignedToTeam}
            assignees={thread.openTaskMeta.assignees}
            onBack={thread.onBack}
          />
        ) : null
      }
      onThreadCoverShowComplete={thread.onCoverShowComplete}
    />
  );
}
