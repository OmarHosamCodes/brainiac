import { describe, expect, test } from "bun:test";

import type { MoneyStatsMetricFixture } from "@/features/billing/money-stats-fixtures";

import { moneyStatsPlateSignal, sharesAgainstMax } from "./money-stats-plate-signal";

function metric(id: MoneyStatsMetricFixture["id"], amount: number): MoneyStatsMetricFixture {
  return { id, label: id, kind: id === "roi" ? "percent" : "currency", amount };
}

describe("sharesAgainstMax", () => {
  test("returns zeros when all amounts are zero", () => {
    expect(sharesAgainstMax([0, 0, 0])).toEqual([0, 0, 0]);
  });

  test("scales against the max amount", () => {
    expect(sharesAgainstMax([10, 5, 0])).toEqual([1, 0.5, 0]);
  });

  test("clamps negatives to zero", () => {
    expect(sharesAgainstMax([-4, 8])).toEqual([0, 1]);
  });
});

describe("moneyStatsPlateSignal", () => {
  test("income: no total → info and zero fill", () => {
    const signal = moneyStatsPlateSignal(
      "income-cash",
      [metric("total-income", 0), metric("received", 0), metric("remaining", 0)],
      0,
    );
    expect(signal.tone).toBe("info");
    expect(signal.glyph).toEqual({ kind: "income", collectedRatio: 0 });
  });

  test("income: partial collection → warning", () => {
    const signal = moneyStatsPlateSignal(
      "income-cash",
      [metric("total-income", 100), metric("received", 40), metric("remaining", 60)],
      0.4,
    );
    expect(signal.tone).toBe("warning");
    expect(signal.glyph).toEqual({ kind: "income", collectedRatio: 0.4 });
  });

  test("income: fully collected → success", () => {
    const signal = moneyStatsPlateSignal(
      "income-cash",
      [metric("total-income", 100), metric("received", 100), metric("remaining", 0)],
      1,
    );
    expect(signal.tone).toBe("success");
    expect(signal.glyph).toEqual({ kind: "income", collectedRatio: 1 });
  });

  test("deductions: always neutral with three bar shares", () => {
    const signal = moneyStatsPlateSignal(
      "deductions",
      [
        metric("salaries", 80),
        metric("expenses", 40),
        metric("debt-discount", 10),
        metric("paid-vacation", 10),
      ],
      null,
    );
    expect(signal.tone).toBe("neutral");
    expect(signal.glyph).toEqual({
      kind: "deductions",
      bars: [1, 0.5, 0.25],
    });
  });

  test("profitability: profit <= 0 → danger and zero arc", () => {
    const signal = moneyStatsPlateSignal(
      "profitability",
      [metric("team-profit", -10), metric("profit-loss-share", 0), metric("roi", -0.2)],
      null,
    );
    expect(signal.tone).toBe("danger");
    expect(signal.glyph).toEqual({ kind: "profitability", arcRatio: 0 });
  });

  test("profitability: profit > 0 and ROI < 0 → warning", () => {
    const signal = moneyStatsPlateSignal(
      "profitability",
      [metric("team-profit", 50), metric("profit-loss-share", 25), metric("roi", -0.1)],
      null,
    );
    expect(signal.tone).toBe("warning");
    expect(signal.glyph.kind).toBe("profitability");
    if (signal.glyph.kind === "profitability") {
      expect(signal.glyph.arcRatio).toBeGreaterThanOrEqual(0.15);
      expect(signal.glyph.arcRatio).toBeLessThanOrEqual(1);
    }
  });

  test("profitability: healthy profit and ROI → success", () => {
    const half = moneyStatsPlateSignal(
      "profitability",
      [metric("team-profit", 50), metric("profit-loss-share", 25), metric("roi", 0.5)],
      null,
    );
    expect(half.tone).toBe("success");
    expect(half.glyph).toEqual({ kind: "profitability", arcRatio: 0.575 });

    const full = moneyStatsPlateSignal(
      "profitability",
      [metric("team-profit", 50), metric("profit-loss-share", 25), metric("roi", 1)],
      null,
    );
    expect(full.glyph).toEqual({ kind: "profitability", arcRatio: 1 });
  });

  test("allocations: all zero → neutral quiet blocks", () => {
    const signal = moneyStatsPlateSignal(
      "allocations",
      [metric("device-compensation", 0), metric("charity", 0), metric("pbc", 0)],
      null,
    );
    expect(signal.tone).toBe("neutral");
    expect(signal.glyph).toEqual({ kind: "allocations", blocks: [0, 0, 0] });
  });

  test("allocations: any amount → info with shares", () => {
    const signal = moneyStatsPlateSignal(
      "allocations",
      [metric("device-compensation", 30), metric("charity", 15), metric("pbc", 0)],
      null,
    );
    expect(signal.tone).toBe("info");
    expect(signal.glyph).toEqual({ kind: "allocations", blocks: [1, 0.5, 0] });
  });
});
