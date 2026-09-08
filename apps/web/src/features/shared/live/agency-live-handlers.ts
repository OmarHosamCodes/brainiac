import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";

import { applyNotificationCreatedToCache } from "@/features/notifications/notifications-queries";
import { getQueryClient } from "@/lib/query-client";
import {
  patchActiveMembersFromLiveTimer,
  patchUpdatedProjectTaskInCache,
  refetchAgencyProjectJourneyQueries,
  refetchAgencyProjectScopedTaskListQueries,
} from "@/features/shared/agency-query-cache";
import { useAgencyTaskMessagesStore } from "@/features/task-management/stores/agency-task-messages";
import { useAgencyTimeTrackingStore } from "@/features/time-tracking/stores/agency-time-tracking";

export type AgencyLiveHandlerContext = {
  viewerUserId: string | null;
  isCurrent: () => boolean;
};

export function applyViewerTimerUpdated(
  event: Extract<AgencyLiveEvent, { type: "timer.updated" }>,
) {
  useAgencyTimeTrackingStore
    .getState()
    .reconcileActiveTimerFromLive(event.teamId, event.timer, event.updatedAt);
}

function handleTimerUpdated(
  event: Extract<AgencyLiveEvent, { type: "timer.updated" }>,
  context: AgencyLiveHandlerContext,
) {
  if (!context.isCurrent() || !context.viewerUserId) {
    return;
  }

  if (event.userId === context.viewerUserId) {
    if (!context.isCurrent()) {
      return;
    }
    applyViewerTimerUpdated(event);
    return;
  }

  if (!context.isCurrent()) {
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
  context: AgencyLiveHandlerContext,
) {
  if (!context.isCurrent() || !context.viewerUserId) {
    return;
  }
  if (event.notification.recipientUserId !== context.viewerUserId) {
    return;
  }
  if (!context.isCurrent()) {
    return;
  }

  const queryClient = getQueryClient();
  applyNotificationCreatedToCache(queryClient, event.teamId, event.notification);
}

function handleTaskMessageCreated(
  event: Extract<AgencyLiveEvent, { type: "taskMessage.created" }>,
) {
  useAgencyTaskMessagesStore.getState().applyLiveMessage(event.message);
}

export function handleAgencyLiveEvent(
  teamId: string,
  event: AgencyLiveEvent,
  context: AgencyLiveHandlerContext,
) {
  if (!context.isCurrent()) {
    return;
  }
  if (event.teamId !== teamId) {
    return;
  }

  switch (event.type) {
    case "timer.updated":
      handleTimerUpdated(event, context);
      break;
    case "task.updated":
      handleTaskUpdated(event);
      break;
    case "journey.step.updated":
      void handleJourneyStepUpdated(event);
      break;
    case "notification.created":
      handleNotificationCreated(event, context);
      break;
    case "taskMessage.created":
      handleTaskMessageCreated(event);
      break;
    default: {
      const _exhaustive: never = event;
      return _exhaustive;
    }
  }
}
