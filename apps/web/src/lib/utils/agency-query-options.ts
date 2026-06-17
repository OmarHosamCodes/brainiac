/**
 * Agency queries use tiered polling — data is kept fresh via refetch intervals,
 * optimistic mutation patches, and focus/reconnect refetch.
 */
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

export function withAgencySyncQueryOptions<T extends Record<string, unknown>>(
  options: T,
  tier: AgencySyncTier = "warm",
) {
  return {
    ...options,
    staleTime: AGENCY_STALE_TIME[tier],
    refetchInterval: AGENCY_POLL[tier],
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  };
}
