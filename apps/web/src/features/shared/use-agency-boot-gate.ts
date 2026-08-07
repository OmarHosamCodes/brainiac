import type { UseQueryResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  isShellAnimationReady,
  resetShellBoot,
  startShellBoot,
} from "@/features/app-shell/shell/shell-boot";
import { ensureAgencySegmentBootQueries } from "@/features/shared/agency-segment-boot";
import type { AgencySegmentId } from "@/features/shared/agency-segments";

type UseAgencyBootGateOptions = {
  segment: AgencySegmentId;
  teamId: string;
  userId: string;
  agencyEnabled: boolean;
  teamsCount: number;
  showAgencyUpsell: boolean;
  teamsQuery: Pick<UseQueryResult, "isPending">;
  billingQuery: Pick<UseQueryResult, "isPending">;
  searchParams: URLSearchParams;
};

export function useAgencyBootGate({
  segment,
  teamId,
  userId,
  agencyEnabled,
  teamsCount,
  showAgencyUpsell,
  teamsQuery,
  billingQuery,
  searchParams,
}: UseAgencyBootGateOptions) {
  const queryClient = useQueryClient();
  const [animationReady, setAnimationReady] = useState(() => isShellAnimationReady());

  const isTeamReady = teamsCount === 0 || Boolean(teamId);
  const isPageReady = !teamsQuery.isPending && !billingQuery.isPending && isTeamReady;
  const skipSegmentBoot = showAgencyUpsell || teamsCount === 0 || !agencyEnabled || !teamId;

  useEffect(() => {
    startShellBoot();
  }, []);

  useEffect(() => {
    if (!isPageReady || skipSegmentBoot) return;
    void ensureAgencySegmentBootQueries(queryClient, {
      segment,
      teamId,
      userId,
      searchParams,
    }).catch(() => undefined);
  }, [isPageReady, queryClient, searchParams.toString(), segment, skipSegmentBoot, teamId, userId]);

  useEffect(() => {
    if (animationReady) return;

    const intervalId = window.setInterval(() => {
      if (isShellAnimationReady()) {
        setAnimationReady(true);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [animationReady]);

  useEffect(() => resetShellBoot, []);

  const isBooting = !(isPageReady && animationReady);

  return { isBooting };
}
