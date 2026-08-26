/** Chip/token helpers for Money formula authoring (mirrors API contract). */

export type MoneyFormulaToken =
  | { kind: "var"; id: string }
  | { kind: "number"; value: number }
  | { kind: "op"; op: "+" | "-" | "*" | "/" }
  | { kind: "paren"; value: "(" | ")" };

export type MoneyFormulaOutput = "amount" | "ratio" | "hours";

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
  ruleId: string | null;
};

export type MoneyFormulaVarMeta = {
  id: string;
  label: string;
  group: "period" | "member";
  unit: "amount" | "ratio" | "hours" | "count";
};

export const MONEY_FORMULA_VAR_PALETTE: MoneyFormulaVarMeta[] = [
  { id: "total_income", label: "Total income", group: "period", unit: "amount" },
  { id: "received", label: "Received", group: "period", unit: "amount" },
  { id: "salaries", label: "Salaries", group: "period", unit: "amount" },
  { id: "expenses", label: "Expenses", group: "period", unit: "amount" },
  { id: "debt_discount", label: "Debt / Discount", group: "period", unit: "amount" },
  { id: "paid_vacation", label: "Paid vacation", group: "period", unit: "amount" },
  { id: "device_comp", label: "Device compensation", group: "period", unit: "amount" },
  { id: "charity", label: "Charity", group: "period", unit: "amount" },
  { id: "pbc", label: "PBC", group: "period", unit: "amount" },
  { id: "team_loss", label: "Team loss", group: "period", unit: "amount" },
  { id: "team_profit", label: "Team profit", group: "period", unit: "amount" },
  { id: "remaining", label: "Remaining", group: "period", unit: "amount" },
  { id: "paid_vacation_hours", label: "Paid vacation hours", group: "period", unit: "hours" },
  { id: "member_cost_rate_amount", label: "Member cost rate", group: "member", unit: "amount" },
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
const VAR_UNIT = new Map(MONEY_FORMULA_VAR_PALETTE.map((item) => [item.id, item.unit]));

export type MoneyFormulaTokenLabelContext = {
  tokens: MoneyFormulaToken[];
  index: number;
  output: MoneyFormulaOutput;
  currency?: string;
};

export function majorToFormulaAmount(major: number): number {
  return Math.round(major * 100);
}

export function amountToFormulaMajor(amount: number): number {
  return amount / 100;
}

type MoneyFormulaNumberChipUnit = "amount" | "scalar";

function varUnit(id: string): MoneyFormulaVarMeta["unit"] | null {
  return VAR_UNIT.get(id) ?? null;
}

function neighborVarUnit(
  tokens: MoneyFormulaToken[],
  index: number,
  direction: -1 | 1,
): MoneyFormulaVarMeta["unit"] | null {
  let cursor = index + direction;
  if (cursor < 0 || cursor >= tokens.length) return null;

  const token = tokens[cursor];
  if (token?.kind === "var") return varUnit(token.id);
  if (token?.kind === "op") {
    cursor += direction;
    if (cursor < 0 || cursor >= tokens.length) return null;
    const neighbor = tokens[cursor];
    if (neighbor?.kind === "var") return varUnit(neighbor.id);
  }
  return null;
}

/** Whether a number chip is a currency literal (minor storage) vs a plain scalar. */
export function moneyFormulaNumberChipUnit(
  tokens: MoneyFormulaToken[],
  index: number,
  output: MoneyFormulaOutput,
): MoneyFormulaNumberChipUnit {
  const token = tokens[index];
  if (!token || token.kind !== "number") return "scalar";
  if (output === "ratio" || output === "hours") return "scalar";

  const prev = tokens[index - 1];
  if (prev?.kind === "op" && prev.op === "/") return "scalar";

  const next = tokens[index + 1];
  const afterNext = tokens[index + 2];
  if (
    next?.kind === "op" &&
    next.op === "*" &&
    afterNext?.kind === "var" &&
    afterNext.id === "member_cost_rate_amount"
  ) {
    return "scalar";
  }

  const leftUnit = neighborVarUnit(tokens, index, -1);
  const rightUnit = neighborVarUnit(tokens, index, 1);
  if (leftUnit === "hours" || rightUnit === "hours") return "scalar";
  if (leftUnit === "count" || rightUnit === "count") return "scalar";

  return "amount";
}

function formatMoneyFormulaNumberChipLabel(valueMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amountToFormulaMajor(valueMinor));
  } catch {
    return `${amountToFormulaMajor(valueMinor).toLocaleString()} ${currency}`;
  }
}

export function moneyFormulaTokenLabel(
  token: MoneyFormulaToken,
  context?: MoneyFormulaTokenLabelContext,
): string {
  switch (token.kind) {
    case "var":
      return VAR_LABEL.get(token.id) ?? token.id;
    case "number": {
      if (!context) return String(token.value);
      if (
        moneyFormulaNumberChipUnit(context.tokens, context.index, context.output) === "amount" &&
        context.currency
      ) {
        return formatMoneyFormulaNumberChipLabel(token.value, context.currency);
      }
      return String(token.value);
    }
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

export function summarizeMoneyFormulaTokens(
  tokens: MoneyFormulaToken[],
  options?: { output?: MoneyFormulaOutput; currency?: string },
): string {
  if (tokens.length === 0) return "Empty formula";
  const output = options?.output ?? "amount";
  return tokens
    .map((token, index) =>
      moneyFormulaTokenLabel(token, {
        tokens,
        index,
        output,
        currency: options?.currency,
      }),
    )
    .join(" ");
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

export function createCustomMoneyFormulaDraft(input?: {
  ruleId?: string | null;
  label?: string;
}): MoneyFormulaDef {
  const stamp = Date.now().toString(36);
  return {
    id: `custom_${stamp}`,
    key: `custom_${stamp}`,
    label: input?.label?.trim() || "Custom formula",
    locked: false,
    enabled: true,
    tokens: [{ kind: "number", value: 0 }],
    output: "amount",
    metricId: null,
    sectionKey: null,
    ruleId: input?.ruleId ?? null,
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
    case "amount": {
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
  amount: "Money",
  ratio: "Ratio",
  hours: "Hours",
};

/** Quiet destination line for list rows and locked template meta. */
export function moneyFormulaDestinationSummary(
  formula: MoneyFormulaDef,
  ruleLabel?: string | null,
): string {
  const parts: string[] = [];
  if (ruleLabel) parts.push(ruleLabel);
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
