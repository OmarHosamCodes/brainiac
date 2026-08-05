/** Chip/token helpers for Money formula authoring (mirrors API contract). */

export type MoneyFormulaToken =
  | { kind: "var"; id: string }
  | { kind: "number"; value: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" };

export type MoneyFormulaOutput = "cents" | "ratio" | "hours";

export type MoneyFormulaDef = {
  id: string;
  key: string;
  label: string;
  locked: boolean;
  enabled: boolean;
  tokens: MoneyFormulaToken[];
  output: MoneyFormulaOutput;
  metricId: string | null;
  sectionKey: string | null;
};

export type MoneyFormulaVarMeta = {
  id: string;
  label: string;
  group: "period" | "member";
  unit: "cents" | "ratio" | "hours" | "count";
};

export const MONEY_FORMULA_VAR_PALETTE: MoneyFormulaVarMeta[] = [
  { id: "total_income", label: "Total income", group: "period", unit: "cents" },
  { id: "received", label: "Received", group: "period", unit: "cents" },
  { id: "salaries", label: "Salaries", group: "period", unit: "cents" },
  { id: "expenses", label: "Expenses", group: "period", unit: "cents" },
  { id: "debt_discount", label: "Debt / Discount", group: "period", unit: "cents" },
  { id: "paid_vacation", label: "Paid vacation", group: "period", unit: "cents" },
  { id: "device_comp", label: "Device compensation", group: "period", unit: "cents" },
  { id: "charity", label: "Charity", group: "period", unit: "cents" },
  { id: "pbc", label: "PBC", group: "period", unit: "cents" },
  { id: "team_loss", label: "Team loss", group: "period", unit: "cents" },
  { id: "team_profit", label: "Team profit", group: "period", unit: "cents" },
  { id: "remaining", label: "Remaining", group: "period", unit: "cents" },
  { id: "paid_vacation_hours", label: "Paid vacation hours", group: "period", unit: "hours" },
  { id: "member_cost_rate_cents", label: "Member cost rate", group: "member", unit: "cents" },
  { id: "member_hours", label: "Member hours", group: "member", unit: "hours" },
  { id: "cohort_size", label: "Cohort size", group: "member", unit: "count" },
];

export const MONEY_FORMULA_OPS: Array<{ op: "+" | "-" | "*" | "/"; label: string }> = [
  { op: "+", label: "+" },
  { op: "-", label: "−" },
  { op: "*", label: "×" },
  { op: "/", label: "÷" },
];

const VAR_LABEL = new Map(MONEY_FORMULA_VAR_PALETTE.map((item) => [item.id, item.label]));

export function moneyFormulaTokenLabel(token: MoneyFormulaToken): string {
  switch (token.kind) {
    case "var":
      return VAR_LABEL.get(token.id) ?? token.id;
    case "number":
      return String(token.value);
    case "op":
      return MONEY_FORMULA_OPS.find((item) => item.op === token.op)?.label ?? token.op;
    case "paren":
      return token.value;
    default: {
      const _exhaustive: never = token;
      return _exhaustive;
    }
  }
}

export function summarizeMoneyFormulaTokens(tokens: MoneyFormulaToken[]): string {
  if (tokens.length === 0) return "Empty formula";
  return tokens.map((token) => moneyFormulaTokenLabel(token)).join(" ");
}

const KNOWN_VARS = new Set(MONEY_FORMULA_VAR_PALETTE.map((item) => item.id));

/** Lightweight client validation mirroring API token rules (inline errors). */
export function validateMoneyFormulaTokensClient(
  tokens: MoneyFormulaToken[],
): { ok: true } | { ok: false; error: string } {
  if (tokens.length === 0) {
    return { ok: false, error: "Add at least one chip — start with a period value or number." };
  }

  let depth = 0;
  let expectOperand = true;

  for (const token of tokens) {
    if (token.kind === "paren" && token.value === "(") {
      if (!expectOperand) return { ok: false, error: "Unexpected opening parenthesis." };
      depth += 1;
      expectOperand = true;
      continue;
    }
    if (token.kind === "paren" && token.value === ")") {
      if (expectOperand || depth === 0) {
        return { ok: false, error: "Unbalanced parentheses." };
      }
      depth -= 1;
      expectOperand = false;
      continue;
    }
    if (token.kind === "op") {
      if (expectOperand) return { ok: false, error: "Operator is missing a left value." };
      expectOperand = true;
      continue;
    }
    if (token.kind === "var" && !KNOWN_VARS.has(token.id)) {
      return { ok: false, error: `Unknown variable “${token.id}”.` };
    }
    if (!expectOperand) {
      return { ok: false, error: "Values must be separated by an operator." };
    }
    expectOperand = false;
  }

  if (depth !== 0) return { ok: false, error: "Unbalanced parentheses." };
  if (expectOperand) return { ok: false, error: "Formula ends with an operator." };
  return { ok: true };
}

export function createCustomMoneyFormulaDraft(): MoneyFormulaDef {
  const stamp = Date.now().toString(36);
  return {
    id: `custom_${stamp}`,
    key: `custom_${stamp}`,
    label: "Custom formula",
    locked: false,
    enabled: true,
    tokens: [{ kind: "number", value: 0 }],
    output: "cents",
    metricId: null,
    sectionKey: null,
  };
}

/** Legacy calc option ids kept in sync for older consumers. */
const FORMULA_KEY_TO_LEGACY_OPTION: Record<string, string> = {
  roi: "roi-variables",
  charity: "charity",
  profit_loss_share: "profit-loss-share",
  paid_vacation: "paid-vacation",
  device_compensation: "device-compensation",
  pbc: "pbc",
};

export function deriveLegacyEnabledOptionIds(formulas: MoneyFormulaDef[]): string[] {
  const enabled = new Set<string>();
  for (const formula of formulas) {
    if (!formula.enabled) continue;
    const legacy = FORMULA_KEY_TO_LEGACY_OPTION[formula.key];
    if (legacy) enabled.add(legacy);
  }
  return [...enabled];
}

export function deriveLegacyValueByOptionId(
  formulas: MoneyFormulaDef[],
  previous?: Record<string, number>,
): Record<string, number> {
  const next = { ...(previous ?? {}) };
  const vacation = formulas.find((formula) => formula.key === "paid_vacation");
  const hours = vacation?.tokens.find((token) => token.kind === "number");
  if (hours && hours.kind === "number") {
    next["paid-vacation"] = hours.value;
  }
  return next;
}

export function formatMoneyFormulaPreview(
  value: number | null,
  output: MoneyFormulaOutput,
  currency: string,
): string {
  if (value === null || !Number.isFinite(value)) return "—";
  switch (output) {
    case "ratio":
      return `${(value * 100).toFixed(1)}%`;
    case "hours":
      return `${value.toLocaleString(undefined, { maximumFractionDigits: 2 })} h`;
    case "cents": {
      try {
        return new Intl.NumberFormat(undefined, {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }).format(value / 100);
      } catch {
        return `${(value / 100).toFixed(2)} ${currency}`;
      }
    }
    default: {
      const _exhaustive: never = output;
      return _exhaustive;
    }
  }
}

export const MONEY_FORMULA_METRIC_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "remaining", label: "Remaining" },
  { id: "team-profit", label: "Team profit" },
  { id: "roi", label: "ROI" },
  { id: "profit-loss-share", label: "Profit / Loss share" },
  { id: "paid-vacation", label: "Paid vacation" },
  { id: "device-compensation", label: "Device compensation" },
  { id: "charity", label: "Charity" },
  { id: "pbc", label: "PBC" },
];

export const MONEY_FORMULA_SECTION_OPTIONS: Array<{ id: string; label: string }> = [
  { id: "team_loss", label: "Team loss" },
  { id: "paid_vacation", label: "Paid vacation" },
  { id: "device_comp", label: "Device compensation" },
  { id: "charity", label: "Charity" },
  { id: "pbc", label: "PBC" },
];

const OUTPUT_LABEL: Record<MoneyFormulaOutput, string> = {
  cents: "Money",
  ratio: "Ratio",
  hours: "Hours",
};

/** Quiet destination line for list rows and locked template meta. */
export function moneyFormulaDestinationSummary(formula: MoneyFormulaDef): string {
  const parts: string[] = [];
  if (formula.metricId) {
    const metric = MONEY_FORMULA_METRIC_OPTIONS.find((item) => item.id === formula.metricId);
    parts.push(metric?.label ?? formula.metricId);
  }
  if (formula.sectionKey) {
    const section = MONEY_FORMULA_SECTION_OPTIONS.find((item) => item.id === formula.sectionKey);
    const sectionLabel = section?.label ?? formula.sectionKey;
    if (!parts.includes(sectionLabel)) parts.push(sectionLabel);
  }
  if (parts.length === 0) return OUTPUT_LABEL[formula.output];
  return parts.join(" · ");
}
