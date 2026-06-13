/**
 * Agency queries use live sync — data is kept fresh via optimistic patches and
 * WebSocket events, not periodic refetching.
 */
export const AGENCY_LIVE_STALE_TIME = Number.POSITIVE_INFINITY;

export function withAgencyLiveQueryOptions<T extends Record<string, unknown>>(options: T) {
  return {
    ...options,
    staleTime: AGENCY_LIVE_STALE_TIME,
  };
}
