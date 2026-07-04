export const AGENCY_TASK_ROW_DELETE_ACTION_WIDTH = 76;

/** Snap horizontal swipe offset to open/closed resting positions. */
export function snapAgencyTaskRowSwipeOffset(
  offsetX: number,
  actionWidth: number = AGENCY_TASK_ROW_DELETE_ACTION_WIDTH,
): { offset: number; open: boolean } {
  const reveal = Math.abs(offsetX);
  const openThreshold = actionWidth * 0.35;
  const fullThreshold = actionWidth * 0.85;

  if (reveal >= fullThreshold || reveal >= openThreshold) {
    return { offset: -actionWidth, open: true };
  }

  return { offset: 0, open: false };
}

/** Clamp drag offset while the user is actively swiping. */
export function clampAgencyTaskRowSwipeOffset(
  offsetX: number,
  actionWidth: number = AGENCY_TASK_ROW_DELETE_ACTION_WIDTH,
): number {
  return Math.max(-actionWidth, Math.min(0, offsetX));
}
