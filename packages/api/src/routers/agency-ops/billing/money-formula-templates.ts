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
    output: "cents",
    metricId: "remaining",
    sectionKey: null,
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
      v("paid_vacation"),
      paren(")"),
    ),
    output: "cents",
    metricId: "team-profit",
    sectionKey: null,
  },
  {
    id: "sys_roi",
    key: "roi",
    label: "ROI",
    locked: true,
    enabled: true,
    tokens: tokens(v("team_profit"), op("/"), v("total_income")),
    output: "ratio",
    metricId: "roi",
    sectionKey: null,
  },
  {
    id: "sys_profit_loss_share",
    key: "profit_loss_share",
    label: "Profit share / Loss share",
    locked: true,
    enabled: true,
    tokens: tokens(v("team_loss")),
    output: "cents",
    metricId: "profit-loss-share",
    sectionKey: "team_loss",
  },
  {
    id: "sys_paid_vacation",
    key: "paid_vacation",
    label: "Paid vacation",
    locked: true,
    enabled: true,
    tokens: tokens(v("paid_vacation_hours"), op("*"), v("member_cost_rate_cents")),
    output: "cents",
    metricId: "paid-vacation",
    sectionKey: "paid_vacation",
  },
  {
    id: "sys_device_compensation",
    key: "device_compensation",
    label: "Device compensation",
    locked: true,
    enabled: true,
    tokens: tokens(n(0)),
    output: "cents",
    metricId: "device-compensation",
    sectionKey: "device_comp",
  },
  {
    id: "sys_charity",
    key: "charity",
    label: "Charity",
    locked: true,
    enabled: true,
    tokens: tokens(n(0)),
    output: "cents",
    metricId: "charity",
    sectionKey: "charity",
  },
  {
    id: "sys_pbc",
    key: "pbc",
    label: "PBC",
    locked: true,
    enabled: true,
    tokens: tokens(n(0)),
    output: "cents",
    metricId: "pbc",
    sectionKey: "pbc",
  },
];

const TEMPLATE_BY_KEY = new Map(
  MONEY_SYSTEM_FORMULA_TEMPLATES.map((formula) => [formula.key, formula]),
);

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
          tokens: formula.tokens,
          // System labels / binds stay locked.
          label: template.label,
          locked: true,
          output: template.output,
          metricId: template.metricId,
          sectionKey: template.sectionKey,
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
          tokens: tokens(n(hours), op("*"), v("member_cost_rate_cents")),
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
}): AgencyOpsMoneyFormulaDef {
  return {
    id: input.id,
    key: input.key,
    label: input.label.trim() || "Custom formula",
    locked: false,
    enabled: true,
    tokens: input.tokens?.length ? input.tokens : [n(0)],
    output: input.output ?? "cents",
    metricId: input.metricId ?? null,
    sectionKey: input.sectionKey ?? null,
  };
}
