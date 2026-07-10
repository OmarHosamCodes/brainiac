import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";
import { useEffect } from "react";

import {
  subscribeAgencyLive,
  useAgencyLiveConnectionState,
} from "@/features/shared/live/agency-live-connection";

type UseAgencyJourneyLiveSyncOptions = {
  teamId: string;
};

export function useAgencyJourneyLiveSync({ teamId }: UseAgencyJourneyLiveSyncOptions) {
  const connectionState = useAgencyLiveConnectionState(teamId);

  useEffect(() => {
    if (!teamId) {
      return;
    }
    // Keeps the team live socket open on Work; handlers live in agency-live-handlers.
    return subscribeAgencyLive(teamId, (_event: AgencyLiveEvent) => {});
  }, [teamId]);

  return { connectionState };
}
