import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { orpc, orpcClient } from "@/lib/orpc";
import { withAgencySyncQueryOptions } from "@/lib/utils/agency-query-options";

function pollSinceStorageKey(teamId: string) {
  return `agency-notifications:since:${teamId}`;
}

export function readAgencyNotificationSince(teamId: string): string | undefined {
  if (!teamId) return undefined;
  try {
    return sessionStorage.getItem(pollSinceStorageKey(teamId)) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeAgencyNotificationSince(teamId: string, since: string) {
  if (!teamId) return;
  try {
    sessionStorage.setItem(pollSinceStorageKey(teamId), since);
  } catch {
    // sessionStorage unavailable
  }
}

export function useAgencyNotificationsInboxQuery(teamId: string, enabled: boolean) {
  const input = useMemo(() => ({ teamId, limit: 20 }), [teamId]);

  return useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.notifications.list.queryOptions({ input }),
        enabled: Boolean(teamId) && enabled,
      },
      "warm",
    ),
  );
}

export function useAgencyNotificationsPollQuery(
  teamId: string,
  getSince: () => string | undefined,
  enabled: boolean,
) {
  const baseKey = orpc.agencyOps.notifications.list.queryOptions({ input: { teamId } }).queryKey;

  return useQuery(
    withAgencySyncQueryOptions(
      {
        queryKey: [...baseKey, "poll"],
        queryFn: () =>
          orpcClient.agencyOps.notifications.list({
            teamId,
            ...(getSince() ? { since: getSince() } : {}),
          }),
        enabled: Boolean(teamId) && enabled,
      },
      "hot",
    ),
  );
}

export function useAgencyVapidPublicKeyQuery(enabled: boolean) {
  return useQuery({
    ...orpc.agencyOps.push.getVapidPublicKey.queryOptions(),
    enabled,
    staleTime: Number.POSITIVE_INFINITY,
  });
}
