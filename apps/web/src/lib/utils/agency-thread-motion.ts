import type { AgencyListOverlay } from "@/lib/utils/agency-optimistic-merge";

export const AGENCY_THREAD_MESSAGE_EASE = [0.25, 1, 0.5, 1] as const;
export const AGENCY_THREAD_MESSAGE_DURATION = 0.2;

export function resolveMessageAnimationKey(
  messageId: string,
  idMap: Record<string, string>,
): string {
  if (idMap[messageId]) {
    return messageId;
  }

  for (const [optimisticId, realId] of Object.entries(idMap)) {
    if (realId === messageId) {
      return optimisticId;
    }
  }

  return messageId;
}

export function isOptimisticTaskMessage(
  messageId: string,
  overlay: AgencyListOverlay<{ id: string }>,
): boolean {
  if (!(messageId in overlay.upserts)) {
    return false;
  }

  const reconciledRealIds = new Set(Object.values(overlay.idMap));
  return !reconciledRealIds.has(messageId);
}
