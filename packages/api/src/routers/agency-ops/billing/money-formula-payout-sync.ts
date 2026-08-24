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
import { resolveEligibleMemberIds, resolveRuleCohortKey } from "./money-formula-rule";
import { getInvoiceSummary } from "./service";

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
          costRateAmount: agencyOpsMemberRate.costRateAmount,
        })
        .from(agencyOpsMemberRate)
        .where(eq(agencyOpsMemberRate.teamId, input.teamId)),
    ]);

  const rateByUser = new Map(rates.map((row) => [row.userId, row.costRateAmount ?? 0]));
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
    totalIncomeAmount: invoiceSummary.billedAmount,
    receivedAmount: invoiceSummary.receivedAmount,
    salariesAmount: payoutSummary.salariesDueAmount || sectionTotals.salaries,
    expensesAmount: expenseTotals.amount,
    debtDiscountAmount: sectionTotals.debt_discount,
    paidVacationAmount: sectionTotals.paid_vacation,
    deviceCompAmount: sectionTotals.device_comp,
    charityAmount: sectionTotals.charity,
    pbcAmount: sectionTotals.pbc,
    teamLossAmount: sectionTotals.team_loss,
    paidVacationHours,
    cohortSize: allMemberIds.length,
  };

  let upserted = 0;
  let skipped = 0;

  for (const formula of sectionFormulas) {
    const sectionKey = formula.sectionKey as AgencyOpsPayoutSectionKey;
    const section = await ensureSection(run.id, sectionKey);
    const eligible = resolveEligibleMemberIds({
      formula,
      sectionKey,
      enabledRuleIds: settings.rules.enabledRuleIds,
      memberIdsByRuleId: settings.rules.memberIdsByRuleId,
      allMemberIds,
    });
    const cohortKey = resolveRuleCohortKey({
      formula,
      cohortByRuleId: settings.rules.cohortByRuleId,
    });

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
        amount: Math.round(amount),
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
        memberCostRateAmount: rateByUser.get(memberId) ?? 0,
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
        amount: Math.round(amount),
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
  amount: number;
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
          amount: input.amount,
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
          amount: input.amount,
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
    amount: input.amount,
    paidAmount: 0,
    status: "draft",
    durationSeconds: 0,
    rateAmount: 0,
  });
  return "upserted";
}
