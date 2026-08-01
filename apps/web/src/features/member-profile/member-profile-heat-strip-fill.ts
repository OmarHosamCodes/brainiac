/** Strip cell is size-3 (12px) + gap-1 (4px) per week column. */
export const STRIP_WEEK_COL_PX = 16;
/** Weekday label column (w-7) + gap-1 before week columns. */
export const STRIP_WEEKDAY_GUTTER_PX = 32;

/** How many empty week columns to append so fixed-size cells fill the strip width. */
export function stripFillWeekCount(containerWidthPx: number, realWeekCount: number): number {
  const available = containerWidthPx - STRIP_WEEKDAY_GUTTER_PX;
  if (available <= 0 || realWeekCount < 0) return 0;
  const capacity = Math.max(realWeekCount, Math.ceil(available / STRIP_WEEK_COL_PX));
  return Math.max(0, capacity - realWeekCount);
}
