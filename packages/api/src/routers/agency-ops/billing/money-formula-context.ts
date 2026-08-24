import type { AgencyOpsMoneyFormulaDef } from "@orch/db/schema";

import {
  evaluateMoneyFormulaTokens,
  type MoneyFormulaContext,
  roundMoneyFormulaAmount,
} from "./money-formula-eval";
import type { PeriodScoreboard, PeriodScoreboardInput } from "./period-scoreboard";
import { buildPeriodScoreboard } from "./period-scoreboard";

export type MoneyFormulaPeriodFacts = {
  totalIncomeAmount: number;
  receivedAmount: number;
  salariesAmount: number;
  expensesAmount: number;
  debtDiscountAmount: number;
  paidVacationAmount: number;
  deviceCompAmount: number;
  charityAmount: number;
  pbcAmount: number;
  teamLossAmount: number;
  paidVacationHours: number;
  memberCostRateAmount?: number;
  memberHours?: number;
  cohortSize?: number;
};

export function buildMoneyFormulaContext(facts: MoneyFormulaPeriodFacts): MoneyFormulaContext {
  const remaining = Math.max(0, facts.totalIncomeAmount - facts.receivedAmount);
  const teamProfit =
    facts.totalIncomeAmount -
    (facts.salariesAmount +
      facts.expensesAmount +
      facts.debtDiscountAmount +
      facts.paidVacationAmount +
      facts.deviceCompAmount);

  return {
    total_income: facts.totalIncomeAmount,
    received: facts.receivedAmount,
    salaries: facts.salariesAmount,
    expenses: facts.expensesAmount,
    debt_discount: facts.debtDiscountAmount,
    paid_vacation: facts.paidVacationAmount,
    device_comp: facts.deviceCompAmount,
    charity: facts.charityAmount,
    pbc: facts.pbcAmount,
    team_loss: facts.teamLossAmount,
    team_profit: teamProfit,
    remaining,
    paid_vacation_hours: facts.paidVacationHours,
    member_cost_rate_amount: facts.memberCostRateAmount ?? 0,
    member_hours: facts.memberHours ?? 0,
    cohort_size: facts.cohortSize ?? 0,
  };
}

export function evaluateFormulaValue(
  formula: AgencyOpsMoneyFormulaDef,
  context: MoneyFormulaContext,
): number | null {
  const result = evaluateMoneyFormulaTokens(formula.tokens, context);
  if (!result.ok) return null;
  if (formula.output === "amount" || formula.output === "hours") {
    return roundMoneyFormulaAmount(result.value);
  }
  return result.value;
}

function formulaByMetric(
  formulas: AgencyOpsMoneyFormulaDef[],
): Map<string, AgencyOpsMoneyFormulaDef> {
  return new Map(
    formulas
      .filter((formula) => formula.enabled && formula.metricId)
      .map((formula) => [formula.metricId!, formula]),
  );
}

/** Merge formula-bound metrics onto the hardwired scoreboard fallback. */
export function applyFormulasToScoreboard(
  input: PeriodScoreboardInput,
  formulas: AgencyOpsMoneyFormulaDef[],
  paidVacationHours: number,
): PeriodScoreboard {
  const base = buildPeriodScoreboard(input);
  const byMetric = formulaByMetric(formulas);

  const facts: MoneyFormulaPeriodFacts = {
    totalIncomeAmount: base.totalIncomeAmount,
    receivedAmount: base.receivedAmount,
    salariesAmount: base.salariesAmount,
    expensesAmount: base.expensesAmount,
    debtDiscountAmount: base.debtDiscountAmount,
    paidVacationAmount: base.paidVacationAmount,
    deviceCompAmount: base.deviceCompensationAmount,
    charityAmount: base.charityAmount,
    pbcAmount: base.pbcAmount,
    teamLossAmount: base.profitLossShareAmount,
    paidVacationHours,
  };

  const board: PeriodScoreboard = { ...base };

  const read = (metricId: string, context: MoneyFormulaContext): number | null => {
    const formula = byMetric.get(metricId);
    if (!formula) return null;
    return evaluateFormulaValue(formula, context);
  };

  let context = buildMoneyFormulaContext(facts);

  const remaining = read("remaining", context);
  if (remaining !== null) {
    board.remainingAmount = Math.max(0, roundMoneyFormulaAmount(remaining));
  }

  const paidVacation = read("paid-vacation", context);
  if (paidVacation !== null) {
    board.paidVacationAmount = Math.max(0, roundMoneyFormulaAmount(paidVacation));
    facts.paidVacationAmount = board.paidVacationAmount;
  }

  const device = read("device-compensation", context);
  if (device !== null) {
    board.deviceCompensationAmount = Math.max(0, roundMoneyFormulaAmount(device));
    facts.deviceCompAmount = board.deviceCompensationAmount;
  }

  const charity = read("charity", context);
  if (charity !== null) {
    board.charityAmount = Math.max(0, roundMoneyFormulaAmount(charity));
    facts.charityAmount = board.charityAmount;
  }

  const pbc = read("pbc", context);
  if (pbc !== null) {
    board.pbcAmount = Math.max(0, roundMoneyFormulaAmount(pbc));
    facts.pbcAmount = board.pbcAmount;
  }

  context = buildMoneyFormulaContext(facts);

  const teamProfit = read("team-profit", context);
  if (teamProfit !== null) {
    board.teamProfitAmount = roundMoneyFormulaAmount(teamProfit);
    context = { ...context, team_profit: board.teamProfitAmount };
  } else {
    board.teamProfitAmount = context.team_profit ?? board.teamProfitAmount;
    context = { ...context, team_profit: board.teamProfitAmount };
  }

  const profitShare = read("profit-loss-share", context);
  if (profitShare !== null) {
    board.profitLossShareAmount = roundMoneyFormulaAmount(profitShare);
    facts.teamLossAmount = board.profitLossShareAmount;
  }

  const roi = read("roi", context);
  if (roi !== null) {
    board.roi = Number.isFinite(roi) ? roi : 0;
  } else {
    const costAmount =
      board.salariesAmount +
      board.expensesAmount +
      board.debtDiscountAmount +
      board.deviceCompensationAmount +
      board.paidVacationAmount;
    board.roi = costAmount === 0 ? 0 : board.teamProfitAmount / costAmount;
  }

  return board;
}
