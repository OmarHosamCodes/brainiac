import type { UseQueryResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import {
  AGENCY_BOOT_TIMEOUT_MS,
  isAgencyAnimationReady,
  resetAgencyBoot,
  startAgencyBoot,
} from "@/lib/agency/agency-boot";
import { ensureAgencySegmentBootQueries } from "@/lib/agency/agency-segment-boot";
import type { AgencySegmentId } from "@/lib/agency-segments";

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
  const [segmentBootDone, setSegmentBootDone] = useState(false);
  const [animationReady, setAnimationReady] = useState(() => isAgencyAnimationReady());

  const isTeamReady = teamsCount === 0 || Boolean(teamId);
  const isPageReady =
    !teamsQuery.isPending && !billingQuery.isPending && isTeamReady;
  const skipSegmentBoot =
    showAgencyUpsell || teamsCount === 0 || !agencyEnabled || !teamId;

  useEffect(() => {
    startAgencyBoot();
  }, []);

  useEffect(() => {
    if (!isPageReady) {
      setSegmentBootDone(false);
      return;
    }

    if (skipSegmentBoot) {
      setSegmentBootDone(true);
      return;
    }

    let cancelled = false;
    setSegmentBootDone(false);

    const timeoutId = window.setTimeout(() => {
      if (!cancelled) setSegmentBootDone(true);
    }, AGENCY_BOOT_TIMEOUT_MS);

    void ensureAgencySegmentBootQueries(queryClient, {
      segment,
      teamId,
      userId,
      searchParams,
    })
      .then(() => {
        if (!cancelled) setSegmentBootDone(true);
      })
      .catch(() => {
        if (!cancelled) setSegmentBootDone(true);
      })
      .finally(() => window.clearTimeout(timeoutId));

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    agencyEnabled,
    isPageReady,
    queryClient,
    searchParams.toString(),
    segment,
    skipSegmentBoot,
    teamId,
    userId,
  ]);

  useEffect(() => {
    if (animationReady) return;

    const intervalId = window.setInterval(() => {
      if (isAgencyAnimationReady()) {
        setAnimationReady(true);
      }
    }, 100);

    return () => window.clearInterval(intervalId);
  }, [animationReady]);

  useEffect(() => resetAgencyBoot, []);

  const isBooting = !(isPageReady && segmentBootDone && animationReady);

  return { isBooting };
}
