import { describe, expect, test } from "bun:test";

import { applyFormulasToScoreboard } from "./money-formula-context";
import { evaluateMoneyFormulaTokens } from "./money-formula-eval";
import { validateMoneyFormulaTokens } from "./money-formula-tokens";
import { defaultMoneyFormulas, mergeMoneyFormulas } from "./money-formula-templates";

describe("validateMoneyFormulaTokens", () => {
  test("accepts simple expression", () => {
    expect(
      validateMoneyFormulaTokens([
        { kind: "var", id: "total_income" },
        { kind: "op", op: "-" },
        { kind: "var", id: "received" },
      ]),
    ).toEqual({ ok: true });
  });

  test("rejects unbalanced parens", () => {
    expect(
      validateMoneyFormulaTokens([
        { kind: "paren", value: "(" },
        { kind: "number", value: 1 },
      ]).ok,
    ).toBe(false);
  });

  test("rejects unknown var", () => {
    expect(validateMoneyFormulaTokens([{ kind: "var", id: "nope" }]).ok).toBe(false);
  });
});

describe("evaluateMoneyFormulaTokens", () => {
  test("respects precedence", () => {
    const result = evaluateMoneyFormulaTokens(
      [
        { kind: "number", value: 2 },
        { kind: "op", op: "+" },
        { kind: "number", value: 3 },
        { kind: "op", op: "*" },
        { kind: "number", value: 4 },
      ],
      {},
    );
    expect(result).toEqual({ ok: true, value: 14 });
  });

  test("evaluates remaining template", () => {
    const remaining = defaultMoneyFormulas().find((f) => f.key === "remaining")!;
    const result = evaluateMoneyFormulaTokens(remaining.tokens, {
      total_income: 1000,
      received: 400,
    });
    expect(result).toEqual({ ok: true, value: 600 });
  });

  test("division by zero", () => {
    const result = evaluateMoneyFormulaTokens(
      [
        { kind: "number", value: 1 },
        { kind: "op", op: "/" },
        { kind: "number", value: 0 },
      ],
      {},
    );
    expect(result.ok).toBe(false);
  });

  test("missing vars become zero", () => {
    const result = evaluateMoneyFormulaTokens([{ kind: "var", id: "salaries" }], {});
    expect(result).toEqual({ ok: true, value: 0 });
  });
});

describe("applyFormulasToScoreboard", () => {
  test("falls back when formula disabled", () => {
    const formulas = defaultMoneyFormulas().map((formula) =>
      formula.key === "roi" ? { ...formula, enabled: false } : formula,
    );
    const board = applyFormulasToScoreboard(
      {
        billablePoolCents: 100_00,
        receivedCents: 40_00,
        invoicedRemainingCents: 60_00,
        salariesDueCents: 20_00,
        expensesAmountCents: 10_00,
        debtDiscountCents: 0,
        paidVacationCents: 0,
        deviceCompCents: 0,
        charityCents: 0,
        pbcCents: 0,
        teamLossCents: 0,
        currency: "USD",
      },
      formulas,
      200,
    );
    expect(board.remainingCents).toBe(60_00);
    expect(board.roi).toBeCloseTo(0.7);
  });

  test("applies custom remaining tokens", () => {
    const formulas = defaultMoneyFormulas().map((formula) =>
      formula.key === "remaining"
        ? {
            ...formula,
            tokens: [
              { kind: "var" as const, id: "total_income" },
              { kind: "op" as const, op: "-" as const },
              { kind: "number" as const, value: 1000 },
            ],
          }
        : formula,
    );
    const board = applyFormulasToScoreboard(
      {
        billablePoolCents: 5000,
        receivedCents: 0,
        invoicedRemainingCents: 0,
        salariesDueCents: 0,
        expensesAmountCents: 0,
        debtDiscountCents: 0,
        paidVacationCents: 0,
        deviceCompCents: 0,
        charityCents: 0,
        pbcCents: 0,
        teamLossCents: 0,
        currency: "USD",
      },
      formulas,
      200,
    );
    expect(board.remainingCents).toBe(4000);
  });
});

describe("mergeMoneyFormulas", () => {
  test("defaults to system templates", () => {
    const formulas = mergeMoneyFormulas(undefined);
    expect(formulas.every((f) => f.locked)).toBe(true);
    expect(formulas.map((f) => f.key)).toContain("roi");
  });

  test("preserves custom and edited system enable", () => {
    const formulas = mergeMoneyFormulas([
      {
        id: "sys_roi",
        key: "roi",
        label: "ROI",
        locked: true,
        enabled: false,
        tokens: [
          { kind: "var", id: "team_profit" },
          { kind: "op", op: "/" },
          { kind: "var", id: "total_income" },
        ],
        output: "ratio",
        metricId: "roi",
        sectionKey: null,
      },
      {
        id: "custom_1",
        key: "custom_bonus",
        label: "Bonus pool",
        locked: false,
        enabled: true,
        tokens: [{ kind: "number", value: 5000 }],
        output: "cents",
        metricId: null,
        sectionKey: "pbc",
      },
    ]);
    expect(formulas.find((f) => f.key === "roi")?.enabled).toBe(false);
    expect(formulas.find((f) => f.key === "custom_bonus")?.label).toBe("Bonus pool");
  });

  test("migrates legacy enabledOptionIds", () => {
    const formulas = mergeMoneyFormulas(undefined, {
      enabledOptionIds: ["roi-variables", "charity"],
      valueByOptionId: { "paid-vacation": 160 },
    });
    expect(formulas.find((f) => f.key === "roi")?.enabled).toBe(true);
    expect(formulas.find((f) => f.key === "pbc")?.enabled).toBe(false);
    const vacation = formulas.find((f) => f.key === "paid_vacation")!;
    expect(vacation.tokens[0]).toEqual({ kind: "number", value: 160 });
  });
});
