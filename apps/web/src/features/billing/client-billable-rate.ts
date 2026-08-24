/** Mirrors packages/api billing helper for effective client/project catalog rates. */
export function resolveEffectiveBillableRate(
  projectRateAmount: number | null | undefined,
  clientRateAmount: number | null | undefined,
): number | null {
  if (projectRateAmount != null) return projectRateAmount;
  if (clientRateAmount != null) return clientRateAmount;
  return null;
}
