import { db } from "@orch/db";
import {
  workspaceTeamMember,
  user,
  agencyOpsMemberRate,
  agencyOpsInvoice,
  agencyOpsClient,
  agencyOpsTimeEntry,
  agencyOpsProject,
  agencyOpsInvoiceLineItem,
  type AgencyOpsInvoiceStatus,
} from "@orch/db/schema";
import { eq, asc, and, inArray, sql, desc, sum, isNull, gte, lte, or, ilike } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";
import {
  invoiceBillStatus,
  invoiceRemainingCents,
  invoiceStatusAfterReceived,
  invoiceStatusesForBillFilter,
  type InvoiceBillStatus,
} from "./invoice-bill-status";
import { formatAvatarUrl } from "../shared/avatar-helpers";
import {
  aggregatePeriodClientActivity,
  aggregatePeriodMemberActivity,
  type PeriodBillClientActivity,
  type PeriodBillMemberActivity,
} from "./period-bill-activity";

type AgencyMemberRateRecord = {
  userId: string;
  userName: string;
  userEmail: string;
  costRateCents: number | null;
  billableRateCents: number | null;
  currency: string;
  effectiveFrom: string | null;
};

export async function listMemberRates(
  actorUserId: string,
  input: { teamId: string },
): Promise<{ items: AgencyMemberRateRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
      userEmail: user.email,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  if (members.length === 0) return { items: [] };

  const userIds = members.map((m) => m.userId);

  const rateRows = await db
    .select()
    .from(agencyOpsMemberRate)
    .where(
      and(
        eq(agencyOpsMemberRate.teamId, input.teamId),
        inArray(agencyOpsMemberRate.userId, userIds),
      ),
    );

  const rateByUserId = new Map(rateRows.map((r) => [r.userId, r]));

  const items: AgencyMemberRateRecord[] = members.map((m) => {
    const rate = rateByUserId.get(m.userId);
    return {
      userId: m.userId,
      userName: m.userName ?? "Unknown",
      userEmail: m.userEmail,
      costRateCents: rate?.costRateCents ?? null,
      billableRateCents: rate?.billableRateCents ?? null,
      currency: rate?.currency ?? "USD",
      effectiveFrom: rate?.effectiveFrom?.toISOString() ?? null,
    };
  });

  return { items };
}

export async function upsertMemberRate(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    costRateCents?: number | null;
    billableRateCents?: number | null;
    currency?: string;
    effectiveFrom?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [membership] = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .limit(1);

  if (!membership) {
    throw new ORPCError("NOT_FOUND", { message: "User is not a member of this team." });
  }

  const now = new Date();
  const effectiveFrom = input.effectiveFrom
    ? parseIsoDateTime(input.effectiveFrom, "effectiveFrom")
    : now;

  const [upserted] = await db
    .insert(agencyOpsMemberRate)
    .values({
      id: createWorkspaceId("agency-rate"),
      teamId: input.teamId,
      userId: input.userId,
      costRateCents: input.costRateCents ?? null,
      billableRateCents: input.billableRateCents ?? null,
      currency: input.currency ?? "USD",
      effectiveFrom,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsMemberRate.teamId, agencyOpsMemberRate.userId],
      set: {
        // Only overwrite a field when the caller explicitly provided it;
        // otherwise keep the existing value via COALESCE.
        costRateCents:
          input.costRateCents !== undefined
            ? input.costRateCents
            : sql`COALESCE(${agencyOpsMemberRate.costRateCents}, ${agencyOpsMemberRate.costRateCents})`,
        billableRateCents:
          input.billableRateCents !== undefined
            ? input.billableRateCents
            : sql`COALESCE(${agencyOpsMemberRate.billableRateCents}, ${agencyOpsMemberRate.billableRateCents})`,
        currency:
          input.currency !== undefined ? input.currency : sql`${agencyOpsMemberRate.currency}`,
        effectiveFrom:
          input.effectiveFrom !== undefined
            ? effectiveFrom
            : sql`${agencyOpsMemberRate.effectiveFrom}`,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  const [userRow] = await db
    .select({ name: user.name, email: user.email })
    .from(user)
    .where(eq(user.id, input.userId))
    .limit(1);

  return {
    userId: upserted.userId,
    userName: userRow?.name ?? "Unknown",
    userEmail: userRow?.email ?? "",
    costRateCents: upserted.costRateCents,
    billableRateCents: upserted.billableRateCents,
    currency: upserted.currency,
    effectiveFrom: upserted.effectiveFrom.toISOString(),
  } satisfies AgencyMemberRateRecord;
}

type AgencyInvoiceRecord = {
  id: string;
  clientId: string;
  clientName: string;
  number: string;
  status: AgencyOpsInvoiceStatus;
  billStatus: InvoiceBillStatus;
  amountCents: number;
  receivedCents: number;
  remainingCents: number;
  currency: string;
  periodStart: string;
  periodEnd: string;
  issuedAt: string | null;
  paidAt: string | null;
};

async function getNextInvoiceNumber(
  teamId: string,
  tx: typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0] = db,
): Promise<string> {
  const [last] = await tx
    .select({ number: agencyOpsInvoice.number })
    .from(agencyOpsInvoice)
    .where(eq(agencyOpsInvoice.teamId, teamId))
    .orderBy(desc(agencyOpsInvoice.createdAt))
    .limit(1)
    .for("update");

  if (!last) return "INV-0001";
  const match = last.number.match(/INV-(\d+)$/);
  if (!match) return "INV-0001";
  const next = parseInt(match[1]!, 10) + 1;
  return `INV-${String(next).padStart(4, "0")}`;
}

function mapInvoiceRow(
  row: typeof agencyOpsInvoice.$inferSelect,
  clientName: string,
): AgencyInvoiceRecord {
  const receivedCents = row.receivedCents ?? 0;
  return {
    id: row.id,
    clientId: row.clientId,
    clientName,
    number: row.number,
    status: row.status,
    billStatus: invoiceBillStatus(row.status),
    amountCents: row.amountCents,
    receivedCents,
    remainingCents: invoiceRemainingCents(row.amountCents, receivedCents),
    currency: row.currency,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    issuedAt: row.issuedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export async function listInvoices(
  actorUserId: string,
  input: {
    teamId: string;
    status?: AgencyOpsInvoiceStatus;
    billStatus?: InvoiceBillStatus;
    periodStart?: string;
    periodEnd?: string;
    search?: string;
  },
): Promise<{ items: AgencyInvoiceRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const filters = [eq(agencyOpsInvoice.teamId, input.teamId)];

  if (input.status) {
    filters.push(eq(agencyOpsInvoice.status, input.status));
  } else if (input.billStatus) {
    filters.push(inArray(agencyOpsInvoice.status, invoiceStatusesForBillFilter(input.billStatus)));
  }

  if (input.periodStart && input.periodEnd) {
    const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
    const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
    // Overlap: invoice period intersects the selected range.
    filters.push(lte(agencyOpsInvoice.periodStart, periodEnd));
    filters.push(gte(agencyOpsInvoice.periodEnd, periodStart));
  }

  const searchTerm = input.search?.trim();
  if (searchTerm) {
    const pattern = `%${searchTerm}%`;
    filters.push(
      or(ilike(agencyOpsClient.name, pattern), ilike(agencyOpsInvoice.number, pattern))!,
    );
  }

  const rows = await db
    .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
    .from(agencyOpsInvoice)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsInvoice.createdAt));

  return { items: rows.map((r) => mapInvoiceRow(r.invoice, r.clientName)) };
}

export async function getInvoiceSummary(
  actorUserId: string,
  input: { teamId: string; periodStart?: string; periodEnd?: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const filters = [eq(agencyOpsInvoice.teamId, input.teamId)];
  if (input.periodStart && input.periodEnd) {
    const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
    const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
    filters.push(lte(agencyOpsInvoice.periodStart, periodEnd));
    filters.push(gte(agencyOpsInvoice.periodEnd, periodStart));
  }

  const rows = await db
    .select({
      status: agencyOpsInvoice.status,
      currency: agencyOpsInvoice.currency,
      amountCents: sum(agencyOpsInvoice.amountCents).as("total"),
      receivedCents: sum(agencyOpsInvoice.receivedCents).as("received"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(agencyOpsInvoice)
    .where(and(...filters))
    .groupBy(agencyOpsInvoice.status, agencyOpsInvoice.currency);

  let draftCount = 0;
  let sentCount = 0;
  let partialCount = 0;
  let paidCount = 0;
  let refundedCount = 0;
  // Outstanding remaining keyed by currency (draft/sent/partial).
  const outstandingByCurrency: Record<string, number> = {};

  for (const row of rows) {
    const count = Number(row.count ?? 0);
    const amount = Number(row.amountCents ?? 0);
    const received = Number(row.receivedCents ?? 0);
    const remaining = Math.max(0, amount - received);
    if (row.status === "draft") {
      draftCount += count;
      outstandingByCurrency[row.currency] = (outstandingByCurrency[row.currency] ?? 0) + remaining;
    } else if (row.status === "sent") {
      sentCount += count;
      outstandingByCurrency[row.currency] = (outstandingByCurrency[row.currency] ?? 0) + remaining;
    } else if (row.status === "partial") {
      partialCount += count;
      outstandingByCurrency[row.currency] = (outstandingByCurrency[row.currency] ?? 0) + remaining;
    } else if (row.status === "paid") {
      paidCount += count;
    } else if (row.status === "refunded") {
      refundedCount += count;
    }
  }

  // For backward-compat convenience: also expose the USD outstanding total
  // (or the single currency if the team uses only one).
  const currencies = Object.keys(outstandingByCurrency);
  const outstandingCents =
    currencies.length === 1
      ? (outstandingByCurrency[currencies[0]!] ?? 0)
      : (outstandingByCurrency["USD"] ?? 0);
  const currency = currencies.length === 1 ? currencies[0]! : "USD";

  return {
    draftCount,
    sentCount,
    partialCount,
    paidCount,
    refundedCount,
    outstandingCents,
    currency,
    outstandingByCurrency,
  };
}

export async function createInvoice(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    periodStart: string;
    periodEnd: string;
    currency?: string;
  },
): Promise<AgencyInvoiceRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [clientRow] = await db
    .select({ id: agencyOpsClient.id, name: agencyOpsClient.name })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)))
    .limit(1);

  if (!clientRow) {
    throw new ORPCError("NOT_FOUND", { message: "Client was not found." });
  }

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");

  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const entries = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      projectId: agencyOpsTimeEntry.projectId,
      projectName: agencyOpsProject.name,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        eq(agencyOpsProject.clientId, input.clientId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, periodStart),
        lte(agencyOpsTimeEntry.startedAt, periodEnd),
      ),
    );

  // Fetch per-user billable rates so each user's work is priced correctly.
  const memberRateRows = await db
    .select({
      userId: agencyOpsMemberRate.userId,
      billableRateCents: agencyOpsMemberRate.billableRateCents,
    })
    .from(agencyOpsMemberRate)
    .where(eq(agencyOpsMemberRate.teamId, input.teamId));

  const rateByUserId = new Map(memberRateRows.map((r) => [r.userId, r.billableRateCents]));

  // Check that every user who logged time has a rate set.
  const userIdsWithEntries = [...new Set(entries.map((e) => e.userId))];
  const usersWithoutRate = userIdsWithEntries.filter(
    (uid) => (rateByUserId.get(uid) ?? null) === null,
  );
  if (usersWithoutRate.length > 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: `The following team members have no billable rate set: ${usersWithoutRate.join(", ")}. Set rates before creating an invoice.`,
    });
  }

  type ProjectBucket = { projectName: string; seconds: number; rateCents: number };
  const byProject = new Map<string, ProjectBucket>();
  for (const entry of entries) {
    const rateCents = rateByUserId.get(entry.userId) ?? 0;
    const existing = byProject.get(entry.projectId) ?? {
      projectName: entry.projectName,
      seconds: 0,
      rateCents,
    };
    existing.seconds += entry.durationSeconds;
    byProject.set(entry.projectId, existing);
  }

  const now = new Date();

  const { invoice, totalCents } = await db.transaction(async (tx) => {
    const invoiceNumber = await getNextInvoiceNumber(input.teamId, tx);

    const [inv] = await tx
      .insert(agencyOpsInvoice)
      .values({
        id: createWorkspaceId("agency-inv"),
        teamId: input.teamId,
        clientId: input.clientId,
        number: invoiceNumber,
        status: "draft",
        amountCents: 0,
        receivedCents: 0,
        currency: input.currency ?? "USD",
        periodStart,
        periodEnd,
        createdByUserId: actorUserId,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    if (!inv) throw new ORPCError("INTERNAL_SERVER_ERROR");

    let total = 0;

    if (byProject.size > 0) {
      const lineItems = [...byProject.entries()].map(
        ([projectId, { projectName, seconds, rateCents }]) => {
          const amountCents = Math.round((seconds / 3600) * rateCents);
          total += amountCents;
          return {
            id: createWorkspaceId("agency-li"),
            invoiceId: inv.id,
            description: projectName,
            projectId,
            durationSeconds: seconds,
            rateCents,
            amountCents,
            fromTimeEntries: true,
            createdAt: now,
          };
        },
      );
      await tx.insert(agencyOpsInvoiceLineItem).values(lineItems);
    } else {
      await tx.insert(agencyOpsInvoiceLineItem).values({
        id: createWorkspaceId("agency-li"),
        invoiceId: inv.id,
        description: "Services",
        projectId: null,
        durationSeconds: 0,
        rateCents: 0,
        amountCents: 0,
        fromTimeEntries: false,
        createdAt: now,
      });
    }

    await tx
      .update(agencyOpsInvoice)
      .set({ amountCents: total, updatedAt: now })
      .where(eq(agencyOpsInvoice.id, inv.id));

    return { invoice: inv, totalCents: total };
  });

  return mapInvoiceRow({ ...invoice, amountCents: totalCents }, clientRow.name);
}

export async function updateInvoiceStatus(
  actorUserId: string,
  input: { teamId: string; invoiceId: string; status: "sent" | "paid" | "refunded" },
): Promise<AgencyInvoiceRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [existing] = await db
    .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
    .from(agencyOpsInvoice)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
    .where(and(eq(agencyOpsInvoice.id, input.invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)))
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Invoice was not found." });
  }

  const validTransitions: Record<AgencyOpsInvoiceStatus, AgencyOpsInvoiceStatus[]> = {
    draft: ["sent"],
    sent: ["paid", "refunded"],
    partial: ["paid", "refunded"],
    paid: ["refunded"],
    refunded: [],
  };

  if (!validTransitions[existing.invoice.status]?.includes(input.status)) {
    throw new ORPCError("BAD_REQUEST", {
      message: `Cannot transition from ${existing.invoice.status} to ${input.status}.`,
    });
  }

  const now = new Date();
  const patch: Partial<typeof agencyOpsInvoice.$inferInsert> = {
    status: input.status,
    updatedAt: now,
  };
  if (input.status === "sent") patch.issuedAt = existing.invoice.issuedAt ?? now;
  if (input.status === "paid") {
    patch.paidAt = now;
    patch.receivedCents = existing.invoice.amountCents;
  }

  const [updated] = await db
    .update(agencyOpsInvoice)
    .set(patch)
    .where(eq(agencyOpsInvoice.id, input.invoiceId))
    .returning();

  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapInvoiceRow(updated, existing.clientName);
}

export async function recordInvoicePayment(
  actorUserId: string,
  input: { teamId: string; invoiceId: string; amountCents: number },
): Promise<AgencyInvoiceRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (input.amountCents <= 0) {
    throw new ORPCError("BAD_REQUEST", { message: "Payment amount must be greater than zero." });
  }

  const [existing] = await db
    .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
    .from(agencyOpsInvoice)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
    .where(and(eq(agencyOpsInvoice.id, input.invoiceId), eq(agencyOpsInvoice.teamId, input.teamId)))
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", { message: "Invoice was not found." });
  }

  if (existing.invoice.status === "draft") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Send the invoice before recording a payment.",
    });
  }
  if (existing.invoice.status === "refunded") {
    throw new ORPCError("BAD_REQUEST", { message: "Cannot record payment on a refunded invoice." });
  }
  if (existing.invoice.status === "paid") {
    throw new ORPCError("BAD_REQUEST", { message: "Invoice is already paid in full." });
  }

  const now = new Date();
  const nextReceived = existing.invoice.receivedCents + input.amountCents;
  const nextStatus = invoiceStatusAfterReceived(
    existing.invoice.amountCents,
    nextReceived,
    existing.invoice.status,
  );

  const patch: Partial<typeof agencyOpsInvoice.$inferInsert> = {
    receivedCents: nextReceived,
    status: nextStatus,
    updatedAt: now,
  };
  if (nextStatus === "paid") patch.paidAt = now;
  if (!existing.invoice.issuedAt) patch.issuedAt = now;

  const [updated] = await db
    .update(agencyOpsInvoice)
    .set(patch)
    .where(eq(agencyOpsInvoice.id, input.invoiceId))
    .returning();

  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapInvoiceRow(updated, existing.clientName);
}

export async function listPeriodBillActivity(
  actorUserId: string,
  input: { teamId: string; periodStart: string; periodEnd: string; search?: string },
): Promise<{ clients: PeriodBillClientActivity[]; members: PeriodBillMemberActivity[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const periodStart = parseIsoDateTime(input.periodStart, "periodStart");
  const periodEnd = parseIsoDateTime(input.periodEnd, "periodEnd");
  if (periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const rows = await db
    .select({
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      userId: agencyOpsTimeEntry.userId,
      userName: user.name,
      userAvatar: user.image,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, periodStart),
        lte(agencyOpsTimeEntry.startedAt, periodEnd),
      ),
    );

  let clients = aggregatePeriodClientActivity(rows);
  let members = aggregatePeriodMemberActivity(
    rows.map((row) => ({
      userId: row.userId,
      userName: row.userName?.trim() || "Unknown",
      userAvatar: formatAvatarUrl(row.userAvatar),
      durationSeconds: row.durationSeconds,
    })),
  );

  const searchTerm = input.search?.trim().toLowerCase();
  if (searchTerm) {
    clients = clients.filter((client) => client.clientName.toLowerCase().includes(searchTerm));
    members = members.filter((member) => member.userName.toLowerCase().includes(searchTerm));
  }

  return { clients, members };
}

export async function listBudgetsStub(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  return { items: [] as const };
}
