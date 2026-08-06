import { describe, expect, test } from "bun:test";

import {
  applyFormulaDraft,
  applyRuleDraft,
  createFormulaDraft,
  createNewCustomFormulaDraft,
  createNewCustomRuleDraft,
  createRuleDraft,
  defaultCalcState,
  defaultRulesState,
  listCustomMoneyRuleIds,
} from "./money-settings-form";

describe("money-settings-form", () => {
  test("createRuleDraft falls back to fixture cohort", () => {
    const draft = createRuleDraft(defaultRulesState(), "profit-loss-share");
    expect(draft.enabled).toBe(true);
    expect(draft.locked).toBe(true);
    expect(draft.label).toBe("Profit share / Loss share");
    expect(draft.cohort).toBe("All members except interns");
  });

  test("applyRuleDraft updates cohort and members", () => {
    const next = applyRuleDraft(defaultRulesState(), {
      kind: "rule",
      ruleId: "rent-allowance",
      label: "Rent allowance",
      locked: true,
      supportsMemberPick: true,
      enabled: true,
      cohort: "Office cohort",
      memberIds: ["u1", "u2"],
    });
    expect(next.cohortByRuleId?.["rent-allowance"]).toBe("Office cohort");
    expect(next.memberIdsByRuleId?.["rent-allowance"]).toEqual(["u1", "u2"]);
    expect(next.labelByRuleId?.["rent-allowance"]).toBeUndefined();
  });

  test("applyRuleDraft can disable a rule", () => {
    const next = applyRuleDraft(defaultRulesState(), {
      kind: "rule",
      ruleId: "rent-allowance",
      label: "Rent allowance",
      locked: true,
      supportsMemberPick: true,
      enabled: false,
      cohort: "Office cohort",
      memberIds: [],
    });
    expect(next.enabledRuleIds.includes("rent-allowance")).toBe(false);
  });

  test("createNewCustomRuleDraft starts unlocked with member pick", () => {
    const draft = createNewCustomRuleDraft();
    expect(draft.kind).toBe("rule");
    expect(draft.locked).toBe(false);
    expect(draft.supportsMemberPick).toBe(true);
    expect(draft.enabled).toBe(true);
    expect(draft.ruleId.startsWith("custom_")).toBe(true);
    expect(draft.label).toBe("Custom rule");
    expect(draft.cohort).toBe("");
  });

  test("applyRuleDraft persists custom label and lists the rule", () => {
    const draft = createNewCustomRuleDraft();
    draft.label = "Housing stipend";
    draft.cohort = "Selected members";
    draft.memberIds = ["u9"];
    const next = applyRuleDraft(defaultRulesState(), draft);
    expect(next.labelByRuleId?.[draft.ruleId]).toBe("Housing stipend");
    expect(next.cohortByRuleId?.[draft.ruleId]).toBe("Selected members");
    expect(next.enabledRuleIds).toContain(draft.ruleId);
    expect(listCustomMoneyRuleIds(next)).toEqual([draft.ruleId]);
  });

  test("createNewCustomFormulaDraft starts enabled with a number chip", () => {
    const draft = createNewCustomFormulaDraft();
    expect(draft.kind).toBe("formula");
    expect(draft.formula.locked).toBe(false);
    expect(draft.formula.enabled).toBe(true);
    expect(draft.formula.tokens[0]).toEqual({ kind: "number", value: 0 });
  });

  test("applyFormulaDraft upserts formula and legacy vacation hours", () => {
    const draft = createFormulaDraft({
      id: "sys_paid_vacation",
      key: "paid_vacation",
      label: "Paid vacation",
      locked: true,
      enabled: true,
      tokens: [
        { kind: "number", value: 160 },
        { kind: "op", op: "*" },
        { kind: "var", id: "member_cost_rate_amount" },
      ],
      output: "amount",
      metricId: "paid-vacation",
      sectionKey: "paid_vacation",
    });
    const next = applyFormulaDraft(defaultCalcState(), draft);
    expect(next.formulas?.find((formula) => formula.key === "paid_vacation")?.tokens[0]).toEqual({
      kind: "number",
      value: 160,
    });
    expect(next.valueByOptionId?.["paid-vacation"]).toBe(160);
    expect(next.enabledOptionIds).toContain("paid-vacation");
  });
});
