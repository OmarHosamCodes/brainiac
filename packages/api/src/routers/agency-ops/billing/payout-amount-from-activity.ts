/**
 * Stand-in salary amount until member monthly payment sheet exists (Part 9).
 * amount = round(hours × costRateAmount).
 */
export function payoutAmountFromActivity(durationSeconds: number, costRateAmount: number): number {
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) {
    throw new Error("durationSeconds must be a non-negative number.");
  }
  if (!Number.isFinite(costRateAmount) || costRateAmount < 0) {
    throw new Error("costRateAmount must be a non-negative number.");
  }
  if (durationSeconds === 0 || costRateAmount === 0) return 0;
  return Math.round((durationSeconds / 3600) * costRateAmount);
}
