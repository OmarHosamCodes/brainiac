import type { AgencyLiveEvent } from "@orch/api/routers/agency-ops/live/live";
import { useEffect, useRef } from "react";

import {
  agencyLiveHoldKey,
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
  const viewerUserIdRef = useRef(viewerUserId);
  viewerUserIdRef.current = viewerUserId;
  const holdKey = agencyLiveHoldKey(teamId, viewerUserId);

  useEffect(() => {
    if (!holdKey) {
      return;
    }
    // One ref-counted socket per team. Identity updates in place via AuthProvider;
    // holdKey drops only when unsigned or the team is gone.
    return subscribeAgencyLive(holdKey, (_event: AgencyLiveEvent) => {}, {
      viewerUserId: viewerUserIdRef.current,
    });
  }, [holdKey]);

  return { connectionState };
}
