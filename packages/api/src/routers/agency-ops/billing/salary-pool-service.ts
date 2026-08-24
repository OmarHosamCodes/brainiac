import { db } from "@orch/db";
import {
  agencyOpsPayoutLine,
  agencyOpsPayoutRun,
  agencyOpsPayoutSection,
  agencyOpsSalaryMemberSettlement,
  agencyOpsSalaryPool,
  user,
  workspaceTeamMember,
} from "@orch/db/schema";
import { and, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { formatAvatarUrl } from "../shared/avatar-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";
import { loadMoneyResolveContext } from "./money-fx-service";
import { ensurePayoutPeriod } from "./payout-service";
import {
  nextMemberPaidAmount,
  periodHasRateDerivedSalaryLines,
  salaryPoolPaidTotal,
  salaryPoolRemaining,
  salaryPoolTotalsFromPool,
  validateSalaryMemberPayment,
  validateSalaryPoolCreateAllowed,
  validateSalaryPoolTotalUpdate,
} from "./salary-pool";

export type AgencySalaryPoolRecord = {
  id: string;
  teamId: string;
  runId: string;
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  createdAt: string;
  updatedAt: string;
};

export type AgencySalaryPoolMemberRecord = {
  userId: string;
  userName: string;
  userAvatar: string | null;
  paidAmount: number;
  finalizedAt: string | null;
  isFinalized: boolean;
};

export type AgencySalaryPoolDetail = {
  pool: AgencySalaryPoolRecord | null;
  members: AgencySalaryPoolMemberRecord[];
};

type SalaryPoolRow = typeof agencyOpsSalaryPool.$inferSelect;

function mapPoolRecord(
  pool: SalaryPoolRow,
  run: typeof agencyOpsPayoutRun.$inferSelect,
  paidAmount: number,
): AgencySalaryPoolRecord {
  return {
    id: pool.id,
    teamId: pool.teamId,
    runId: pool.runId,
    totalAmount: pool.totalAmount,
    paidAmount,
    remainingAmount: salaryPoolRemaining(pool.totalAmount, paidAmount),
    currency: pool.currency,
    periodStart: run.periodStart.toISOString(),
    periodEnd: run.periodEnd.toISOString(),
    createdAt: pool.createdAt.toISOString(),
    updatedAt: pool.updatedAt.toISOString(),
  };
}

async function loadRateDerivedSalaryLines(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
) {
  return db
    .select({
      payeeUserId: agencyOpsPayoutLine.payeeUserId,
      amount: agencyOpsPayoutLine.amount,
    })
    .from(agencyOpsPayoutLine)
    .innerJoin(agencyOpsPayoutSection, eq(agencyOpsPayoutSection.id, agencyOpsPayoutLine.sectionId))
    .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsPayoutSection.runId))
    .where(
      and(
        eq(agencyOpsPayoutRun.teamId, teamId),
        eq(agencyOpsPayoutRun.periodStart, periodStart),
        eq(agencyOpsPayoutRun.periodEnd, periodEnd),
        eq(agencyOpsPayoutSection.key, "salaries"),
      ),
    );
}

export async function loadSalaryPoolPeriodTotals(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
  },
): Promise<{
  totalAmount: number;
  paidAmount: number;
  remainingAmount: number;
  currency: string;
} | null> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const loaded = await loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd);
  if (!loaded) return null;

  const settlements = await db
    .select({ paidAmount: agencyOpsSalaryMemberSettlement.paidAmount })
    .from(agencyOpsSalaryMemberSettlement)
    .where(eq(agencyOpsSalaryMemberSettlement.poolId, loaded.pool.id));

  const totals = salaryPoolTotalsFromPool({
    totalAmount: loaded.pool.totalAmount,
    members: settlements,
    currency: loaded.pool.currency,
  });

  return {
    totalAmount: totals.totalAmount,
    paidAmount: totals.paidAmount,
    remainingAmount: totals.remainingAmount,
    currency: totals.currency,
  };
}

async function loadSalaryPoolRowByPeriod(
  teamId: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<{ pool: SalaryPoolRow; run: typeof agencyOpsPayoutRun.$inferSelect } | null> {
  const [row] = await db
    .select({
      pool: agencyOpsSalaryPool,
      run: agencyOpsPayoutRun,
    })
    .from(agencyOpsSalaryPool)
    .innerJoin(agencyOpsPayoutRun, eq(agencyOpsPayoutRun.id, agencyOpsSalaryPool.runId))
    .where(
      and(
        eq(agencyOpsSalaryPool.teamId, teamId),
        eq(agencyOpsPayoutRun.periodStart, periodStart),
        eq(agencyOpsPayoutRun.periodEnd, periodEnd),
      ),
    )
    .limit(1);

  return row ?? null;
}

async function loadPoolSettlements(poolId: string) {
  return db
    .select()
    .from(agencyOpsSalaryMemberSettlement)
    .where(eq(agencyOpsSalaryMemberSettlement.poolId, poolId));
}

async function loadTeamMembers(teamId: string) {
  return db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
      userAvatar: user.image,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, teamId));
}

function mergeMembersWithSettlements(
  members: Awaited<ReturnType<typeof loadTeamMembers>>,
  settlements: Awaited<ReturnType<typeof loadPoolSettlements>>,
): AgencySalaryPoolMemberRecord[] {
  const settlementByUser = new Map(settlements.map((row) => [row.userId, row]));

  return members
    .map((member) => {
      const settlement = settlementByUser.get(member.userId);
      const finalizedAt = settlement?.finalizedAt?.toISOString() ?? null;
      return {
        userId: member.userId,
        userName: member.userName?.trim() || "Unknown",
        userAvatar: formatAvatarUrl(member.userAvatar),
        paidAmount: settlement?.paidAmount ?? 0,
        finalizedAt,
        isFinalized: finalizedAt != null,
      };
    })
    .sort((a, b) => a.userName.localeCompare(b.userName));
}

export async function getSalaryPool(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
  },
): Promise<AgencySalaryPoolDetail> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const [members, loaded] = await Promise.all([
    loadTeamMembers(input.teamId),
    loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd),
  ]);

  if (!loaded) {
    return { pool: null, members: mergeMembersWithSettlements(members, []) };
  }

  const settlements = await loadPoolSettlements(loaded.pool.id);
  const paidAmount = salaryPoolPaidTotal(settlements);

  return {
    pool: mapPoolRecord(loaded.pool, loaded.run, paidAmount),
    members: mergeMembersWithSettlements(members, settlements),
  };
}

export async function upsertSalaryPoolTotal(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    totalAmount: number;
    currency?: string;
  },
): Promise<AgencySalaryPoolRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const run = await ensurePayoutPeriod(actorUserId, {
    teamId: input.teamId,
    periodStart: input.periodStart,
    periodEnd: input.periodEnd,
    currency: input.currency,
  });

  const [existingPool, rateLines, settlements] = await Promise.all([
    loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd),
    loadRateDerivedSalaryLines(input.teamId, periodStart, periodEnd),
    (async () => {
      const loaded = await loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd);
      if (!loaded) return [];
      return loadPoolSettlements(loaded.pool.id);
    })(),
  ]);

  const paidTotal = salaryPoolPaidTotal(settlements);
  const totalError = validateSalaryPoolTotalUpdate(input.totalAmount, paidTotal);
  if (totalError) {
    throw new ORPCError("BAD_REQUEST", { message: totalError });
  }

  if (!existingPool) {
    const createError = validateSalaryPoolCreateAllowed(periodHasRateDerivedSalaryLines(rateLines));
    if (createError) {
      throw new ORPCError("CONFLICT", { message: createError });
    }
  }

  const moneyCtx = await loadMoneyResolveContext(actorUserId, { teamId: input.teamId });
  const sourceCurrency = (input.currency ?? run.currency).toUpperCase();
  const resolved = moneyCtx.resolve(input.totalAmount, sourceCurrency);

  if (existingPool) {
    const [updated] = await db
      .update(agencyOpsSalaryPool)
      .set({
        totalAmount: resolved.amount,
        currency: moneyCtx.agencyCurrency,
        sourceAmount: resolved.sourceAmount,
        fxRate: resolved.fxRate,
        fxAsOf: resolved.fxAsOf ? new Date(resolved.fxAsOf) : null,
        updatedAt: new Date(),
      })
      .where(eq(agencyOpsSalaryPool.id, existingPool.pool.id))
      .returning();

    if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

    const [runRow] = await db
      .select()
      .from(agencyOpsPayoutRun)
      .where(eq(agencyOpsPayoutRun.id, run.id))
      .limit(1);
    if (!runRow) throw new ORPCError("INTERNAL_SERVER_ERROR");

    return mapPoolRecord(updated, runRow, paidTotal);
  }

  const poolId = createWorkspaceId("agency-salary-pool");
  const [inserted] = await db
    .insert(agencyOpsSalaryPool)
    .values({
      id: poolId,
      teamId: input.teamId,
      runId: run.id,
      totalAmount: resolved.amount,
      currency: moneyCtx.agencyCurrency,
      sourceAmount: resolved.sourceAmount,
      fxRate: resolved.fxRate,
      fxAsOf: resolved.fxAsOf ? new Date(resolved.fxAsOf) : null,
      createdByUserId: actorUserId,
    })
    .returning();

  if (!inserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  const [runRow] = await db
    .select()
    .from(agencyOpsPayoutRun)
    .where(eq(agencyOpsPayoutRun.id, run.id))
    .limit(1);
  if (!runRow) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapPoolRecord(inserted, runRow, 0);
}

export async function recordSalaryMemberPayment(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    userId: string;
    amount: number;
    finalize?: boolean;
  },
): Promise<AgencySalaryPoolMemberRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const loaded = await loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd);
  if (!loaded) {
    throw new ORPCError("NOT_FOUND", {
      message: "Create a Team salaries total for this period first.",
    });
  }

  const [member] = await db
    .select({ userId: workspaceTeamMember.userId, userName: user.name, userAvatar: user.image })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new ORPCError("BAD_REQUEST", { message: "User is not a member of this team." });
  }

  const settlements = await loadPoolSettlements(loaded.pool.id);
  const paidTotal = salaryPoolPaidTotal(settlements);
  const poolRemaining = salaryPoolRemaining(loaded.pool.totalAmount, paidTotal);
  const existing = settlements.find((row) => row.userId === input.userId);
  const isFinalized = existing?.finalizedAt != null;

  const paymentError = validateSalaryMemberPayment({
    paymentAmount: input.amount,
    poolRemaining,
    isFinalized,
  });
  if (paymentError) {
    throw new ORPCError("BAD_REQUEST", { message: paymentError });
  }

  const now = new Date();
  const nextPaid = nextMemberPaidAmount(existing?.paidAmount ?? 0, input.amount);
  const finalize = input.finalize === true;

  if (existing) {
    const [updated] = await db
      .update(agencyOpsSalaryMemberSettlement)
      .set({
        paidAmount: nextPaid,
        finalizedAt: finalize ? now : existing.finalizedAt,
        finalizedByUserId: finalize ? actorUserId : existing.finalizedByUserId,
        updatedAt: now,
      })
      .where(eq(agencyOpsSalaryMemberSettlement.id, existing.id))
      .returning();

    if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

    return {
      userId: member.userId,
      userName: member.userName?.trim() || "Unknown",
      userAvatar: formatAvatarUrl(member.userAvatar),
      paidAmount: updated.paidAmount,
      finalizedAt: updated.finalizedAt?.toISOString() ?? null,
      isFinalized: updated.finalizedAt != null,
    };
  }

  const settlementId = createWorkspaceId("agency-salary-settle");
  const [inserted] = await db
    .insert(agencyOpsSalaryMemberSettlement)
    .values({
      id: settlementId,
      poolId: loaded.pool.id,
      userId: input.userId,
      paidAmount: nextPaid,
      finalizedAt: finalize ? now : null,
      finalizedByUserId: finalize ? actorUserId : null,
    })
    .returning();

  if (!inserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return {
    userId: member.userId,
    userName: member.userName?.trim() || "Unknown",
    userAvatar: formatAvatarUrl(member.userAvatar),
    paidAmount: inserted.paidAmount,
    finalizedAt: inserted.finalizedAt?.toISOString() ?? null,
    isFinalized: inserted.finalizedAt != null,
  };
}

export async function reopenSalaryMember(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
    userId: string;
  },
): Promise<AgencySalaryPoolMemberRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  const loaded = await loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd);
  if (!loaded) {
    throw new ORPCError("NOT_FOUND", { message: "Team salaries pool was not found." });
  }

  const [member] = await db
    .select({ userId: workspaceTeamMember.userId, userName: user.name, userAvatar: user.image })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .limit(1);

  if (!member) {
    throw new ORPCError("BAD_REQUEST", { message: "User is not a member of this team." });
  }

  const [existing] = await db
    .select()
    .from(agencyOpsSalaryMemberSettlement)
    .where(
      and(
        eq(agencyOpsSalaryMemberSettlement.poolId, loaded.pool.id),
        eq(agencyOpsSalaryMemberSettlement.userId, input.userId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Member has no salary pool payments yet." });
  }

  if (existing.finalizedAt == null) {
    return {
      userId: member.userId,
      userName: member.userName?.trim() || "Unknown",
      userAvatar: formatAvatarUrl(member.userAvatar),
      paidAmount: existing.paidAmount,
      finalizedAt: null,
      isFinalized: false,
    };
  }

  const [updated] = await db
    .update(agencyOpsSalaryMemberSettlement)
    .set({
      finalizedAt: null,
      finalizedByUserId: null,
      updatedAt: new Date(),
    })
    .where(eq(agencyOpsSalaryMemberSettlement.id, existing.id))
    .returning();

  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return {
    userId: member.userId,
    userName: member.userName?.trim() || "Unknown",
    userAvatar: formatAvatarUrl(member.userAvatar),
    paidAmount: updated.paidAmount,
    finalizedAt: null,
    isFinalized: false,
  };
}

export async function assertNoSalaryPoolForRateDerivedExport(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart: string;
    periodEnd: string;
  },
): Promise<void> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  const loaded = await loadSalaryPoolRowByPeriod(input.teamId, periodStart, periodEnd);
  if (!loaded) return;

  throw new ORPCError("CONFLICT", {
    message:
      "This period uses a manual Team salaries pool. Rate-derived salary line export is blocked.",
  });
}
