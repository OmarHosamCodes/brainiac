/**
 * Stand-in salary amount until member monthly payment sheet exists (Part 9).
 * amountCents = round(hours × costRateCents).
 */
export function payoutAmountCentsFromActivity(
  durationSeconds: number,
  costRateCents: number,
): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("durationSeconds must be a non-negative number.");
  }
  if (!Number.isFinite(costRateCents) || costRateCents < 0) {
    throw new Error("costRateCents must be a non-negative number.");
  }
  if (durationSeconds === 0 || costRateCents === 0) return 0;
  return Math.round((durationSeconds / 3600) * costRateCents);
}
