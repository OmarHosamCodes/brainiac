import type { AgencyLiveEvent } from "@brainiac/api/routers/agency-ops/live";

import { authClient } from "@/lib/auth-client";
import {
  patchActiveMembersFromLiveTimer,
  patchActiveTimerInCache,
  patchUpdatedProjectTaskInCache,
  refetchAgencyProjectJourneyQueries,
  refetchAgencyProjectScopedTaskListQueries,
} from "@/lib/utils/agency-query-cache";

async function getViewerUserId(): Promise<string | null> {
  const session = await authClient.getSession();
  return session.data?.user?.id ?? null;
}

async function handleTimerUpdated(event: Extract<AgencyLiveEvent, { type: "timer.updated" }>) {
  const viewerUserId = await getViewerUserId();

  if (viewerUserId && event.userId === viewerUserId) {
    patchActiveTimerInCache(event.teamId, event.timer);
    return;
  }

  patchActiveMembersFromLiveTimer(event.teamId, event.timer, event.userId);
}

async function handleJourneyStepUpdated(
  event: Extract<AgencyLiveEvent, { type: "journey.step.updated" }>,
) {
  await Promise.all([
    refetchAgencyProjectJourneyQueries(event.teamId, event.projectId),
    refetchAgencyProjectScopedTaskListQueries(event.teamId, event.projectId),
  ]);
}

function handleTaskUpdated(event: Extract<AgencyLiveEvent, { type: "task.updated" }>) {
  patchUpdatedProjectTaskInCache(event.teamId, event.task);
}

export function handleAgencyLiveEvent(_teamId: string, event: AgencyLiveEvent) {
  switch (event.type) {
    case "timer.updated":
      void handleTimerUpdated(event);
      break;
    case "task.updated":
      handleTaskUpdated(event);
      break;
    case "journey.step.updated":
      void handleJourneyStepUpdated(event);
      break;
    case "taskMessage.created":
      break;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
