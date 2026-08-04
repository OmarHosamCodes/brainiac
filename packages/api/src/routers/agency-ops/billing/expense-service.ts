import { db } from "@orch/db";
import {
  agencyOpsExpense,
  type AgencyOpsExpenseKind,
  type AgencyOpsExpensePeriod,
  type AgencyOpsExpenseStatus,
} from "@orch/db/schema";
import { and, asc, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";
import {
  advanceExpenseNextDueAt,
  defaultExpenseNextDueAt,
  expenseRemainingCents,
  expenseStatusAfterPaid,
} from "./expense-helpers";

export type AgencyExpenseRecord = {
  id: string;
  teamId: string;
  name: string;
  kind: AgencyOpsExpenseKind;
  period: AgencyOpsExpensePeriod | null;
  note: string;
  amountCents: number;
  paidCents: number;
  remainingCents: number;
  currency: string;
  status: AgencyOpsExpenseStatus;
  nextDueAt: string | null;
  occurredAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function mapExpenseRow(row: typeof agencyOpsExpense.$inferSelect): AgencyExpenseRecord {
  const paidCents = row.paidCents ?? 0;
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    kind: row.kind,
    period: row.period ?? null,
    note: row.note ?? "",
    amountCents: row.amountCents,
    paidCents,
    remainingCents: expenseRemainingCents(row.amountCents, paidCents),
    currency: row.currency,
    status: row.status,
    nextDueAt: row.nextDueAt?.toISOString() ?? null,
    occurredAt: row.occurredAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listExpenses(
  actorUserId: string,
  input: {
    teamId: string;
    periodStart?: string;
    periodEnd?: string;
  },
): Promise<{ items: AgencyExpenseRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = input.periodStart ? parseIsoDateTime(input.periodStart, "periodStart") : null;
  const periodEnd = input.periodEnd ? parseIsoDateTime(input.periodEnd, "periodEnd") : null;
  if (periodStart && periodEnd && periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const rows = await db
    .select()
    .from(agencyOpsExpense)
    .where(eq(agencyOpsExpense.teamId, input.teamId))
    .orderBy(
      asc(sql`case when ${agencyOpsExpense.kind} = 'subscription' then 0 else 1 end`),
      asc(agencyOpsExpense.nextDueAt),
      desc(agencyOpsExpense.occurredAt),
      desc(agencyOpsExpense.createdAt),
    );

  const items = rows
    .filter((row) => {
      if (row.kind === "subscription") return true;
      if (!periodStart || !periodEnd) return true;
      const occurred = row.occurredAt ?? row.createdAt;
      return occurred >= periodStart && occurred < periodEnd;
    })
    .map(mapExpenseRow);

  return { items };
}

export async function createExpense(
  actorUserId: string,
  input: {
    teamId: string;
    name: string;
    kind: AgencyOpsExpenseKind;
    period?: AgencyOpsExpensePeriod | null;
    note?: string;
    amountCents: number;
    currency?: string;
    nextDueAt?: string | null;
    occurredAt?: string | null;
  },
): Promise<AgencyExpenseRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const name = input.name.trim();
  if (!name) {
    throw new ORPCError("BAD_REQUEST", { message: "Name is required." });
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Amount must be a positive integer (cents)." });
  }

  const now = new Date();
  let period: AgencyOpsExpensePeriod | null = null;
  let nextDueAt: Date | null = null;
  let occurredAt: Date | null = null;

  if (input.kind === "subscription") {
    if (!input.period) {
      throw new ORPCError("BAD_REQUEST", { message: "Subscription expenses require a period." });
    }
    period = input.period;
    nextDueAt = input.nextDueAt
      ? parseIsoDateTime(input.nextDueAt, "nextDueAt")
      : defaultExpenseNextDueAt(now, period);
  } else {
    occurredAt = input.occurredAt ? parseIsoDateTime(input.occurredAt, "occurredAt") : now;
  }

  const id = createWorkspaceId("agency-expense");
  const currency = (input.currency ?? "USD").toUpperCase();

  const [row] = await db
    .insert(agencyOpsExpense)
    .values({
      id,
      teamId: input.teamId,
      name,
      kind: input.kind,
      period,
      note: (input.note ?? "").trim(),
      amountCents: input.amountCents,
      currency,
      status: "due",
      paidCents: 0,
      nextDueAt,
      occurredAt,
      createdByUserId: actorUserId,
    })
    .returning();

  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to create expense." });
  }
  return mapExpenseRow(row);
}

export async function updateExpense(
  actorUserId: string,
  input: {
    teamId: string;
    expenseId: string;
    name?: string;
    note?: string;
    amountCents?: number;
    currency?: string;
    period?: AgencyOpsExpensePeriod | null;
    nextDueAt?: string | null;
    occurredAt?: string | null;
  },
): Promise<AgencyExpenseRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [existing] = await db
    .select()
    .from(agencyOpsExpense)
    .where(and(eq(agencyOpsExpense.id, input.expenseId), eq(agencyOpsExpense.teamId, input.teamId)))
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Expense not found." });
  }

  const name = input.name !== undefined ? input.name.trim() : existing.name;
  if (!name) {
    throw new ORPCError("BAD_REQUEST", { message: "Name is required." });
  }

  const amountCents = input.amountCents ?? existing.amountCents;
  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Amount must be a positive integer (cents)." });
  }

  let period = existing.period ?? null;
  let nextDueAt = existing.nextDueAt;
  let occurredAt = existing.occurredAt;

  if (existing.kind === "subscription") {
    if (input.period !== undefined) {
      if (!input.period) {
        throw new ORPCError("BAD_REQUEST", { message: "Subscription expenses require a period." });
      }
      period = input.period;
    }
    if (input.nextDueAt !== undefined) {
      nextDueAt = input.nextDueAt ? parseIsoDateTime(input.nextDueAt, "nextDueAt") : null;
    }
  } else if (input.occurredAt !== undefined) {
    occurredAt = input.occurredAt ? parseIsoDateTime(input.occurredAt, "occurredAt") : null;
  }

  const paidCents = Math.min(existing.paidCents ?? 0, amountCents);
  const status = expenseStatusAfterPaid(amountCents, paidCents);

  const [row] = await db
    .update(agencyOpsExpense)
    .set({
      name,
      note: input.note !== undefined ? input.note.trim() : existing.note,
      amountCents,
      currency: input.currency !== undefined ? input.currency.toUpperCase() : existing.currency,
      period,
      nextDueAt,
      occurredAt,
      paidCents,
      status,
      updatedAt: new Date(),
    })
    .where(eq(agencyOpsExpense.id, existing.id))
    .returning();

  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to update expense." });
  }
  return mapExpenseRow(row);
}

export async function recordExpensePayment(
  actorUserId: string,
  input: { teamId: string; expenseId: string; amountCents: number },
): Promise<AgencyExpenseRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (!Number.isInteger(input.amountCents) || input.amountCents <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Payment amount must be a positive integer." });
  }

  const [existing] = await db
    .select()
    .from(agencyOpsExpense)
    .where(and(eq(agencyOpsExpense.id, input.expenseId), eq(agencyOpsExpense.teamId, input.teamId)))
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Expense not found." });
  }
  if (existing.status === "paid") {
    throw new ORPCError("BAD_REQUEST", { message: "Expense is already paid." });
  }

  const remaining = expenseRemainingCents(existing.amountCents, existing.paidCents ?? 0);
  if (input.amountCents > remaining) {
    throw new ORPCError("BAD_REQUEST", { message: "Payment exceeds remaining balance." });
  }

  let paidCents = (existing.paidCents ?? 0) + input.amountCents;
  let status = expenseStatusAfterPaid(existing.amountCents, paidCents);
  let nextDueAt = existing.nextDueAt;

  // Subscription fully paid → roll to next due cycle.
  if (existing.kind === "subscription" && status === "paid" && existing.period && nextDueAt) {
    nextDueAt = advanceExpenseNextDueAt(nextDueAt, existing.period);
    paidCents = 0;
    status = "due";
  }

  const [row] = await db
    .update(agencyOpsExpense)
    .set({
      paidCents,
      status,
      nextDueAt,
      updatedAt: new Date(),
    })
    .where(eq(agencyOpsExpense.id, existing.id))
    .returning();

  if (!row) {
    throw new ORPCError("INTERNAL_SERVER_ERROR", { message: "Failed to record payment." });
  }
  return mapExpenseRow(row);
}

export async function removeExpense(
  actorUserId: string,
  input: { teamId: string; expenseId: string },
): Promise<{ id: string }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const deleted = await db
    .delete(agencyOpsExpense)
    .where(and(eq(agencyOpsExpense.id, input.expenseId), eq(agencyOpsExpense.teamId, input.teamId)))
    .returning({ id: agencyOpsExpense.id });

  if (deleted.length === 0) {
    throw new ORPCError("NOT_FOUND", { message: "Expense not found." });
  }
  return { id: input.expenseId };
}

/** Sum expense amounts whose nextDueAt or occurredAt falls in [periodStart, periodEnd). */
export async function sumExpensesInPeriod(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string },
): Promise<{ amountCents: number; paidCents: number; currency: string }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const rows = await db
    .select({
      amountCents: agencyOpsExpense.amountCents,
      paidCents: agencyOpsExpense.paidCents,
      currency: agencyOpsExpense.currency,
      kind: agencyOpsExpense.kind,
      nextDueAt: agencyOpsExpense.nextDueAt,
      occurredAt: agencyOpsExpense.occurredAt,
      createdAt: agencyOpsExpense.createdAt,
    })
    .from(agencyOpsExpense)
    .where(
      and(
        eq(agencyOpsExpense.teamId, input.teamId),
        or(
          and(
            eq(agencyOpsExpense.kind, "subscription"),
            gte(agencyOpsExpense.nextDueAt, periodStart),
            lte(agencyOpsExpense.nextDueAt, periodEnd),
          ),
          and(
            eq(agencyOpsExpense.kind, "one_time"),
            or(
              and(
                gte(agencyOpsExpense.occurredAt, periodStart),
                lte(agencyOpsExpense.occurredAt, periodEnd),
              ),
              and(
                sql`${agencyOpsExpense.occurredAt} is null`,
                gte(agencyOpsExpense.createdAt, periodStart),
                lte(agencyOpsExpense.createdAt, periodEnd),
              ),
            ),
          ),
        ),
      ),
    );

  let amountCents = 0;
  let paidCents = 0;
  let currency = "USD";
  for (const row of rows) {
    amountCents += row.amountCents;
    paidCents += row.paidCents ?? 0;
    currency = row.currency;
  }
  return { amountCents, paidCents, currency };
}
