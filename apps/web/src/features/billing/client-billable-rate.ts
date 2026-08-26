/** Mirrors packages/api billing helper for effective task/project/client catalog rates. */
export function resolveEffectiveBillableRate(
  taskRateAmount: number | null | undefined,
  projectRateAmount?: number | null | undefined,
  clientRateAmount?: number | null | undefined,
): number | null {
  if (taskRateAmount != null) return taskRateAmount;
  if (projectRateAmount != null) return projectRateAmount;
  if (clientRateAmount != null) return clientRateAmount;
  return null;
}
