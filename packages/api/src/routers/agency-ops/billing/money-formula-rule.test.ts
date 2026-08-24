import { describe, expect, test } from "bun:test";

import {
  resolveEligibleMemberIds,
  resolveFormulaRuleId,
  resolveRuleCohortKey,
} from "./money-formula-rule";

describe("resolveFormulaRuleId", () => {
  test("prefers the formula's bound rule over the section default", () => {
    expect(
      resolveFormulaRuleId({
        ruleId: "custom_transport",
        sectionKey: "team_loss",
      }),
    ).toBe("custom_transport");
  });

  test("falls back to the section mapping when ruleId is empty", () => {
    expect(resolveFormulaRuleId({ ruleId: null, sectionKey: "team_loss" })).toBe(
      "profit-loss-share",
    );
    expect(resolveFormulaRuleId({ ruleId: "  ", sectionKey: "device_comp" })).toBe(
      "device-compensation",
    );
    expect(resolveFormulaRuleId({ ruleId: null, sectionKey: "charity" })).toBeNull();
  });
});

describe("resolveEligibleMemberIds", () => {
  const allMemberIds = ["a", "b", "c"];

  test("uses the bound rule's members for a custom allowance", () => {
    expect(
      resolveEligibleMemberIds({
        formula: { ruleId: "custom_transport", sectionKey: "device_comp" },
        sectionKey: "device_comp",
        enabledRuleIds: ["custom_transport"],
        memberIdsByRuleId: { custom_transport: ["b", "c"] },
        allMemberIds,
      }),
    ).toEqual(["b", "c"]);
  });

  test("skips a disabled custom rule", () => {
    expect(
      resolveEligibleMemberIds({
        formula: { ruleId: "custom_transport", sectionKey: "device_comp" },
        sectionKey: "device_comp",
        enabledRuleIds: ["profit-loss-share"],
        memberIdsByRuleId: { custom_transport: ["b"] },
        allMemberIds,
      }),
    ).toEqual([]);
  });

  test("member-pick rules with no members pay nobody", () => {
    expect(
      resolveEligibleMemberIds({
        formula: { ruleId: "rent-allowance", sectionKey: "device_comp" },
        sectionKey: "device_comp",
        enabledRuleIds: ["rent-allowance"],
        memberIdsByRuleId: { "rent-allowance": [] },
        allMemberIds,
      }),
    ).toEqual([]);
  });

  test("pool sections without picked members stay pool-scoped", () => {
    expect(
      resolveEligibleMemberIds({
        formula: { ruleId: "profit-loss-share", sectionKey: "team_loss" },
        sectionKey: "team_loss",
        enabledRuleIds: ["profit-loss-share"],
        memberIdsByRuleId: {},
        allMemberIds,
      }),
    ).toBeNull();
  });

  test("legacy section mapping still applies when ruleId is omitted", () => {
    expect(
      resolveEligibleMemberIds({
        formula: { ruleId: null, sectionKey: "paid_vacation" },
        sectionKey: "paid_vacation",
        enabledRuleIds: ["profit-loss-share"],
        memberIdsByRuleId: { "paid-vacation": ["a"] },
        allMemberIds,
      }),
    ).toEqual(["a"]);
  });
});

describe("resolveRuleCohortKey", () => {
  test("reads the bound rule's cohort label", () => {
    expect(
      resolveRuleCohortKey({
        formula: { ruleId: "custom_transport", sectionKey: null },
        cohortByRuleId: { custom_transport: "TRANS" },
      }),
    ).toBe("TRANS");
  });
});
