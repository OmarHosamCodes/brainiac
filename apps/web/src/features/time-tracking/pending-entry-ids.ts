/** Drop finished mutation ids without snapshot-restore (overlaps must not stick). */
export function releasePendingEntryIds(
  current: readonly string[],
  releasing: readonly string[],
): string[] {
  if (releasing.length === 0) return [...current];
  const drop = new Set(releasing);
  return current.filter((id) => !drop.has(id));
}
