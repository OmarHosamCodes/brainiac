import { db } from "@orch/db";
import {
  agencyOpsMoneySettings,
  type AgencyOpsMoneyCalcOptionsJson,
  type AgencyOpsMoneyRulesJson,
} from "@orch/db/schema";
import { eq } from "drizzle-orm";

import { requireTeamMembership } from "../shared/membership";

const DEFAULT_RULES: AgencyOpsMoneyRulesJson = {
  enabledRuleIds: ["profit-loss-share", "rent-allowance"],
  notesByRuleId: {},
};

const DEFAULT_CALC: AgencyOpsMoneyCalcOptionsJson = {
  enabledOptionIds: [
    "roi-variables",
    "charity",
    "profit-loss-share",
    "paid-vacation",
    "device-compensation",
    "pbc",
  ],
  notesByOptionId: {},
};

export type AgencyMoneySettingsRecord = {
  teamId: string;
  rules: AgencyOpsMoneyRulesJson;
  calcOptions: AgencyOpsMoneyCalcOptionsJson;
  updatedAt: string;
};

function normalizeRules(value: unknown): AgencyOpsMoneyRulesJson {
  if (!value || typeof value !== "object") return DEFAULT_RULES;
  const record = value as Partial<AgencyOpsMoneyRulesJson>;
  return {
    enabledRuleIds: Array.isArray(record.enabledRuleIds)
      ? record.enabledRuleIds.filter((id): id is string => typeof id === "string")
      : DEFAULT_RULES.enabledRuleIds,
    notesByRuleId:
      record.notesByRuleId && typeof record.notesByRuleId === "object" ? record.notesByRuleId : {},
  };
}

function normalizeCalc(value: unknown): AgencyOpsMoneyCalcOptionsJson {
  if (!value || typeof value !== "object") return DEFAULT_CALC;
  const record = value as Partial<AgencyOpsMoneyCalcOptionsJson>;
  return {
    enabledOptionIds: Array.isArray(record.enabledOptionIds)
      ? record.enabledOptionIds.filter((id): id is string => typeof id === "string")
      : DEFAULT_CALC.enabledOptionIds,
    notesByOptionId:
      record.notesByOptionId && typeof record.notesByOptionId === "object"
        ? record.notesByOptionId
        : {},
  };
}

export async function getMoneySettings(
  actorUserId: string,
  input: { teamId: string },
): Promise<AgencyMoneySettingsRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [row] = await db
    .select()
    .from(agencyOpsMoneySettings)
    .where(eq(agencyOpsMoneySettings.teamId, input.teamId))
    .limit(1);

  if (!row) {
    return {
      teamId: input.teamId,
      rules: DEFAULT_RULES,
      calcOptions: DEFAULT_CALC,
      updatedAt: new Date(0).toISOString(),
    };
  }

  return {
    teamId: row.teamId,
    rules: normalizeRules(row.rulesJson),
    calcOptions: normalizeCalc(row.calcOptionsJson),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertMoneySettings(
  actorUserId: string,
  input: {
    teamId: string;
    rules: AgencyOpsMoneyRulesJson;
    calcOptions: AgencyOpsMoneyCalcOptionsJson;
  },
): Promise<AgencyMoneySettingsRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const rules = normalizeRules(input.rules);
  const calcOptions = normalizeCalc(input.calcOptions);
  const now = new Date();

  const [row] = await db
    .insert(agencyOpsMoneySettings)
    .values({
      teamId: input.teamId,
      rulesJson: rules,
      calcOptionsJson: calcOptions,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: agencyOpsMoneySettings.teamId,
      set: {
        rulesJson: rules,
        calcOptionsJson: calcOptions,
        updatedAt: now,
      },
    })
    .returning();

  return {
    teamId: input.teamId,
    rules,
    calcOptions,
    updatedAt: (row?.updatedAt ?? now).toISOString(),
  };
}
