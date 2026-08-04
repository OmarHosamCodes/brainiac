/** Pure Fin-Sheet scoreboard composition for Money stats cards. */

export type PeriodScoreboardInput = {
  billedCents: number;
  receivedCents: number;
  salariesDueCents: number;
  expensesAmountCents: number;
  debtDiscountCents: number;
  paidVacationCents: number;
  deviceCompCents: number;
  charityCents: number;
  pbcCents: number;
  teamLossCents: number;
  currency: string;
};

export type PeriodScoreboard = {
  currency: string;
  totalIncomeCents: number;
  receivedCents: number;
  remainingCents: number;
  salariesCents: number;
  expensesCents: number;
  debtDiscountCents: number;
  paidVacationCents: number;
  teamProfitCents: number;
  profitLossShareCents: number;
  roi: number;
  deviceCompensationCents: number;
  charityCents: number;
  pbcCents: number;
};

export function buildPeriodScoreboard(input: PeriodScoreboardInput): PeriodScoreboard {
  const totalIncomeCents = input.billedCents;
  const receivedCents = input.receivedCents;
  const remainingCents = Math.max(0, totalIncomeCents - receivedCents);
  const teamProfitCents =
    totalIncomeCents -
    (input.salariesDueCents +
      input.expensesAmountCents +
      input.debtDiscountCents +
      input.paidVacationCents);
  const roi = totalIncomeCents > 0 ? teamProfitCents / totalIncomeCents : 0;

  return {
    currency: input.currency,
    totalIncomeCents,
    receivedCents,
    remainingCents,
    salariesCents: input.salariesDueCents,
    expensesCents: input.expensesAmountCents,
    debtDiscountCents: input.debtDiscountCents,
    paidVacationCents: input.paidVacationCents,
    teamProfitCents,
    profitLossShareCents: input.teamLossCents,
    roi,
    deviceCompensationCents: input.deviceCompCents,
    charityCents: input.charityCents,
    pbcCents: input.pbcCents,
  };
}
