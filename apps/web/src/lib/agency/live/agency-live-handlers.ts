import type { AgencyLiveEvent } from "@brainiac/api/routers/agency-ops/live";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";
import { getQueryClient } from "@/lib/query-client";
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

function handleNotificationCreated(
  event: Extract<AgencyLiveEvent, { type: "notification.created" }>,
) {
  void getViewerUserId().then((viewerUserId) => {
    if (!viewerUserId || event.notification.recipientUserId !== viewerUserId) return;

    const queryClient = getQueryClient();
    const teamId = event.teamId;

    queryClient.setQueryData(orpc.notifications.list.queryKey({ input: { teamId, limit: 40 } }), (current) => {
      if (!current || !Array.isArray(current.items)) {
        return current;
      }

      const withoutDuplicate = current.items.filter((item) => item.id !== event.notification.id);
      return {
        ...current,
        items: [event.notification, ...withoutDuplicate].slice(0, 40),
      };
    });

    queryClient.setQueryData(
      orpc.notifications.unreadCount.queryKey({ input: { teamId } }),
      (current) => {
        const base =
          current && typeof current === "object" && "count" in current
            ? Number(current.count)
            : 0;
        if (event.notification.seenAt) return { count: base };
        return { count: base + 1 };
      },
    );
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
