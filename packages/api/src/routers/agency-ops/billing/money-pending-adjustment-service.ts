import { db } from "@orch/db";
import {
  agencyOpsMoneyPendingAdjustment,
  type AgencyOpsMoneyPendingAdjustmentKind,
  type AgencyOpsMoneyPendingPartyType,
} from "@orch/db/schema";
import { and, asc, eq } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@orch/workspace";

import { parseIsoDateTime } from "../shared/date-helpers";
import { requireTeamMembership } from "../shared/membership";
import { getAgencyCurrency, resolveMoneyForTeam } from "./money-fx-service";

export type MoneyPendingAdjustmentRecord = {
  id: string;
  teamId: string;
  partyType: AgencyOpsMoneyPendingPartyType;
  partyId: string;
  periodStart: string | null;
  periodEnd: string | null;
  kind: AgencyOpsMoneyPendingAdjustmentKind;
  amount: number;
  note: string;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
};

function mapPendingAdjustmentRow(
  row: typeof agencyOpsMoneyPendingAdjustment.$inferSelect,
): MoneyPendingAdjustmentRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    partyType: row.partyType,
    partyId: row.partyId,
    periodStart: row.periodStart?.toISOString() ?? null,
    periodEnd: row.periodEnd?.toISOString() ?? null,
    kind: row.kind,
    amount: row.amount,
    note: row.note ?? "",
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listPendingAdjustments(
  actorUserId: string,
  input: {
    teamId: string;
    partyType?: AgencyOpsMoneyPendingPartyType;
    partyId?: string;
  },
): Promise<{ items: MoneyPendingAdjustmentRecord[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const filters = [eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId)];
  if (input.partyType) {
    filters.push(eq(agencyOpsMoneyPendingAdjustment.partyType, input.partyType));
  }
  if (input.partyId) {
    filters.push(eq(agencyOpsMoneyPendingAdjustment.partyId, input.partyId));
  }

  const rows = await db
    .select()
    .from(agencyOpsMoneyPendingAdjustment)
    .where(and(...filters))
    .orderBy(asc(agencyOpsMoneyPendingAdjustment.createdAt));

  return { items: rows.map(mapPendingAdjustmentRow) };
}

export async function upsertPendingAdjustment(
  actorUserId: string,
  input: {
    teamId: string;
    id?: string;
    partyType: AgencyOpsMoneyPendingPartyType;
    partyId: string;
    kind: AgencyOpsMoneyPendingAdjustmentKind;
    amount: number;
    note?: string;
    periodStart?: string;
    periodEnd?: string;
  },
): Promise<MoneyPendingAdjustmentRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  if (!Number.isInteger(input.amount) || input.amount <= 0) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Amount must be a positive integer (minor units).",
    });
  }

  const periodStart = input.periodStart ? parseIsoDateTime(input.periodStart, "periodStart") : null;
  const periodEnd = input.periodEnd ? parseIsoDateTime(input.periodEnd, "periodEnd") : null;
  if (periodStart && periodEnd && periodStart >= periodEnd) {
    throw new ORPCError("BAD_REQUEST", { message: "periodStart must be before periodEnd." });
  }

  const now = new Date();
  const note = input.note?.trim() ?? "";
  const { currency: agencyCurrency } = await getAgencyCurrency(actorUserId, {
    teamId: input.teamId,
  });
  const money = await resolveMoneyForTeam(actorUserId, {
    teamId: input.teamId,
    sourceAmount: input.amount,
    sourceCurrency: agencyCurrency,
  });

  if (input.id) {
    const [existing] = await db
      .select()
      .from(agencyOpsMoneyPendingAdjustment)
      .where(
        and(
          eq(agencyOpsMoneyPendingAdjustment.id, input.id),
          eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId),
        ),
      )
      .limit(1);

    if (!existing) {
      throw new ORPCError("NOT_FOUND", { message: "Pending adjustment was not found." });
    }

    const [updated] = await db
      .update(agencyOpsMoneyPendingAdjustment)
      .set({
        partyType: input.partyType,
        partyId: input.partyId,
        kind: input.kind,
        amount: money.amount,
        currency: money.sourceCurrency,
        sourceAmount: money.sourceAmount,
        fxRate: money.fxRate,
        fxAsOf: new Date(money.fxAsOf),
        note,
        periodStart,
        periodEnd,
        updatedAt: now,
      })
      .where(eq(agencyOpsMoneyPendingAdjustment.id, input.id))
      .returning();

    if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");
    return mapPendingAdjustmentRow(updated);
  }

  const [inserted] = await db
    .insert(agencyOpsMoneyPendingAdjustment)
    .values({
      id: createWorkspaceId("agency-money-adj"),
      teamId: input.teamId,
      partyType: input.partyType,
      partyId: input.partyId,
      kind: input.kind,
      amount: money.amount,
      currency: money.sourceCurrency,
      sourceAmount: money.sourceAmount,
      fxRate: money.fxRate,
      fxAsOf: new Date(money.fxAsOf),
      note,
      periodStart,
      periodEnd,
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  if (!inserted) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return mapPendingAdjustmentRow(inserted);
}

export async function deletePendingAdjustment(
  actorUserId: string,
  input: { teamId: string; id: string },
): Promise<{ id: string }> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [deleted] = await db
    .delete(agencyOpsMoneyPendingAdjustment)
    .where(
      and(
        eq(agencyOpsMoneyPendingAdjustment.id, input.id),
        eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId),
      ),
    )
    .returning({ id: agencyOpsMoneyPendingAdjustment.id });

  if (!deleted) {
    throw new ORPCError("NOT_FOUND", { message: "Pending adjustment was not found." });
  }

  return { id: deleted.id };
}

export async function clearPendingAdjustmentsForParty(
  actorUserId: string,
  input: {
    teamId: string;
    partyType: AgencyOpsMoneyPendingPartyType;
    partyId: string;
  },
): Promise<void> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  await db
    .delete(agencyOpsMoneyPendingAdjustment)
    .where(
      and(
        eq(agencyOpsMoneyPendingAdjustment.teamId, input.teamId),
        eq(agencyOpsMoneyPendingAdjustment.partyType, input.partyType),
        eq(agencyOpsMoneyPendingAdjustment.partyId, input.partyId),
      ),
    );
}
