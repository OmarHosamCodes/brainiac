import type { AgencyOpsMoneyFormulaToken } from "@orch/db/schema";

import { type MoneyFormulaVarId, validateMoneyFormulaTokens } from "./money-formula-tokens";

export type MoneyFormulaContext = Partial<Record<MoneyFormulaVarId, number>>;

export type MoneyFormulaEvalResult = { ok: true; value: number } | { ok: false; error: string };

function precedence(op: "+" | "-" | "*" | "/"): number {
  return op === "+" || op === "-" ? 1 : 2;
}

function applyOp(op: "+" | "-" | "*" | "/", left: number, right: number): number | null {
  switch (op) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) return null;
      return left / right;
    default: {
      const _exhaustive: never = op;
      return _exhaustive;
    }
  }
}

/** Safe shunting-yard evaluator — no Function / eval. */
export function evaluateMoneyFormulaTokens(
  tokens: AgencyOpsMoneyFormulaToken[],
  context: MoneyFormulaContext,
): MoneyFormulaEvalResult {
  const validation = validateMoneyFormulaTokens(tokens);
  if (!validation.ok) return validation;

  const output: number[] = [];
  const ops: Array<{ kind: "op"; op: "+" | "-" | "*" | "/" } | { kind: "paren" }> = [];

  const popOp = (): MoneyFormulaEvalResult | null => {
    const top = ops.pop();
    if (!top || top.kind !== "op") {
      return { ok: false, error: "Invalid formula." };
    }
    const right = output.pop();
    const left = output.pop();
    if (right === undefined || left === undefined) {
      return { ok: false, error: "Invalid formula." };
    }
    const next = applyOp(top.op, left, right);
    if (next === null) {
      return { ok: false, error: "Division by zero." };
    }
    if (!Number.isFinite(next)) {
      return { ok: false, error: "Formula result is not a finite number." };
    }
    output.push(next);
    return null;
  };

  for (const token of tokens) {
    if (token.kind === "number") {
      output.push(token.value);
      continue;
    }

    if (token.kind === "var") {
      const value = context[token.id as MoneyFormulaVarId];
      output.push(typeof value === "number" && Number.isFinite(value) ? value : 0);
      continue;
    }

    if (token.kind === "paren" && token.value === "(") {
      ops.push({ kind: "paren" });
      continue;
    }

    if (token.kind === "paren" && token.value === ")") {
      while (ops.length > 0 && ops[ops.length - 1]?.kind === "op") {
        const err = popOp();
        if (err) return err;
      }
      const open = ops.pop();
      if (!open || open.kind !== "paren") {
        return { ok: false, error: "Unbalanced parentheses." };
      }
      continue;
    }

    if (token.kind === "op") {
      while (ops.length > 0) {
        const top = ops[ops.length - 1];
        if (!top || top.kind !== "op") break;
        if (precedence(top.op) < precedence(token.op)) break;
        const err = popOp();
        if (err) return err;
      }
      ops.push({ kind: "op", op: token.op });
    }
  }

  while (ops.length > 0) {
    const top = ops[ops.length - 1];
    if (!top || top.kind !== "op") {
      return { ok: false, error: "Unbalanced parentheses." };
    }
    const err = popOp();
    if (err) return err;
  }

  if (output.length !== 1) {
    return { ok: false, error: "Invalid formula." };
  }

  return { ok: true, value: output[0]! };
}

export function roundMoneyFormulaAmount(value: number): number {
  return Math.round(value);
}
