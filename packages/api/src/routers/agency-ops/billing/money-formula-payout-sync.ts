import { db } from "@orch/db";
import {
  agencyOpsMemberRate,
  agencyOpsPayoutLine,
  agencyOpsPayoutRun,
  agencyOpsPayoutSection,
  agencyOpsTimeEntry,
  user,
  workspaceTeamMember,
  type AgencyOpsMoneyFormulaDef,
  type AgencyOpsPayoutSectionKey,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, isNull, lte, sum } from "drizzle-orm";

import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";
import {
  buildMoneyFormulaContext,
  evaluateFormulaValue,
  type MoneyFormulaPeriodFacts,
} from "./money-formula-context";
import { enabledFormulasSnapshot } from "./money-formula-templates";
import { getMoneySettings } from "./money-settings-service";
import { sumExpensesInPeriod } from "./expense-service";
import { ensurePayoutPeriod, getPayoutSectionTotals, getPayoutSummary } from "./payout-service";
import { PAYOUT_SECTION_META } from "./payout-section-keys";
import { getInvoiceSummary } from "./service";

/** Formula sectionKey → Money Rules id used for eligibility. */
const SECTION_RULE_ID: Partial<Record<AgencyOpsPayoutSectionKey, string>> = {
  team_loss: "profit-loss-share",
  device_comp: "device-compensation",
  paid_vacation: "paid-vacation",
};

const MEMBER_SCOPED_SECTIONS = new Set<AgencyOpsPayoutSectionKey>(["paid_vacation", "device_comp"]);

function formulaLineLabel(formula: AgencyOpsMoneyFormulaDef): string {
  return `Formula · ${formula.label}`;
}

function isPayoutSectionKey(value: string): value is AgencyOpsPayoutSectionKey {
  return value in PAYOUT_SECTION_META;
}

async function ensureSection(
  runId: string,
  sectionKey: AgencyOpsPayoutSectionKey,
): Promise<{ id: string; key: AgencyOpsPayoutSectionKey; title: string }> {
  const [existing] = await db
    .select()
    .from(agencyOpsPayoutSection)
    .where(and(eq(agencyOpsPayoutSection.runId, runId), eq(agencyOpsPayoutSection.key, sectionKey)))
    .limit(1);
  if (existing) {
    return { id: existing.id, key: existing.key, title: existing.title };
  }
  const meta = PAYOUT_SECTION_META[sectionKey];
  const sectionId = createWorkspaceId("agency-payout-sec");
  await db.insert(agencyOpsPayoutSection).values({
    id: sectionId,
    runId,
    key: sectionKey,
    title: meta.title,
    sortOrder: meta.sortOrder,
  });
  return { id: sectionId, key: sectionKey, title: meta.title };
}

function resolveEligibleMemberIds(input: {
  sectionKey: AgencyOpsPayoutSectionKey;
  memberIdsByRuleId: Record<string, string[]> | undefined;
  allMemberIds: string[];
}): string[] | null {
  /** null → pool-scoped (no per-member lines). */
  if (!MEMBER_SCOPED_SECTIONS.has(input.sectionKey)) {
    const ruleId = SECTION_RULE_ID[input.sectionKey];
    const picked = ruleId ? input.memberIdsByRuleId?.[ruleId] : undefined;
    if (picked && picked.length > 0) return picked;
    return null;
  }

  const ruleId = SECTION_RULE_ID[input.sectionKey];
  const picked = ruleId ? input.memberIdsByRuleId?.[ruleId] : undefined;
  if (picked && picked.length > 0) return picked;
  return input.allMemberIds;
}

export async function syncFormulaPayoutLines(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    /** When true, refresh the pinned snapshot from current settings (draft runs only). */
    refreshSnapshot?: boolean;
  },
): Promise<{ upserted: number; skipped: number }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const run = await ensurePayoutPeriod(actorUserId, input);
  const [runRow] = await db
    .select()
    .from(agencyOpsPayoutRun)
    .where(eq(agencyOpsPayoutRun.id, run.id))
    .limit(1);
  if (!runRow) throw new ORPCError("INTERNAL_SERVER_ERROR");

  const settings = await getMoneySettings(actorUserId, { teamId: input.teamId });
  let formulas: AgencyOpsMoneyFormulaDef[] =
    runRow.formulaSnapshotJson ?? enabledFormulasSnapshot(settings.calcOptions.formulas ?? []);

  if (!runRow.formulaSnapshotJson || (input.refreshSnapshot && runRow.status === "draft")) {
    formulas = enabledFormulasSnapshot(settings.calcOptions.formulas ?? []);
    await db
      .update(agencyOpsPayoutRun)
      .set({ formulaSnapshotJson: formulas, updatedAt: new Date() })
      .where(eq(agencyOpsPayoutRun.id, run.id));
  }

  const sectionFormulas = formulas.filter(
    (formula) =>
      formula.enabled &&
      formula.sectionKey != null &&
      isPayoutSectionKey(formula.sectionKey) &&
      formula.sectionKey !== "salaries" &&
      formula.sectionKey !== "debt_discount",
  );

  if (sectionFormulas.length === 0) {
    return { upserted: 0, skipped: 0 };
  }

  const [invoiceSummary, payoutSummary, expenseTotals, sectionTotals, members, rates] =
    await Promise.all([
      getInvoiceSummary(actorUserId, input),
      getPayoutSummary(actorUserId, input),
      sumExpensesInPeriod(actorUserId, input),
      getPayoutSectionTotals(actorUserId, input),
      db
        .select({ userId: workspaceTeamMember.userId, name: user.name })
        .from(workspaceTeamMember)
        .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
        .where(eq(workspaceTeamMember.teamId, input.teamId)),
      db
        .select({
          userId: agencyOpsMemberRate.userId,
          costRateCents: agencyOpsMemberRate.costRateCents,
        })
        .from(agencyOpsMemberRate)
        .where(eq(agencyOpsMemberRate.teamId, input.teamId)),
    ]);

  const rateByUser = new Map(rates.map((row) => [row.userId, row.costRateCents ?? 0]));
  const allMemberIds = members.map((member) => member.userId);
  const memberNameById = new Map(
    members.map((member) => [member.userId, member.name?.trim() || "Unknown"]),
  );

  const paidVacationHours = (() => {
    const vacation = formulas.find((formula) => formula.key === "paid_vacation");
    const token = vacation?.tokens.find((item) => item.kind === "number");
    if (token && token.kind === "number") return token.value;
    const hours = settings.calcOptions.valueByOptionId?.["paid-vacation"];
    return typeof hours === "number" ? hours : 200;
  })();

  const baseFacts: MoneyFormulaPeriodFacts = {
    totalIncomeCents: invoiceSummary.billedCents,
    receivedCents: invoiceSummary.receivedCents,
    salariesCents: payoutSummary.salariesDueCents || sectionTotals.salaries,
    expensesCents: expenseTotals.amountCents,
    debtDiscountCents: sectionTotals.debt_discount,
    paidVacationCents: sectionTotals.paid_vacation,
    deviceCompCents: sectionTotals.device_comp,
    charityCents: sectionTotals.charity,
    pbcCents: sectionTotals.pbc,
    teamLossCents: sectionTotals.team_loss,
    paidVacationHours,
    cohortSize: allMemberIds.length,
  };

  let upserted = 0;
  let skipped = 0;

  for (const formula of sectionFormulas) {
    const sectionKey = formula.sectionKey as AgencyOpsPayoutSectionKey;
    const section = await ensureSection(run.id, sectionKey);
    const eligible = resolveEligibleMemberIds({
      sectionKey,
      memberIdsByRuleId: settings.rules.memberIdsByRuleId,
      allMemberIds,
    });

    const ruleId = SECTION_RULE_ID[sectionKey];
    const cohortKey = (ruleId ? settings.rules.cohortByRuleId?.[ruleId]?.trim() : null) || null;

    if (eligible === null) {
      const context = buildMoneyFormulaContext({
        ...baseFacts,
        cohortSize: allMemberIds.length,
      });
      const amount = evaluateFormulaValue(formula, context);
      if (amount === null || amount <= 0) continue;
      const label = formulaLineLabel(formula);
      const result = await upsertFormulaLine({
        sectionId: section.id,
        payeeUserId: null,
        label,
        amountCents: Math.round(amount),
        cohortKey,
      });
      if (result === "skipped") skipped += 1;
      else upserted += 1;
      continue;
    }

    for (const memberId of eligible) {
      const [durationRow] = await db
        .select({ total: sum(agencyOpsTimeEntry.durationSeconds) })
        .from(agencyOpsTimeEntry)
        .where(
          and(
            eq(agencyOpsTimeEntry.teamId, input.teamId),
            eq(agencyOpsTimeEntry.userId, memberId),
            isNull(agencyOpsTimeEntry.deletedAt),
            gte(agencyOpsTimeEntry.startedAt, periodStart),
            lte(agencyOpsTimeEntry.startedAt, periodEnd),
          ),
        );

      const context = buildMoneyFormulaContext({
        ...baseFacts,
        memberCostRateCents: rateByUser.get(memberId) ?? 0,
        memberHours: Number(durationRow?.total ?? 0) / 3600,
        cohortSize: eligible.length,
      });
      const amount = evaluateFormulaValue(formula, context);
      if (amount === null || amount <= 0) continue;

      const label = `${formulaLineLabel(formula)} · ${memberNameById.get(memberId) ?? "Member"}`;
      const result = await upsertFormulaLine({
        sectionId: section.id,
        payeeUserId: memberId,
        label,
        amountCents: Math.round(amount),
        cohortKey,
      });
      if (result === "skipped") skipped += 1;
      else upserted += 1;
    }
  }

  return { upserted, skipped };
}

async function upsertFormulaLine(input: {
  sectionId: string;
  payeeUserId: string | null;
  label: string;
  amountCents: number;
  cohortKey: string | null;
}): Promise<"upserted" | "skipped"> {
  if (input.payeeUserId) {
    const [existing] = await db
      .select()
      .from(agencyOpsPayoutLine)
      .where(
        and(
          eq(agencyOpsPayoutLine.sectionId, input.sectionId),
          eq(agencyOpsPayoutLine.payeeUserId, input.payeeUserId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.status === "partial" || existing.status === "paid") return "skipped";
      await db
        .update(agencyOpsPayoutLine)
        .set({
          amountCents: input.amountCents,
          label: input.label,
          cohortKey: input.cohortKey,
          updatedAt: new Date(),
        })
        .where(eq(agencyOpsPayoutLine.id, existing.id));
      return "upserted";
    }
  } else {
    const [existing] = await db
      .select()
      .from(agencyOpsPayoutLine)
      .where(
        and(
          eq(agencyOpsPayoutLine.sectionId, input.sectionId),
          eq(agencyOpsPayoutLine.label, input.label),
          isNull(agencyOpsPayoutLine.payeeUserId),
        ),
      )
      .limit(1);

    if (existing) {
      if (existing.status === "partial" || existing.status === "paid") return "skipped";
      await db
        .update(agencyOpsPayoutLine)
        .set({
          amountCents: input.amountCents,
          cohortKey: input.cohortKey,
          updatedAt: new Date(),
        })
        .where(eq(agencyOpsPayoutLine.id, existing.id));
      return "upserted";
    }
  }

  await db.insert(agencyOpsPayoutLine).values({
    id: createWorkspaceId("agency-payout-line"),
    sectionId: input.sectionId,
    payeeUserId: input.payeeUserId,
    label: input.label,
    cohortKey: input.cohortKey,
    amountCents: input.amountCents,
    paidCents: 0,
    status: "draft",
    durationSeconds: 0,
    rateCents: 0,
  });
  return "upserted";
}
