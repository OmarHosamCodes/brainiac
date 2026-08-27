import { describe, expect, test } from "bun:test";

import {
  liveSectionFormulaKeys,
  payoutLineMayDelete,
  shouldRefreshFormulaSnapshot,
  staleFormulaPayoutLineIds,
} from "./money-formula-payout-prune";

describe("shouldRefreshFormulaSnapshot", () => {
  test("writes a snapshot when none is pinned yet", () => {
    expect(
      shouldRefreshFormulaSnapshot({
        hasPinnedSnapshot: false,
        refreshSnapshot: false,
        runStatus: "paying",
      }),
    ).toBe(true);
  });

  test("rewrites snapshot only for draft runs", () => {
    expect(
      shouldRefreshFormulaSnapshot({
        hasPinnedSnapshot: true,
        refreshSnapshot: true,
        runStatus: "draft",
      }),
    ).toBe(true);
    expect(
      shouldRefreshFormulaSnapshot({
        hasPinnedSnapshot: true,
        refreshSnapshot: true,
        runStatus: "paying",
      }),
    ).toBe(false);
    expect(
      shouldRefreshFormulaSnapshot({
        hasPinnedSnapshot: true,
        refreshSnapshot: true,
        runStatus: "paid",
      }),
    ).toBe(false);
  });
});

describe("liveSectionFormulaKeys", () => {
  test("includes enabled synced sections from live settings, not the snapshot", () => {
    expect(
      liveSectionFormulaKeys([
        { id: "pbc", enabled: true, sectionKey: "pbc" },
        { id: "charity", enabled: false, sectionKey: "charity" },
        { id: "salaries", enabled: true, sectionKey: "salaries" },
      ]),
    ).toEqual(new Set(["pbc:pbc"]));
  });
});

describe("payoutLineMayDelete", () => {
  const enabled = new Set(["formula_transport:pbc"]);

  test("refuses salaries and other non-adjustment sections", () => {
    expect(
      payoutLineMayDelete({
        sectionKey: "salaries",
        sourceFormulaId: null,
        enabledSectionFormulaKeys: enabled,
      }),
    ).toBe(false);
    expect(
      payoutLineMayDelete({
        sectionKey: "device_comp",
        sourceFormulaId: "formula_device",
        enabledSectionFormulaKeys: new Set(),
      }),
    ).toBe(false);
  });

  test("allows manual adjustment lines", () => {
    expect(
      payoutLineMayDelete({
        sectionKey: "pbc",
        sourceFormulaId: null,
        enabledSectionFormulaKeys: enabled,
      }),
    ).toBe(true);
  });

  test("refuses still-enabled formula lines and allows leftovers", () => {
    expect(
      payoutLineMayDelete({
        sectionKey: "pbc",
        sourceFormulaId: "formula_transport",
        enabledSectionFormulaKeys: enabled,
      }),
    ).toBe(false);
    expect(
      payoutLineMayDelete({
        sectionKey: "pbc",
        sourceFormulaId: "formula_old",
        enabledSectionFormulaKeys: enabled,
      }),
    ).toBe(true);
  });
});

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
