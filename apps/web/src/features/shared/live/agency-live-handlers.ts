import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";

import { authClient } from "@/lib/auth-client";
import { applyNotificationCreatedToCache } from "@/features/notifications/notifications-queries";
import { getQueryClient } from "@/lib/query-client";
import {
  patchActiveMembersFromLiveTimer,
  patchActiveTimerInCache,
  patchUpdatedProjectTaskInCache,
  refetchAgencyProjectJourneyQueries,
  refetchAgencyProjectScopedTaskListQueries,
} from "@/features/shared/agency-query-cache";

async function getViewerUserId(): Promise<string | null> {
  try {
    const session = await authClient.getSession();
    return session.data?.user?.id ?? null;
  } catch {
    // Session fetch can fail transiently (offline / network). Live handlers must
    // degrade without becoming an unhandledrejection.
    return null;
  }
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

function handleNotificationCreated(
  event: Extract<AgencyLiveEvent, { type: "notification.created" }>,
) {
  void getViewerUserId().then((viewerUserId) => {
    if (!viewerUserId || event.notification.recipientUserId !== viewerUserId) return;

    const queryClient = getQueryClient();
    const teamId = event.teamId;

    applyNotificationCreatedToCache(queryClient, teamId, event.notification);
  });
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
    case "notification.created":
      handleNotificationCreated(event);
      break;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
