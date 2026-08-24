import type { AgencyOpsPayoutSectionKey } from "@orch/db/schema";

export const DEFAULT_SECTION_RULE_ID: Partial<Record<AgencyOpsPayoutSectionKey, string>> = {
  team_loss: "profit-loss-share",
  device_comp: "device-compensation",
  paid_vacation: "paid-vacation",
};

const MEMBER_SCOPED_SECTIONS = new Set<AgencyOpsPayoutSectionKey>(["paid_vacation", "device_comp"]);

const MEMBER_PICK_RULE_IDS = new Set(["rent-allowance", "device-compensation", "paid-vacation"]);

export function resolveFormulaRuleId(formula: {
  ruleId?: string | null;
  sectionKey?: string | null;
}): string | null {
  const bound = formula.ruleId?.trim();
  if (bound) return bound;
  const sectionKey = formula.sectionKey;
  if (!sectionKey) return null;
  return DEFAULT_SECTION_RULE_ID[sectionKey as AgencyOpsPayoutSectionKey] ?? null;
}

function isMemberPickRule(
  ruleId: string,
  memberIdsByRuleId: Record<string, string[]> | undefined,
): boolean {
  if (MEMBER_PICK_RULE_IDS.has(ruleId) || ruleId.startsWith("custom_")) return true;
  return Array.isArray(memberIdsByRuleId?.[ruleId]);
}

function isCustomRuleDisabled(ruleId: string, enabledRuleIds: string[]): boolean {
  return ruleId.startsWith("custom_") && !enabledRuleIds.includes(ruleId);
}

export function resolveEligibleMemberIds(input: {
  formula: { ruleId?: string | null; sectionKey?: string | null };
  sectionKey: AgencyOpsPayoutSectionKey;
  enabledRuleIds: string[];
  memberIdsByRuleId: Record<string, string[]> | undefined;
  allMemberIds: string[];
}): string[] | null {
  const ruleId = resolveFormulaRuleId({
    ...input.formula,
    sectionKey: input.formula.sectionKey ?? input.sectionKey,
  });

  if (ruleId && isCustomRuleDisabled(ruleId, input.enabledRuleIds)) {
    return [];
  }

  const picked = ruleId ? input.memberIdsByRuleId?.[ruleId] : undefined;
  if (picked && picked.length > 0) {
    const allow = new Set(input.allMemberIds);
    return picked.filter((id) => allow.has(id));
  }

  if (ruleId && isMemberPickRule(ruleId, input.memberIdsByRuleId)) {
    return [];
  }

  if (MEMBER_SCOPED_SECTIONS.has(input.sectionKey)) {
    return input.allMemberIds;
  }

  return null;
}

export function resolveRuleCohortKey(input: {
  formula: { ruleId?: string | null; sectionKey?: string | null };
  cohortByRuleId: Record<string, string> | undefined;
}): string | null {
  const ruleId = resolveFormulaRuleId(input.formula);
  const label = ruleId ? input.cohortByRuleId?.[ruleId]?.trim() : undefined;
  return label || null;
}

export function resolveRuleCohortSize(input: {
  formula: { ruleId?: string | null; sectionKey?: string | null };
  sectionKey: string | null;
  enabledRuleIds: string[];
  memberIdsByRuleId: Record<string, string[]> | undefined;
  allMemberIds: string[];
}): number {
  if (!input.sectionKey) {
    const ruleId = resolveFormulaRuleId(input.formula);
    const picked = ruleId ? input.memberIdsByRuleId?.[ruleId] : undefined;
    if (picked && picked.length > 0) return picked.length;
    return input.allMemberIds.length;
  }

  const eligible = resolveEligibleMemberIds({
    formula: input.formula,
    sectionKey: input.sectionKey as AgencyOpsPayoutSectionKey,
    enabledRuleIds: input.enabledRuleIds,
    memberIdsByRuleId: input.memberIdsByRuleId,
    allMemberIds: input.allMemberIds,
  });
  return eligible?.length ?? input.allMemberIds.length;
}
