import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";
import { useEffect } from "react";

import {
  subscribeAgencyLive,
  useAgencyLiveConnectionState,
} from "@/features/shared/live/agency-live-connection";
import { useAuthSession } from "@/lib/auth-session";

type UseAgencyJourneyLiveSyncOptions = {
  teamId: string;
};

export function useAgencyJourneyLiveSync({ teamId }: UseAgencyJourneyLiveSyncOptions) {
  const connectionState = useAgencyLiveConnectionState(teamId);
  const { user } = useAuthSession();
  const viewerUserId = user?.id ?? null;

  useEffect(() => {
    if (!teamId) {
      return;
    }
    // Keeps the team live socket open on Work; handlers live in agency-live-handlers.
    return subscribeAgencyLive(teamId, (_event: AgencyLiveEvent) => {}, { viewerUserId });
  }, [teamId, viewerUserId]);

  return { connectionState };
}
