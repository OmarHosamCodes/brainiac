import { db } from "@orch/db";
import {
  agencyOpsMemberRate,
  agencyOpsPayoutLine,
  agencyOpsPayoutRun,
  agencyOpsPayoutSection,
  agencyOpsTimeEntry,
  user,
  type AgencyOpsPayoutLineStatus,
  type AgencyOpsPayoutRunStatus,
} from "@orch/db/schema";
import { and, eq, gte, ilike, inArray, isNull, lte, sum } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { formatAvatarUrl } from "../shared/avatar-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";
import { payoutAmountCentsFromActivity } from "./payout-amount-from-activity";
import {
  payoutBillStatus,
  payoutLineStatusAfterPaid,
  payoutRemainingCents,
  payoutRunStatusFromLines,
  payoutStatusesForBillFilter,
  type PayoutBillStatus,
} from "./payout-bill-status";

export type AgencyPayoutLineRecord = {
  id: string;
  runId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  label: string;
  status: AgencyOpsPayoutLineStatus;
  billStatus: PayoutBillStatus;
  amountCents: number;
  paidCents: number;
  remainingCents: number;
  currency: string;
  durationSeconds: number;
  rateCents: number;
  periodStart: string;
  periodEnd: string;
};

export type AgencyPayoutRunRecord = {
  id: string;
  teamId: string;
  status: AgencyOpsPayoutRunStatus;
  currency: string;
  periodStart: string;
  periodEnd: string;
  salariesSectionId: string;
};

function mapPayoutLineRow(input: {
  line: typeof agencyOpsPayoutLine.$inferSelect;
  run: typeof agencyOpsPayoutRun.$inferSelect;
  userName: string;
  userAvatar: string | null;
}): AgencyPayoutLineRecord {
  const paidCents = input.line.paidCents ?? 0;
  return {
    id: input.line.id,
    runId: input.run.id,
    userId: input.line.payeeUserId,
    userName: input.userName,
    userAvatar: input.userAvatar,
    label: input.line.label,
    status: input.line.status,
    billStatus: payoutBillStatus(input.line.status),
    amountCents: input.line.amountCents,
    paidCents,
    remainingCents: payoutRemainingCents(input.line.amountCents, paidCents),
    currency: input.run.currency,
    durationSeconds: input.line.durationSeconds,
    rateCents: input.line.rateCents,
    periodStart: input.run.periodStart.toISOString(),
    periodEnd: input.run.periodEnd.toISOString(),
  };
}

async function syncPayoutRunStatus(runId: string) {
  const lines = await db
    .select({ status: agencyOpsPayoutLine.status })
    .from(agencyOpsPayoutLine)
    .innerJoin(agencyOpsPayoutSection, eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId))
    .where(eq(agencyOpsPayoutSection.runId, runId));

  const nextStatus = payoutRunStatusFromLines(lines);
  await db
    .update(agencyOpsPayoutRun)
    .set({ status: nextStatus, updatedAt: new Date() })
    .where(eq(agencyOpsPayoutRun.id, runId));
}

export async function ensurePayoutPeriod(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    currency?: string;
  },
): Promise<AgencyPayoutRunRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const [existing] = await db
    .select({
      run: agencyOpsPayoutRun,
      sectionId: agencyOpsPayoutSection.id,
    })
    .from(agencyOpsPayoutRun)
    .innerJoin(
      agencyOpsPayoutSection,
      and(
        eq(agencyOpsPayoutSection.runId, agencyOpsPayoutRun.id),
        eq(agencyOpsPayoutSection.key, "salaries"),
      ),
    )
    .where(
      and(
        eq(agencyOpsPayoutRun.teamId, input.teamId),
        eq(agencyOpsPayoutRun.periodStart, periodStart),
        eq(agencyOpsPayoutRun.periodEnd, periodEnd),
      ),
    )
    .limit(1);

  if (existing) {
    return {
      id: existing.run.id,
      teamId: existing.run.teamId,
      status: existing.run.status,
      currency: existing.run.currency,
      periodStart: existing.run.periodStart.toISOString(),
      periodEnd: existing.run.periodEnd.toISOString(),
      salariesSectionId: existing.sectionId,
    };
  }

  const runId = createWorkspaceId("agency-payout-run");
  const sectionId = createWorkspaceId("agency-payout-sec");
  const currency = input.currency ?? "USD";

  await db.transaction(async (tx) => {
    await tx.insert(agencyOpsPayoutRun).values({
      id: runId,
      teamId: input.teamId,
      periodStart,
      periodEnd,
      status: "draft",
      currency,
      createdByUserId: actorUserId,
    });
    await tx.insert(agencyOpsPayoutSection).values({
      id: sectionId,
      runId,
      key: "salaries",
      title: "Salaries",
      sortOrder: 0,
    });
  });

  return {
    id: runId,
    teamId: input.teamId,
    status: "draft",
    currency,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    salariesSectionId: sectionId,
  };
}

export async function listPayoutLines(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    billStatus?: PayoutBillStatus;
    search?: string;
  },
): Promise<{ items: AgencyPayoutLineRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const filters = [
    eq(agencyOpsPayoutRun.teamId, input.teamId),
    eq(agencyOpsPayoutRun.periodStart, periodStart),
    eq(agencyOpsPayoutRun.periodEnd, periodEnd),
  ];

  if (input.billStatus) {
    filters.push(
      inArray(agencyOpsPayoutLine.status, payoutStatusesForBillFilter(input.billStatus)),
    );
  }

  const searchTerm = input.search?.trim();
  if (searchTerm) {
    filters.push(ilike(user.name, `%${searchTerm}%`));
  }

  const rows = await db
    .select({
      line: agencyOpsPayoutLine,
      run: agencyOpsPayoutRun,
      userName: user.name,
      userAvatar: user.image,
    })
    .from(agencyOpsPayoutLine)
    .innerJoin(agencyOpsPayoutSection, eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId))
    .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsPayoutSection.runId))
    .innerJoin(user, eq(user.id, agencyOpsPayoutLine.payeeUserId))
    .where(and(...filters));

  const items = rows
    .map((row) =>
      mapPayoutLineRow({
        line: row.line,
        run: row.run,
        userName: row.userName?.trim() || "Unknown",
        userAvatar: formatAvatarUrl(row.userAvatar),
      }),
    )
    .sort((a, b) => a.userName.localeCompare(b.userName));

  return { items };
}

export async function createPayoutLineFromMember(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    periodStart: string;
    periodEnd: string;
    currency?: string;
  },
): Promise<AgencyPayoutLineRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const [member] = await db
    .select({ id: user.id, name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);
  if (!member) {
    throw new ORPCError("NOT_FOUND", { message: "Team member was not found." });
  }

  const [rateRow] = await db
    .select({
      costRateCents: agencyOpsMemberRate.costRateCents,
      currency: agencyOpsMemberRate.currency,
    })
    .from(agencyOpsMemberRate)
    .where(
      and(
        eq(agencyOpsMemberRate.teamId, input.teamId),
        eq(agencyOpsMemberRate.userId, input.userId),
      ),
    )
    .limit(1);

  if (rateRow?.costRateCents == null) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Set a cost rate for this member before drafting a payout.",
    });
  }

  const [durationRow] = await db
    .select({ total: sum(agencyOpsTimeEntry.durationSeconds) })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsTimeEntry.userId, input.userId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, periodStart),
        lte(agencyOpsTimeEntry.startedAt, periodEnd),
      ),
    );

  const durationSeconds = Number(durationRow?.total ?? 0);
  if (durationSeconds <= 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Member has no tracked time in this period.",
    });
  }

  const amountCents = payoutAmountCentsFromActivity(durationSeconds, rateRow.costRateCents);
  if (amountCents <= 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Computed payout amount is zero. Check cost rate and tracked time.",
    });
  }

  const run = await ensurePayoutPeriod(actorUserId, {
    teamId: input.teamId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    currency: input.currency ?? rateRow.currency ?? "USD",
  });

  const [existingLine] = await db
    .select({ id: agencyOpsPayoutLine.id })
    .from(agencyOpsPayoutLine)
    .where(
      and(
        eq(agencyOpsPayoutLine.sectionId, run.salariesSectionId),
        eq(agencyOpsPayoutLine.payeeUserId, input.userId),
      ),
    )
    .limit(1);

  if (existingLine) {
    throw new ORPCError("CONFLICT", {
      message: "A payout line already exists for this member in the period.",
    });
  }

  const userName = member.name?.trim() || "Unknown";
  const lineId = createWorkspaceId("agency-payout-line");
  const [inserted] = await db
    .insert(agencyOpsPayoutLine)
    .values({
      id: lineId,
      sectionId: run.salariesSectionId,
      payeeUserId: input.userId,
      label: `Salary · ${userName}`,
      amountCents,
      paidCents: 0,
      status: "draft",
      durationSeconds,
      rateCents: rateRow.costRateCents,
    })
    .returning();

  if (!inserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  await syncPayoutRunStatus(run.id);

  const [runRow] = await db
    .select()
    .from(agencyOpsPayoutRun)
    .where(eq(agencyOpsPayoutRun.id, run.id))
    .limit(1);
  if (!runRow) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapPayoutLineRow({
    line: inserted,
    run: runRow,
    userName,
    userAvatar: formatAvatarUrl(member.image),
  });
}

async function loadPayoutLineForTeam(
  teamId: string,
  lineId: string,
): Promise<{
  line: typeof agencyOpsPayoutLine.$inferSelect;
  run: typeof agencyOpsPayoutRun.$inferSelect;
  userName: string;
  userAvatar: string | null;
} | null> {
  const [row] = await db
    .select({
      line: agencyOpsPayoutLine,
      run: agencyOpsPayoutRun,
      userName: user.name,
      userAvatar: user.image,
    })
    .from(agencyOpsPayoutLine)
    .innerJoin(agencyOpsPayoutSection, eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId))
    .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsPayoutSection.runId))
    .innerJoin(user, eq(user.id, agencyOpsPayoutLine.payeeUserId))
    .where(and(eq(agencyOpsPayoutLine.id, lineId), eq(agencyOpsPayoutRun.teamId, teamId)))
    .limit(1);

  if (!row) return null;
  return {
    line: row.line,
    run: row.run,
    userName: row.userName?.trim() || "Unknown",
    userAvatar: formatAvatarUrl(row.userAvatar),
  };
}

export async function recordPayoutPayment(
  actorUserId: string,
  input: { teamId: string; lineId: string; amountCents: number },
): Promise<AgencyPayoutLineRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (input.amountCents <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Payment amount must be greater than zero." });
  }

  const existing = await loadPayoutLineForTeam(input.teamId, input.lineId);
  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Payout line was not found." });
  }

  if (existing.line.status === "paid") {
    throw new ORPCError("BAD_REQUEST", { message: "Payout line is already paid in full." });
  }

  const remaining = payoutRemainingCents(existing.line.amountCents, existing.line.paidCents);
  if (input.amountCents > remaining) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Payment amount exceeds remaining balance.",
    });
  }

  const nextPaid = existing.line.paidCents + input.amountCents;
  const nextStatus = payoutLineStatusAfterPaid(existing.line.amountCents, nextPaid);

  const [updated] = await db
    .update(agencyOpsPayoutLine)
    .set({
      paidCents: nextPaid,
      status: nextStatus,
      updatedAt: new Date(),
    })
    .where(eq(agencyOpsPayoutLine.id, input.lineId))
    .returning();

  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  await syncPayoutRunStatus(existing.run.id);

  const [runRow] = await db
    .select()
    .from(agencyOpsPayoutRun)
    .where(eq(agencyOpsPayoutRun.id, existing.run.id))
    .limit(1);
  if (!runRow) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapPayoutLineRow({
    line: updated,
    run: runRow,
    userName: existing.userName,
    userAvatar: existing.userAvatar,
  });
}

export async function updatePayoutLineStatus(
  actorUserId: string,
  input: { teamId: string; lineId: string; status: "paid" | "draft" },
): Promise<AgencyPayoutLineRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const existing = await loadPayoutLineForTeam(input.teamId, input.lineId);
  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Payout line was not found." });
  }

  const patch: Partial<typeof agencyOpsPayoutLine.$inferInsert> = {
    status: input.status,
    updatedAt: new Date(),
  };
  if (input.status === "paid") {
    patch.paidCents = existing.line.amountCents;
  } else {
    patch.paidCents = 0;
  }

  const [updated] = await db
    .update(agencyOpsPayoutLine)
    .set(patch)
    .where(eq(agencyOpsPayoutLine.id, input.lineId))
    .returning();

  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  await syncPayoutRunStatus(existing.run.id);

  const [runRow] = await db
    .select()
    .from(agencyOpsPayoutRun)
    .where(eq(agencyOpsPayoutRun.id, existing.run.id))
    .limit(1);
  if (!runRow) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapPayoutLineRow({
    line: updated,
    run: runRow,
    userName: existing.userName,
    userAvatar: existing.userAvatar,
  });
}
