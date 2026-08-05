import type { AgencyOpsMoneyFormulaDef } from "@orch/db/schema";

import {
  evaluateMoneyFormulaTokens,
  type MoneyFormulaContext,
  roundMoneyFormulaCents,
} from "./money-formula-eval";
import type { PeriodScoreboard, PeriodScoreboardInput } from "./period-scoreboard";
import { buildPeriodScoreboard } from "./period-scoreboard";

export type MoneyFormulaPeriodFacts = {
  totalIncomeCents: number;
  receivedCents: number;
  salariesCents: number;
  expensesCents: number;
  debtDiscountCents: number;
  paidVacationCents: number;
  deviceCompCents: number;
  charityCents: number;
  pbcCents: number;
  teamLossCents: number;
  paidVacationHours: number;
  memberCostRateCents?: number;
  memberHours?: number;
  cohortSize?: number;
};

export function buildMoneyFormulaContext(facts: MoneyFormulaPeriodFacts): MoneyFormulaContext {
  const remaining = Math.max(0, facts.totalIncomeCents - facts.receivedCents);
  const teamProfit =
    facts.totalIncomeCents -
    (facts.salariesCents + facts.expensesCents + facts.debtDiscountCents + facts.paidVacationCents);

  return {
    total_income: facts.totalIncomeCents,
    received: facts.receivedCents,
    salaries: facts.salariesCents,
    expenses: facts.expensesCents,
    debt_discount: facts.debtDiscountCents,
    paid_vacation: facts.paidVacationCents,
    device_comp: facts.deviceCompCents,
    charity: facts.charityCents,
    pbc: facts.pbcCents,
    team_loss: facts.teamLossCents,
    team_profit: teamProfit,
    remaining,
    paid_vacation_hours: facts.paidVacationHours,
    member_cost_rate_cents: facts.memberCostRateCents ?? 0,
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
  if (formula.output === "cents" || formula.output === "hours") {
    return roundMoneyFormulaCents(result.value);
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
    totalIncomeCents: base.totalIncomeCents,
    receivedCents: base.receivedCents,
    salariesCents: base.salariesCents,
    expensesCents: base.expensesCents,
    debtDiscountCents: base.debtDiscountCents,
    paidVacationCents: base.paidVacationCents,
    deviceCompCents: base.deviceCompensationCents,
    charityCents: base.charityCents,
    pbcCents: base.pbcCents,
    teamLossCents: base.profitLossShareCents,
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
    board.remainingCents = Math.max(0, roundMoneyFormulaCents(remaining));
  }

  const paidVacation = read("paid-vacation", context);
  if (paidVacation !== null) {
    board.paidVacationCents = Math.max(0, roundMoneyFormulaCents(paidVacation));
    facts.paidVacationCents = board.paidVacationCents;
  }

  const device = read("device-compensation", context);
  if (device !== null) {
    board.deviceCompensationCents = Math.max(0, roundMoneyFormulaCents(device));
    facts.deviceCompCents = board.deviceCompensationCents;
  }

  const charity = read("charity", context);
  if (charity !== null) {
    board.charityCents = Math.max(0, roundMoneyFormulaCents(charity));
    facts.charityCents = board.charityCents;
  }

  const pbc = read("pbc", context);
  if (pbc !== null) {
    board.pbcCents = Math.max(0, roundMoneyFormulaCents(pbc));
    facts.pbcCents = board.pbcCents;
  }

  const profitShare = read("profit-loss-share", context);
  if (profitShare !== null) {
    board.profitLossShareCents = roundMoneyFormulaCents(profitShare);
    facts.teamLossCents = board.profitLossShareCents;
  }

  context = buildMoneyFormulaContext(facts);

  const teamProfit = read("team-profit", context);
  if (teamProfit !== null) {
    board.teamProfitCents = roundMoneyFormulaCents(teamProfit);
    context = { ...context, team_profit: board.teamProfitCents };
  } else {
    board.teamProfitCents = context.team_profit ?? board.teamProfitCents;
    context = { ...context, team_profit: board.teamProfitCents };
  }

  const roi = read("roi", context);
  if (roi !== null) {
    board.roi = Number.isFinite(roi) ? roi : 0;
  } else {
    board.roi = board.totalIncomeCents > 0 ? board.teamProfitCents / board.totalIncomeCents : 0;
  }

  return board;
}
