/**
 * Agency queries use tiered polling — data is kept fresh via refetch intervals,
 * optimistic mutation patches, and focus/reconnect refetch.
 */
import { isAgencyLiveConnected } from "@/lib/agency/live/agency-live-connected";
import { getQueryClient } from "@/lib/query-client";

export const AGENCY_POLL = {
  hot: 3_000,
  warm: 8_000,
  cold: 30_000,
} as const;

export const AGENCY_STALE_TIME = {
  hot: 2_000,
  warm: 5_000,
  cold: 15_000,
} as const;

export type AgencySyncTier = keyof typeof AGENCY_POLL;

export type AgencySyncMeta = {
  agencyLiveGatedTeamId?: string;
  agencySyncTier?: AgencySyncTier;
  agencyNoPoll?: boolean;
};

export type AgencySyncOptions = {
  liveGated?: boolean;
  teamId?: string;
  /** Initial fetch only — no refetchInterval even when live is disconnected. */
  noPoll?: boolean;
};

function resolveRefetchInterval(
  tier: AgencySyncTier,
  gatedTeamId: string | undefined,
  noPoll: boolean,
) {
  if (noPoll) {
    return false as const;
  }
  if (gatedTeamId) {
    return isAgencyLiveConnected(gatedTeamId) ? false : AGENCY_POLL[tier];
  }
  return AGENCY_POLL[tier];
}

export function withAgencySyncQueryOptions<T extends Record<string, unknown>>(
  options: T,
  tier: AgencySyncTier = "warm",
  syncOptions?: AgencySyncOptions,
) {
  const { liveGated = false, teamId, noPoll = false } = syncOptions ?? {};
  const gatedTeamId = liveGated && teamId ? teamId : undefined;
  const existingMeta = (options as { meta?: Record<string, unknown> }).meta;

  return {
    ...options,
    staleTime: AGENCY_STALE_TIME[tier],
    refetchInterval: resolveRefetchInterval(tier, gatedTeamId, noPoll),
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    meta: {
      ...existingMeta,
      ...(gatedTeamId ? { agencyLiveGatedTeamId: gatedTeamId, agencySyncTier: tier } : {}),
      ...(noPoll ? { agencyNoPoll: true } : {}),
    },
  };
}

/** Warm cache once on prefetch — no perpetual refetchInterval pollers. */
export function prefetchAgencySyncQueryOptions<T extends Record<string, unknown>>(
  options: T,
  tier: AgencySyncTier = "warm",
) {
  return {
    ...options,
    staleTime: AGENCY_STALE_TIME[tier],
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  };
}

export function refreshAgencyLiveGatedPolling(teamId: string) {
  const queryClient = getQueryClient();
  const connected = isAgencyLiveConnected(teamId);

  for (const query of queryClient.getQueryCache().findAll()) {
    const meta = query.options.meta as AgencySyncMeta | undefined;
    if (meta?.agencyNoPoll) {
      continue;
    }
    if (meta?.agencyLiveGatedTeamId !== teamId) {
      continue;
    }
    const tier = meta.agencySyncTier ?? "warm";
    const nextInterval = connected ? false : AGENCY_POLL[tier];
    query.setOptions({
      ...query.options,
      refetchInterval: nextInterval,
    } as typeof query.options);
  }
}
