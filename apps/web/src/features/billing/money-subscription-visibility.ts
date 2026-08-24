export type MoneySubscriptionVisibility = {
  due: boolean;
  paid: boolean;
};

export function filterSubscriptionCycles<T extends { state: "due" | "paid" }>(
  cycles: T[],
  visibility: MoneySubscriptionVisibility,
): T[] {
  return cycles.filter((cycle) => visibility[cycle.state]);
}

export function subscriptionCountLabel(
  count: number,
  visibility: MoneySubscriptionVisibility,
): string {
  if (visibility.due && !visibility.paid) return `${count} due`;
  if (visibility.paid && !visibility.due) return `${count} paid`;
  return `${count} shown`;
}
