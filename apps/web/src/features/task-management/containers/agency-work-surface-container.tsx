import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { useAgencyWorkSurface } from "@/features/task-management/hooks/use-agency-work-surface";
import { AgencyMyTasksRail } from "@/features/task-management/my-tasks-rail/agency-my-tasks-rail";
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
      threadOpen={
        thread.openTaskId && thread.openTaskTitle ? { title: thread.openTaskTitle } : null
      }
      onThreadBack={thread.onBack}
    />
  );
}
