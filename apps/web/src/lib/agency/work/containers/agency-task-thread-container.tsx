import { useCallback, useMemo, useState } from "react";

import { useAgencyTaskProgressThread } from "@/lib/agency/work/hooks/use-agency-task-progress-thread";
import { useAgencyTaskThread } from "@/lib/agency/work/hooks/use-agency-task-thread";
import type { AgencyTaskProject } from "@/lib/schemas/agency-work";
import { findProjectTaskInCache } from "@/lib/utils/agency-query-cache";
import { isJourneyTaskKind } from "@/lib/utils/agency-task-journey";

import { AgencyProjectJourneyStepperDialog } from "@/components/agency/journey/agency-project-journey-stepper-dialog";
import { TaskThreadProgressView } from "@/components/agency/work/task-thread/task-thread-progress-view";
import { TaskThreadView } from "@/components/agency/work/task-thread/task-thread-view";

type AgencyTaskThreadContainerProps = {
  teamId: string;
  taskId: string;
  projects: AgencyTaskProject[];
  onBack: () => void;
  onEditJourney?: () => void;
};

function AgencyTaskStandardThreadContainer({
  teamId,
  taskId,
  projects,
  onBack,
}: AgencyTaskThreadContainerProps) {
  const view = useAgencyTaskThread({ teamId, taskId, projects, onBack });
  return <TaskThreadView view={view} />;
}

function AgencyTaskProgressThreadContainer({
  teamId,
  taskId,
  projects,
  onBack,
  onEditJourney,
}: AgencyTaskThreadContainerProps) {
  const view = useAgencyTaskProgressThread({ teamId, taskId, projects, onBack });
  return <TaskThreadProgressView view={view} onEditJourney={onEditJourney} />;
}

export function AgencyTaskThreadContainer({
  teamId,
  taskId,
  projects,
  onBack,
  onEditJourney: onEditJourneyProp,
}: AgencyTaskThreadContainerProps) {
  const [journeyDialogOpen, setJourneyDialogOpen] = useState(false);
  const cachedTask = useMemo(() => findProjectTaskInCache(teamId, taskId), [teamId, taskId]);
  const taskKind = cachedTask?.taskKind ?? "standard";
  const projectId = cachedTask?.projectId ?? "";

  const openJourneyDialog = useCallback(() => {
    setJourneyDialogOpen(true);
    onEditJourneyProp?.();
  }, [onEditJourneyProp]);

  const thread = isJourneyTaskKind(taskKind) ? (
    <AgencyTaskProgressThreadContainer
      teamId={teamId}
      taskId={taskId}
      projects={projects}
      onBack={onBack}
      onEditJourney={openJourneyDialog}
    />
  ) : (
    <AgencyTaskStandardThreadContainer
      teamId={teamId}
      taskId={taskId}
      projects={projects}
      onBack={onBack}
    />
  );

  return (
    <>
      {thread}
      {projectId ? (
        <AgencyProjectJourneyStepperDialog
          teamId={teamId}
          projectId={projectId}
          open={journeyDialogOpen}
          onOpenChange={setJourneyDialogOpen}
        />
      ) : null}
    </>
  );
}
