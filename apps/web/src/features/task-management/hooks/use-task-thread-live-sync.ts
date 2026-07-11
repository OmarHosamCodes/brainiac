import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";
import { useEffect, useRef } from "react";

import {
  subscribeAgencyLive,
  useAgencyLiveConnectionState,
} from "@/features/shared/live/agency-live-connection";
import { useAgencyTaskMessagesStore } from "@/features/task-management/stores/agency-task-messages";

type UseTaskThreadLiveSyncOptions = {
  teamId: string;
  taskId: string;
};

export function useTaskThreadLiveSync({ teamId, taskId }: UseTaskThreadLiveSyncOptions) {
  const connectionState = useAgencyLiveConnectionState(teamId);
  const hadLiveConnectionRef = useRef(false);
  const prevConnectionStateRef = useRef(connectionState);

  useEffect(() => {
    const reconnectedToLive =
      connectionState === "live" && prevConnectionStateRef.current !== "live";

    if (reconnectedToLive && hadLiveConnectionRef.current && teamId && taskId) {
      void useAgencyTaskMessagesStore.getState().invalidateTaskMessages(teamId, taskId);
    }

    if (connectionState === "live") {
      hadLiveConnectionRef.current = true;
    }

    prevConnectionStateRef.current = connectionState;
  }, [connectionState, teamId, taskId]);

  useEffect(() => {
    if (!teamId || !taskId) {
      return;
    }

    return subscribeAgencyLive(teamId, (event: AgencyLiveEvent) => {
      if (event.type !== "taskMessage.created") {
        return;
      }
      if (event.taskId !== taskId) {
        return;
      }
      useAgencyTaskMessagesStore.getState().applyLiveMessage(teamId, taskId, event.message);
    });
  }, [teamId, taskId]);

  return { connectionState };
}
