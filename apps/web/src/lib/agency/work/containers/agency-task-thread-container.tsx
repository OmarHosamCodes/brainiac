import { useCallback, useMemo, useState } from "react";

import { useAgencyTaskThread } from "@/lib/agency/work/hooks/use-agency-task-thread";
import { useAgencyProjectJourneyQuery } from "@/lib/queries/agency";
import type { AgencyTaskProject } from "@/lib/schemas/agency-work";
import { findProjectTaskInCache } from "@/lib/utils/agency-query-cache";
import { isJourneyTaskKind, resolveFocusedJourneyStep } from "@/lib/utils/agency-task-journey";

import { AgencyProjectJourneyStepperDialog } from "@/components/agency/journey/agency-project-journey-stepper-dialog";
import { TaskThreadView } from "@/components/agency/work/task-thread/task-thread-view";

type AgencyTaskThreadContainerProps = {
  teamId: string;
  taskId: string;
  projects: AgencyTaskProject[];
  onBack: () => void;
  onEditJourney?: () => void;
};

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
  const isJourneyTask = isJourneyTaskKind(taskKind);
  const journeyQuery = useAgencyProjectJourneyQuery(teamId, isJourneyTask ? projectId : "");
  const focusedStep = useMemo(() => {
    if (!isJourneyTask || !cachedTask) return null;
    return resolveFocusedJourneyStep(journeyQuery.data, cachedTask);
  }, [cachedTask, isJourneyTask, journeyQuery.data]);
  const journey = useMemo(() => {
    if (!isJourneyTask || !projectId) return undefined;
    return {
      teamId,
      projectId,
      selectedStepId: focusedStep?.id ?? null,
      timerTaskId: focusedStep?.taskId ?? taskId,
      timerTaskTitle: focusedStep?.label,
    };
  }, [focusedStep, isJourneyTask, projectId, taskId, teamId]);

  const openJourneyDialog = useCallback(() => {
    setJourneyDialogOpen(true);
    onEditJourneyProp?.();
  }, [onEditJourneyProp]);

  const view = useAgencyTaskThread({ teamId, taskId, projects, onBack });

  return (
    <>
      <TaskThreadView
        view={view}
        journey={journey}
        onEditJourney={isJourneyTask ? openJourneyDialog : undefined}
      />
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
