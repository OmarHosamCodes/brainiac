import type { AgencyOpsMoneyFormulaDef } from "@orch/db/schema";

import {
  evaluateMoneyFormulaTokens,
  type MoneyFormulaContext,
  roundMoneyFormulaAmount,
} from "./money-formula-eval";
import type { PeriodScoreboard, PeriodScoreboardInput } from "./period-scoreboard";
import { buildPeriodScoreboard, profitabilityCostAmount } from "./period-scoreboard";

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

function formulaProfitabilityCost(facts: MoneyFormulaPeriodFacts): number {
  return profitabilityCostAmount({
    salariesDueAmount: facts.salariesAmount,
    expensesAmount: facts.expensesAmount,
    debtDiscountAmount: facts.debtDiscountAmount,
    paidVacationAmount: facts.paidVacationAmount,
    deviceCompAmount: facts.deviceCompAmount,
    charityAmount: facts.charityAmount,
    pbcAmount: facts.pbcAmount,
  });
}

export function buildMoneyFormulaContext(facts: MoneyFormulaPeriodFacts): MoneyFormulaContext {
  const remaining = Math.max(0, facts.totalIncomeAmount - facts.receivedAmount);
  const teamProfit = facts.totalIncomeAmount - formulaProfitabilityCost(facts);

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

function isPassthroughSectionFormula(formula: AgencyOpsMoneyFormulaDef): boolean {
  return (
    formula.tokens.length === 1 &&
    formula.tokens[0]?.kind === "number" &&
    formula.tokens[0].value === 0
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

  const readComputed = (metricId: string, context: MoneyFormulaContext): number | null => {
    const formula = byMetric.get(metricId);
    if (!formula) return null;
    return evaluateFormulaValue(formula, context);
  };

  const readSectionMetric = (
    metricId: string,
    sectionAmount: number,
    context: MoneyFormulaContext,
  ): number | null => {
    const formula = byMetric.get(metricId);
    if (!formula) return null;
    if (formula.sectionKey && (sectionAmount > 0 || isPassthroughSectionFormula(formula))) {
      return Math.max(0, roundMoneyFormulaAmount(sectionAmount));
    }
    const evaluated = evaluateFormulaValue(formula, context);
    if (evaluated === null) return null;
    return Math.max(0, roundMoneyFormulaAmount(evaluated));
  };

  let context = buildMoneyFormulaContext(facts);

  const remaining = readComputed("remaining", context);
  if (remaining !== null) {
    board.remainingAmount = Math.max(0, roundMoneyFormulaAmount(remaining));
  }

  const paidVacation = readSectionMetric("paid-vacation", facts.paidVacationAmount, context);
  if (paidVacation !== null) {
    board.paidVacationAmount = paidVacation;
    facts.paidVacationAmount = board.paidVacationAmount;
  }

  const device = readSectionMetric(
    "device-compensation",
    facts.deviceCompAmount,
    context,
  );
  if (device !== null) {
    board.deviceCompensationAmount = device;
    facts.deviceCompAmount = board.deviceCompensationAmount;
  }

  const charity = readSectionMetric("charity", facts.charityAmount, context);
  if (charity !== null) {
    board.charityAmount = charity;
    facts.charityAmount = board.charityAmount;
  }

  const pbc = readSectionMetric("pbc", facts.pbcAmount, context);
  if (pbc !== null) {
    board.pbcAmount = pbc;
    facts.pbcAmount = board.pbcAmount;
  }

  context = buildMoneyFormulaContext(facts);

  const teamProfit = readComputed("team-profit", context);
  if (teamProfit !== null) {
    board.teamProfitAmount = roundMoneyFormulaAmount(teamProfit);
    context = { ...context, team_profit: board.teamProfitAmount };
  } else {
    board.teamProfitAmount = context.team_profit ?? board.teamProfitAmount;
    context = { ...context, team_profit: board.teamProfitAmount };
  }

  const profitShare = readComputed("profit-loss-share", context);
  if (profitShare !== null) {
    board.profitLossShareAmount = roundMoneyFormulaAmount(profitShare);
    facts.teamLossAmount = board.profitLossShareAmount;
  }

  const roi = readComputed("roi", context);
  if (roi !== null) {
    board.roi = Number.isFinite(roi) ? roi : 0;
  } else {
    const costAmount = profitabilityCostAmount({
      salariesDueAmount: board.salariesAmount,
      expensesAmount: board.expensesAmount,
      debtDiscountAmount: board.debtDiscountAmount,
      paidVacationAmount: board.paidVacationAmount,
      deviceCompAmount: board.deviceCompensationAmount,
      charityAmount: board.charityAmount,
      pbcAmount: board.pbcAmount,
    });
    board.roi = costAmount === 0 ? 0 : board.teamProfitAmount / costAmount;
  }

  return board;
}
