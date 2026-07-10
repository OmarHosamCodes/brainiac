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
} from "@orch/db/schema";
import { eq, asc, and, inArray, sql, desc, sum, isNull, gte, lte } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";
import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";

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
  status: "draft" | "sent" | "paid";
  amountCents: number;
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
  return {
    id: row.id,
    clientId: row.clientId,
    clientName,
    number: row.number,
    status: row.status,
    amountCents: row.amountCents,
    currency: row.currency,
    periodStart: row.periodStart.toISOString(),
    periodEnd: row.periodEnd.toISOString(),
    issuedAt: row.issuedAt?.toISOString() ?? null,
    paidAt: row.paidAt?.toISOString() ?? null,
  };
}

export async function listInvoices(
  actorUserId: string,
  input: { teamId: string; status?: "draft" | "sent" | "paid" },
): Promise<{ items: AgencyInvoiceRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const filters = [eq(agencyOpsInvoice.teamId, input.teamId)];
  if (input.status) {
    filters.push(eq(agencyOpsInvoice.status, input.status));
  }

  const rows = await db
    .select({ invoice: agencyOpsInvoice, clientName: agencyOpsClient.name })
    .from(agencyOpsInvoice)
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsInvoice.clientId))
    .where(and(...filters))
    .orderBy(desc(agencyOpsInvoice.createdAt));

  return { items: rows.map((r) => mapInvoiceRow(r.invoice, r.clientName)) };
}

export async function getInvoiceSummary(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const rows = await db
    .select({
      status: agencyOpsInvoice.status,
      currency: agencyOpsInvoice.currency,
      amountCents: sum(agencyOpsInvoice.amountCents).as("total"),
      count: sql<number>`count(*)`.as("count"),
    })
    .from(agencyOpsInvoice)
    .where(eq(agencyOpsInvoice.teamId, input.teamId))
    .groupBy(agencyOpsInvoice.status, agencyOpsInvoice.currency);

  let draftCount = 0;
  let sentCount = 0;
  let paidCount = 0;
  // Outstanding amounts keyed by currency (sent invoices only).
  const outstandingByCurrency: Record<string, number> = {};

  for (const row of rows) {
    const count = Number(row.count ?? 0);
    const amount = Number(row.amountCents ?? 0);
    if (row.status === "draft") draftCount += count;
    else if (row.status === "sent") {
      sentCount += count;
      outstandingByCurrency[row.currency] = (outstandingByCurrency[row.currency] ?? 0) + amount;
    } else if (row.status === "paid") paidCount += count;
  }

  // For backward-compat convenience: also expose the USD outstanding total
  // (or the single currency if the team uses only one).
  const currencies = Object.keys(outstandingByCurrency);
  const outstandingCents =
    currencies.length === 1
      ? (outstandingByCurrency[currencies[0]!] ?? 0)
      : (outstandingByCurrency["USD"] ?? 0);
  const currency = currencies.length === 1 ? currencies[0]! : "USD";

  return { draftCount, sentCount, paidCount, outstandingCents, currency, outstandingByCurrency };
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
  input: { teamId: string; invoiceId: string; status: "sent" | "paid" },
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

  const validTransitions: Record<string, string[]> = {
    draft: ["sent"],
    sent: ["paid"],
    paid: [],
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
  if (input.status === "sent") patch.issuedAt = now;
  if (input.status === "paid") patch.paidAt = now;

  const [updated] = await db
    .update(agencyOpsInvoice)
    .set(patch)
    .where(eq(agencyOpsInvoice.id, input.invoiceId))
    .returning();

  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return mapInvoiceRow(updated, existing.clientName);
}

export async function listBudgetsStub(actorUserId: string, input: { teamId: string }) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  return { items: [] as const };
}
