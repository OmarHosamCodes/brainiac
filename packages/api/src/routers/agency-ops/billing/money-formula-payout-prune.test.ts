import { describe, expect, test } from "bun:test";

import { staleFormulaPayoutLineIds } from "./money-formula-payout-prune";

describe("staleFormulaPayoutLineIds", () => {
  const enabled = new Set(["formula_transport:pbc"]);

  test("drops unpaid lines whose formula was disabled", () => {
    expect(
      staleFormulaPayoutLineIds({
        enabledSectionFormulaKeys: enabled,
        lines: [
          {
            id: "keep",
            sourceFormulaId: "formula_transport",
            sectionKey: "pbc",
            status: "draft",
          },
          {
            id: "stale",
            sourceFormulaId: "formula_old",
            sectionKey: "pbc",
            status: "draft",
          },
        ],
      }),
    ).toEqual(["stale"]);
  });

  test("keeps paid and partial lines until dismissed", () => {
    expect(
      staleFormulaPayoutLineIds({
        enabledSectionFormulaKeys: new Set(),
        lines: [
          {
            id: "paid",
            sourceFormulaId: "formula_old",
            sectionKey: "pbc",
            status: "paid",
          },
          {
            id: "partial",
            sourceFormulaId: "formula_old",
            sectionKey: "pbc",
            status: "partial",
          },
          {
            id: "draft",
            sourceFormulaId: "formula_old",
            sectionKey: "pbc",
            status: "draft",
          },
        ],
      }),
    ).toEqual(["draft"]);
  });

  test("ignores manual lines with no formula source", () => {
    expect(
      staleFormulaPayoutLineIds({
        enabledSectionFormulaKeys: new Set(),
        lines: [
          {
            id: "manual",
            sourceFormulaId: null,
            sectionKey: "pbc",
            status: "draft",
          },
        ],
      }),
    ).toEqual([]);
  });
});
