import type {
  AgencyOpsMoneyFormulaDef,
  AgencyOpsMoneyFormulaOutput,
  AgencyOpsMoneyFormulaToken,
} from "@orch/db/schema";

export const MONEY_FORMULA_VAR_IDS = [
  "total_income",
  "received",
  "salaries",
  "expenses",
  "debt_discount",
  "paid_vacation",
  "device_comp",
  "charity",
  "pbc",
  "team_loss",
  "team_profit",
  "remaining",
  "paid_vacation_hours",
  "member_cost_rate_amount",
  "member_hours",
  "cohort_size",
] as const;

export type MoneyFormulaVarId = (typeof MONEY_FORMULA_VAR_IDS)[number];

export type MoneyFormulaVarMeta = {
  id: MoneyFormulaVarId;
  label: string;
  group: "period" | "member";
  unit: "amount" | "ratio" | "hours" | "count";
};

export const MONEY_FORMULA_VAR_META: MoneyFormulaVarMeta[] = [
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
  {
    id: "member_cost_rate_amount",
    label: "Member cost rate",
    group: "member",
    unit: "amount",
  },
  { id: "member_hours", label: "Member hours", group: "member", unit: "hours" },
  { id: "cohort_size", label: "Cohort size", group: "member", unit: "count" },
];

const VAR_ID_SET = new Set<string>(MONEY_FORMULA_VAR_IDS);
const OPS = new Set(["+", "-", "*", "/"]);

export type MoneyFormulaValidationResult = { ok: true } | { ok: false; error: string };

function isToken(value: unknown): value is AgencyOpsMoneyFormulaToken {
  if (!value || typeof value !== "object") return false;
  const token = value as Partial<AgencyOpsMoneyFormulaToken>;
  if (token.kind === "var") return typeof token.id === "string" && token.id.length > 0;
  if (token.kind === "number")
    return typeof token.value === "number" && Number.isFinite(token.value);
  if (token.kind === "op") return typeof token.op === "string" && OPS.has(token.op);
  if (token.kind === "paren") return token.value === "(" || token.value === ")";
  return false;
}

export function validateMoneyFormulaTokens(tokens: unknown): MoneyFormulaValidationResult {
  if (!Array.isArray(tokens) || tokens.length === 0) {
    return { ok: false, error: "Formula needs at least one chip." };
  }

  let depth = 0;
  let expectOperand = true;

  for (const raw of tokens) {
    if (!isToken(raw)) {
      return { ok: false, error: "Formula contains an invalid chip." };
    }

    if (raw.kind === "paren" && raw.value === "(") {
      if (!expectOperand) {
        return { ok: false, error: "Unexpected opening parenthesis." };
      }
      depth += 1;
      expectOperand = true;
      continue;
    }

    if (raw.kind === "paren" && raw.value === ")") {
      if (expectOperand || depth === 0) {
        return { ok: false, error: "Unbalanced parentheses." };
      }
      depth -= 1;
      expectOperand = false;
      continue;
    }

    if (raw.kind === "op") {
      if (expectOperand) {
        return { ok: false, error: "Operator is missing a left value." };
      }
      expectOperand = true;
      continue;
    }

    if (raw.kind === "var" && !VAR_ID_SET.has(raw.id)) {
      return { ok: false, error: `Unknown variable “${raw.id}”.` };
    }

    if (!expectOperand) {
      return { ok: false, error: "Values must be separated by an operator." };
    }
    expectOperand = false;
  }

  if (depth !== 0) {
    return { ok: false, error: "Unbalanced parentheses." };
  }
  if (expectOperand) {
    return { ok: false, error: "Formula ends with an operator." };
  }

  return { ok: true };
}

export function normalizeMoneyFormulaToken(value: unknown): AgencyOpsMoneyFormulaToken | null {
  if (!isToken(value)) return null;
  if (value.kind === "var") return { kind: "var", id: value.id };
  if (value.kind === "number") return { kind: "number", value: value.value };
  if (value.kind === "op") return { kind: "op", op: value.op };
  return { kind: "paren", value: value.value };
}

export function normalizeMoneyFormulaDef(value: unknown): AgencyOpsMoneyFormulaDef | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Partial<AgencyOpsMoneyFormulaDef>;
  if (typeof record.id !== "string" || record.id.length === 0) return null;
  if (typeof record.key !== "string" || record.key.length === 0) return null;
  if (typeof record.label !== "string" || record.label.trim().length === 0) return null;
  if (typeof record.locked !== "boolean") return null;
  if (typeof record.enabled !== "boolean") return null;
  if (!Array.isArray(record.tokens)) return null;

  const tokens = record.tokens
    .map((token) => normalizeMoneyFormulaToken(token))
    .filter((token): token is AgencyOpsMoneyFormulaToken => token != null);
  if (tokens.length === 0) return null;

  const output: AgencyOpsMoneyFormulaOutput =
    record.output === "ratio" || record.output === "hours" || record.output === "amount"
      ? record.output
      : "amount";

  return {
    id: record.id,
    key: record.key,
    label: record.label.trim(),
    locked: record.locked,
    enabled: record.enabled,
    tokens,
    output,
    metricId: typeof record.metricId === "string" ? record.metricId : null,
    sectionKey: typeof record.sectionKey === "string" ? record.sectionKey : null,
  };
}
