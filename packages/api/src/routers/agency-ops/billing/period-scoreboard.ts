/** Pure Fin-Sheet scoreboard composition for Money stats cards. */

export type PeriodScoreboardInput = {
  /** External non-waste tracked value (billable rates). */
  billablePoolAmount: number;
  /**
   * Period-scoped external client bill adjustments (discount negative, surcharge/debt positive).
   * Ready unapplied + invoice-targeted rows. Exported ready rows are omitted — they already
   * sit in invoiced remaining. Used as a pool bump so max(pool, invoiced) still moves when
   * tracked work dominates invoiced totals.
   */
  clientPeriodAdjustmentsNet?: number;
  receivedAmount: number;
  /** Invoiced unpaid — not total − received. */
  invoicedRemainingAmount: number;
  salariesDueAmount: number;
  expensesAmount: number;
  debtDiscountAmount: number;
  paidVacationAmount: number;
  deviceCompAmount: number;
  charityAmount: number;
  pbcAmount: number;
  teamLossAmount: number;
  currency: string;
};

export function profitabilityCostAmount(
  facts: Pick<
    PeriodScoreboardInput,
    | "salariesDueAmount"
    | "expensesAmount"
    | "debtDiscountAmount"
    | "paidVacationAmount"
    | "deviceCompAmount"
    | "charityAmount"
    | "pbcAmount"
  >,
): number {
  return (
    facts.salariesDueAmount +
    facts.expensesAmount +
    facts.debtDiscountAmount +
    facts.paidVacationAmount +
    facts.deviceCompAmount +
    facts.charityAmount +
    facts.pbcAmount
  );
}

export type PeriodScoreboard = {
  currency: string;
  totalIncomeAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  salariesAmount: number;
  expensesAmount: number;
  debtDiscountAmount: number;
  paidVacationAmount: number;
  teamProfitAmount: number;
  profitLossShareAmount: number;
  roi: number;
  deviceCompensationAmount: number;
  charityAmount: number;
  pbcAmount: number;
};

export function buildPeriodScoreboard(input: PeriodScoreboardInput): PeriodScoreboard {
  const receivedAmount = input.receivedAmount;
  const remainingAmount = Math.max(0, input.invoicedRemainingAmount);
  const adjustedPool = Math.max(
    0,
    Math.max(0, input.billablePoolAmount) + (input.clientPeriodAdjustmentsNet ?? 0),
  );
  const totalIncomeAmount = Math.max(adjustedPool, receivedAmount + remainingAmount);
  const costAmount = profitabilityCostAmount({
    salariesDueAmount: input.salariesDueAmount,
    expensesAmount: input.expensesAmount,
    debtDiscountAmount: input.debtDiscountAmount,
    paidVacationAmount: input.paidVacationAmount,
    deviceCompAmount: input.deviceCompAmount,
    charityAmount: input.charityAmount,
    pbcAmount: input.pbcAmount,
  });
  const teamProfitAmount = totalIncomeAmount - costAmount;
  const roi = costAmount === 0 ? 0 : teamProfitAmount / costAmount;

  return {
    currency: input.currency,
    totalIncomeAmount,
    receivedAmount,
    remainingAmount,
    salariesAmount: input.salariesDueAmount,
    expensesAmount: input.expensesAmount,
    debtDiscountAmount: input.debtDiscountAmount,
    paidVacationAmount: input.paidVacationAmount,
    teamProfitAmount,
    profitLossShareAmount: input.teamLossAmount,
    roi,
    deviceCompensationAmount: input.deviceCompAmount,
    charityAmount: input.charityAmount,
    pbcAmount: input.pbcAmount,
  };
}
