import type {
  AgencyOpsMoneyCalcOptionsJson,
  AgencyOpsMoneyFormulaDef,
  AgencyOpsMoneyFormulaToken,
} from "@orch/db/schema";

import { normalizeMoneyFormulaDef } from "./money-formula-tokens";

function tokens(...parts: AgencyOpsMoneyFormulaToken[]): AgencyOpsMoneyFormulaToken[] {
  return parts;
}

function v(id: string): AgencyOpsMoneyFormulaToken {
  return { kind: "var", id };
}

function n(value: number): AgencyOpsMoneyFormulaToken {
  return { kind: "number", value };
}

function op(op: "+" | "-" | "*" | "/"): AgencyOpsMoneyFormulaToken {
  return { kind: "op", op };
}

function paren(value: "(" | ")"): AgencyOpsMoneyFormulaToken {
  return { kind: "paren", value };
}

/** Locked Fin-Sheet system templates (editable tokens / enable). */
export const MONEY_SYSTEM_FORMULA_TEMPLATES: AgencyOpsMoneyFormulaDef[] = [
  {
    id: "sys_remaining",
    key: "remaining",
    label: "Remaining",
    locked: true,
    enabled: true,
    tokens: tokens(v("total_income"), op("-"), v("received")),
    output: "amount",
    metricId: "remaining",
    sectionKey: null,
    ruleId: null,
  },
  {
    id: "sys_team_profit",
    key: "team_profit",
    label: "Team profit",
    locked: true,
    enabled: true,
    tokens: tokens(
      v("total_income"),
      op("-"),
      paren("("),
      v("salaries"),
      op("+"),
      v("expenses"),
      op("+"),
      v("debt_discount"),
      op("+"),
      v("device_comp"),
      op("+"),
      v("paid_vacation"),
      op("+"),
      v("charity"),
      op("+"),
      v("pbc"),
      paren(")"),
    ),
    output: "amount",
    metricId: "team-profit",
    sectionKey: null,
    ruleId: null,
  },
  {
    id: "sys_roi",
    key: "roi",
    label: "ROI",
    locked: true,
    enabled: true,
    tokens: tokens(
      v("team_profit"),
      op("/"),
      paren("("),
      v("salaries"),
      op("+"),
      v("expenses"),
      op("+"),
      v("debt_discount"),
      op("+"),
      v("device_comp"),
      op("+"),
      v("paid_vacation"),
      op("+"),
      v("charity"),
      op("+"),
      v("pbc"),
      paren(")"),
    ),
    output: "ratio",
    metricId: "roi",
    sectionKey: null,
    ruleId: null,
  },
  {
    id: "sys_profit_loss_share",
    key: "profit_loss_share",
    label: "Profit share / Loss share",
    locked: true,
    enabled: true,
    tokens: tokens(v("team_profit"), op("/"), n(2)),
    output: "amount",
    metricId: "profit-loss-share",
    sectionKey: "team_loss",
    ruleId: "profit-loss-share",
  },
  {
    id: "sys_paid_vacation",
    key: "paid_vacation",
    label: "Paid vacation",
    locked: true,
    enabled: true,
    tokens: tokens(v("paid_vacation_hours"), op("*"), v("member_cost_rate_amount")),
    output: "amount",
    metricId: "paid-vacation",
    sectionKey: "paid_vacation",
    ruleId: "paid-vacation",
  },
  {
    id: "sys_device_compensation",
    key: "device_compensation",
    label: "Device compensation",
    locked: true,
    enabled: true,
    tokens: tokens(n(0)),
    output: "amount",
    metricId: "device-compensation",
    sectionKey: "device_comp",
    ruleId: "device-compensation",
  },
  {
    id: "sys_charity",
    key: "charity",
    label: "Charity",
    locked: true,
    enabled: true,
    tokens: tokens(n(0)),
    output: "amount",
    metricId: "charity",
    sectionKey: "charity",
    ruleId: null,
  },
  {
    id: "sys_pbc",
    key: "pbc",
    label: "PBC",
    locked: true,
    enabled: true,
    tokens: tokens(n(0)),
    output: "amount",
    metricId: "pbc",
    sectionKey: "pbc",
    ruleId: null,
  },
];

const TEMPLATE_BY_KEY = new Map(
  MONEY_SYSTEM_FORMULA_TEMPLATES.map((formula) => [formula.key, formula]),
);
const FIN_SHEET_LOCKSTEP_KEYS = new Set(["team_profit", "roi", "profit_loss_share"]);

/** Legacy calc option id → system formula key. */
const LEGACY_OPTION_TO_KEY: Record<string, string> = {
  "roi-variables": "roi",
  charity: "charity",
  "profit-loss-share": "profit_loss_share",
  "paid-vacation": "paid_vacation",
  "device-compensation": "device_compensation",
  pbc: "pbc",
};

export function defaultMoneyFormulas(): AgencyOpsMoneyFormulaDef[] {
  return MONEY_SYSTEM_FORMULA_TEMPLATES.map((formula) => ({
    ...formula,
    tokens: formula.tokens.map((token) => ({ ...token })),
  }));
}

export function mergeMoneyFormulas(
  stored: unknown,
  legacy?: Pick<
    AgencyOpsMoneyCalcOptionsJson,
    "enabledOptionIds" | "valueByOptionId" | "summaryByOptionId"
  >,
): AgencyOpsMoneyFormulaDef[] {
  const defaults = defaultMoneyFormulas();
  const byKey = new Map(defaults.map((formula) => [formula.key, formula]));

  if (Array.isArray(stored)) {
    for (const raw of stored) {
      const formula = normalizeMoneyFormulaDef(raw);
      if (!formula) continue;
      const template = TEMPLATE_BY_KEY.get(formula.key);
      if (template) {
        byKey.set(formula.key, {
          ...template,
          enabled: formula.enabled,
          // Fin-Sheet system equations migrate in lockstep; owners can edit again after deploy.
          tokens: FIN_SHEET_LOCKSTEP_KEYS.has(formula.key)
            ? template.tokens.map((token) => ({ ...token }))
            : formula.tokens,
          // System labels / binds stay locked.
          label: template.label,
          locked: true,
          output: template.output,
          metricId: template.metricId,
          sectionKey: template.sectionKey,
          ruleId: formula.ruleId ?? template.ruleId,
          id: template.id,
        });
        continue;
      }
      if (!formula.locked) {
        byKey.set(formula.key, formula);
      }
    }
  } else if (legacy?.enabledOptionIds) {
    const enabledLegacy = new Set(legacy.enabledOptionIds);
    for (const [optionId, key] of Object.entries(LEGACY_OPTION_TO_KEY)) {
      const current = byKey.get(key);
      if (!current) continue;
      byKey.set(key, { ...current, enabled: enabledLegacy.has(optionId) });
    }
    const hours = legacy.valueByOptionId?.["paid-vacation"];
    if (typeof hours === "number" && Number.isFinite(hours)) {
      const vacation = byKey.get("paid_vacation");
      if (vacation) {
        byKey.set("paid_vacation", {
          ...vacation,
          tokens: tokens(n(hours), op("*"), v("member_cost_rate_amount")),
        });
      }
    }
  }

  // Preserve system order, then custom formulas by key.
  const systemKeys = MONEY_SYSTEM_FORMULA_TEMPLATES.map((formula) => formula.key);
  const customs = [...byKey.values()]
    .filter((formula) => !formula.locked)
    .sort((a, b) => a.label.localeCompare(b.label));

  return [...systemKeys.map((key) => byKey.get(key)!).filter(Boolean), ...customs];
}

export function enabledFormulasSnapshot(
  formulas: AgencyOpsMoneyFormulaDef[],
): AgencyOpsMoneyFormulaDef[] {
  return formulas
    .filter((formula) => formula.enabled)
    .map((formula) => ({
      ...formula,
      tokens: formula.tokens.map((token) => ({ ...token })),
    }));
}

export function createCustomMoneyFormula(input: {
  id: string;
  key: string;
  label: string;
  tokens?: AgencyOpsMoneyFormulaToken[];
  output?: AgencyOpsMoneyFormulaDef["output"];
  metricId?: string | null;
  sectionKey?: string | null;
  ruleId?: string | null;
}): AgencyOpsMoneyFormulaDef {
  return {
    id: input.id,
    key: input.key,
    label: input.label.trim() || "Custom formula",
    locked: false,
    enabled: true,
    tokens: input.tokens?.length ? input.tokens : [n(0)],
    output: input.output ?? "amount",
    metricId: input.metricId ?? null,
    sectionKey: input.sectionKey ?? null,
    ruleId: input.ruleId ?? null,
  };
}
