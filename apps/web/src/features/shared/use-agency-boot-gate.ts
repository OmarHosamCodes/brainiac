import type { UseQueryResult } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { useShellAnimationHold } from "@/features/app-shell/shell/use-shell-boot-gate";
import { ensureAgencySegmentBootQueries } from "@/features/shared/agency-segment-boot";
import { agencySegmentLabel, type AgencySegmentId } from "@/features/shared/agency-segments";

type UseAgencyBootGateOptions = {
  segment: AgencySegmentId;
  teamId: string;
  userId: string;
  agencyEnabled: boolean;
  teamsCount: number;
  showAgencyUpsell: boolean;
  teamsQuery: Pick<UseQueryResult, "isPending">;
  billingQuery: Pick<UseQueryResult, "isPending">;
  pathname: string;
};

export function agencySegmentBootKey(input: {
  skipSegmentBoot: boolean;
  teamId: string;
  segment: AgencySegmentId;
  pathname: string;
}): string {
  if (input.skipSegmentBoot) return "skip";
  return `${input.teamId}:${input.segment}:${input.pathname}`;
}

export function isAgencySegmentBootReady(readyKey: string | null, bootKey: string): boolean {
  return readyKey === bootKey;
}

export function agencyBootLabel(segment: AgencySegmentId, pathname: string): string {
  const path = pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname;
  if (/^\/agency\/clients\/[^/]+$/.test(path)) return "Opening client";
  if (/^\/agency\/projects\/[^/]+$/.test(path)) return "Opening project";
  if (/^\/agency\/reports\/[^/]+$/.test(path)) return "Opening report";
  if (segment === "work") return "Opening Tracker";
  return `Opening ${agencySegmentLabel(segment)}`;
}

export function useAgencyBootGate({
  segment,
  teamId,
  userId,
  agencyEnabled,
  teamsCount,
  showAgencyUpsell,
  teamsQuery,
  billingQuery,
  pathname,
}: UseAgencyBootGateOptions) {
  const queryClient = useQueryClient();
  const animationReady = useShellAnimationHold();
  const [readyKey, setReadyKey] = useState<string | null>(null);

  const isTeamReady = teamsCount === 0 || Boolean(teamId);
  const isPageReady = !teamsQuery.isPending && !billingQuery.isPending && isTeamReady;
  const skipSegmentBoot = showAgencyUpsell || teamsCount === 0 || !agencyEnabled || !teamId;
  const bootKey = agencySegmentBootKey({ skipSegmentBoot, teamId, segment, pathname });

  useEffect(() => {
    if (!isPageReady) return;
    if (skipSegmentBoot) {
      setReadyKey("skip");
      return;
    }

    let cancelled = false;
    void ensureAgencySegmentBootQueries(queryClient, {
      segment,
      teamId,
      userId,
      pathname,
    })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReadyKey(bootKey);
      });

    return () => {
      cancelled = true;
    };
  }, [bootKey, isPageReady, pathname, queryClient, segment, skipSegmentBoot, teamId, userId]);

  const isBooting = !(isPageReady && animationReady && isAgencySegmentBootReady(readyKey, bootKey));

  return { isBooting, bootLabel: agencyBootLabel(segment, pathname) };
}
