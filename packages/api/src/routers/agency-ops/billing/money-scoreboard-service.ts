import { getInvoiceSummary } from "./service";
import { sumExpensesInPeriod } from "./expense-service";
import { getPayoutSectionTotals, getPayoutSummary } from "./payout-service";
import { buildPeriodScoreboard } from "./period-scoreboard";

export async function getPeriodScoreboard(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
) {
  const [invoiceSummary, payoutSummary, expenseTotals, sectionTotals] = await Promise.all([
    getInvoiceSummary(actorUserId, input),
    getPayoutSummary(actorUserId, input),
    sumExpensesInPeriod(actorUserId, input),
    getPayoutSectionTotals(actorUserId, input),
  ]);

  const currency =
    invoiceSummary.currency || payoutSummary.currency || expenseTotals.currency || "USD";

  return buildPeriodScoreboard({
    billedCents: invoiceSummary.billedCents,
    receivedCents: invoiceSummary.receivedCents,
    salariesDueCents: payoutSummary.salariesDueCents || sectionTotals.salaries,
    expensesAmountCents: expenseTotals.amountCents,
    debtDiscountCents: sectionTotals.debt_discount,
    paidVacationCents: sectionTotals.paid_vacation,
    deviceCompCents: sectionTotals.device_comp,
    charityCents: sectionTotals.charity,
    pbcCents: sectionTotals.pbc,
    teamLossCents: sectionTotals.team_loss,
    currency,
  });
}
