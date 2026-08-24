/** Pure Fin-Sheet scoreboard composition for Money stats cards. */

export type PeriodScoreboardInput = {
  /** External non-waste tracked value (billable rates). */
  billablePoolAmount: number;
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
  const totalIncomeAmount = Math.max(
    Math.max(0, input.billablePoolAmount),
    receivedAmount + remainingAmount,
  );
  const costAmount =
    input.salariesDueAmount +
    input.expensesAmount +
    input.debtDiscountAmount +
    input.paidVacationAmount +
    input.deviceCompAmount;
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
