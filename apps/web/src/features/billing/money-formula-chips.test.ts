import { describe, expect, test } from "bun:test";

import {
  majorToFormulaAmount,
  moneyFormulaNumberChipUnit,
  moneyFormulaTokenLabel,
  summarizeMoneyFormulaTokens,
  type MoneyFormulaToken,
} from "./money-formula-chips";

describe("moneyFormulaNumberChipUnit", () => {
  test("treats fixed amount literals as amount chips", () => {
    const tokens: MoneyFormulaToken[] = [{ kind: "number", value: 1_000 }];
    expect(moneyFormulaNumberChipUnit(tokens, 0, "amount")).toBe("amount");
  });

  test("keeps profit-share divisor scalar", () => {
    const tokens: MoneyFormulaToken[] = [
      { kind: "var", id: "team_profit" },
      { kind: "op", op: "/" },
      { kind: "number", value: 2 },
    ];
    expect(moneyFormulaNumberChipUnit(tokens, 2, "amount")).toBe("scalar");
  });

  test("keeps legacy paid-vacation hours scalar", () => {
    const tokens: MoneyFormulaToken[] = [
      { kind: "number", value: 160 },
      { kind: "op", op: "*" },
      { kind: "var", id: "member_cost_rate_amount" },
    ];
    expect(moneyFormulaNumberChipUnit(tokens, 0, "amount")).toBe("scalar");
  });
});

describe("moneyFormulaTokenLabel", () => {
  test("formats amount chips in major currency units", () => {
    const tokens: MoneyFormulaToken[] = [{ kind: "number", value: 1_000 }];
    expect(
      moneyFormulaTokenLabel(tokens[0]!, {
        tokens,
        index: 0,
        output: "amount",
        currency: "EGP",
      }),
    ).toContain("10");
  });
});

describe("summarizeMoneyFormulaTokens", () => {
  test("shows profit share divisor without currency formatting", () => {
    const tokens: MoneyFormulaToken[] = [
      { kind: "var", id: "team_profit" },
      { kind: "op", op: "/" },
      { kind: "number", value: 2 },
    ];
    expect(summarizeMoneyFormulaTokens(tokens, { output: "amount", currency: "EGP" })).toBe(
      "Team profit ÷ 2",
    );
  });
});

describe("majorToFormulaAmount", () => {
  test("stores 10 EGP as 1000 minor units", () => {
    expect(majorToFormulaAmount(10)).toBe(1_000);
  });
});
