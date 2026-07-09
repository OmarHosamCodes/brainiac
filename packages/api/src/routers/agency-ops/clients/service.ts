import { eq, isNotNull, isNull, and, asc, sql } from "drizzle-orm";
import { agencyOpsClient, agencyOpsClientContact } from "@brainiac/db/schema";
import { db } from "@brainiac/db";
import { createWorkspaceId } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { type AgencyClientArchiveFilter, getClientByIdForTeam } from "../shared/utils";
import { requireTeamMembership } from "../shared/membership";

type AgencyClientRecord = {
  id: string;
  teamId: string;
  name: string;
  category: "internal" | "external";
  billableRateCents: number | null;
  currency: string;
  createdAt: string;
  updatedAt: string;
};

function mapClientRow(row: {
  id: string;
  teamId: string;
  name: string;
  category: "internal" | "external";
  billableRateCents: number | null;
  currency: string;
  createdAt: Date;
  updatedAt: Date;
}): AgencyClientRecord {
  return {
    id: row.id,
    teamId: row.teamId,
    name: row.name,
    category: row.category,
    billableRateCents: row.billableRateCents,
    currency: row.currency,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function listAgencyClients(
  actorUserId: string,
  input: {
    teamId: string;
    includeArchived?: boolean;
    archiveFilter?: AgencyClientArchiveFilter;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const archiveFilter = input.archiveFilter ?? (input.includeArchived ? "all" : "nonarchived");

  const filters = [eq(agencyOpsClient.teamId, input.teamId)];
  if (archiveFilter === "archived") {
    filters.push(isNotNull(agencyOpsClient.archivedAt));
  } else if (archiveFilter === "nonarchived") {
    filters.push(isNull(agencyOpsClient.archivedAt));
  }

  const rows = await db
    .select({
      id: agencyOpsClient.id,
      teamId: agencyOpsClient.teamId,
      name: agencyOpsClient.name,
      category: agencyOpsClient.category,
      billableRateCents: agencyOpsClient.billableRateCents,
      currency: agencyOpsClient.currency,
      archivedAt: agencyOpsClient.archivedAt,
      createdAt: agencyOpsClient.createdAt,
      updatedAt: agencyOpsClient.updatedAt,
    })
    .from(agencyOpsClient)
    .where(and(...filters))
    .orderBy(asc(agencyOpsClient.name));

  return {
    items: rows.map((row) => ({
      ...mapClientRow(row),
      archivedAt: row.archivedAt?.toISOString() ?? null,
    })),
  };
}

export async function createAgencyClient(
  actorUserId: string,
  input: {
    teamId: string;
    name: string;
    category?: "internal" | "external";
    billableRateCents?: number | null;
    currency?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const now = new Date();
  const [created] = await db
    .insert(agencyOpsClient)
    .values({
      id: createWorkspaceId("agency-client"),
      teamId: input.teamId,
      name: input.name.trim(),
      category: input.category ?? "external",
      billableRateCents: input.billableRateCents ?? null,
      currency: input.currency ?? "USD",
      createdByUserId: actorUserId,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: agencyOpsClient.id,
      teamId: agencyOpsClient.teamId,
      name: agencyOpsClient.name,
      category: agencyOpsClient.category,
      billableRateCents: agencyOpsClient.billableRateCents,
      currency: agencyOpsClient.currency,
      archivedAt: agencyOpsClient.archivedAt,
      createdAt: agencyOpsClient.createdAt,
      updatedAt: agencyOpsClient.updatedAt,
    });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  return { ...mapClientRow(created), archivedAt: created.archivedAt?.toISOString() ?? null };
}

export async function updateAgencyClient(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name?: string;
    category?: "internal" | "external";
    billableRateCents?: number | null;
    currency?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [current] = await db
    .select({
      id: agencyOpsClient.id,
    })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
    .limit(1);

  if (!current) {
    throw new ORPCError("NOT_FOUND");
  }

  const hasPatch =
    input.name !== undefined ||
    input.category !== undefined ||
    input.billableRateCents !== undefined ||
    input.currency !== undefined;

  if (!hasPatch) {
    throw new ORPCError("BAD_REQUEST", { message: "No fields to update." });
  }

  const now = new Date();
  const patch: {
    updatedAt: Date;
    name?: string;
    category?: "internal" | "external";
    billableRateCents?: number | null;
    currency?: string;
  } = { updatedAt: now };

  if (input.name !== undefined) {
    patch.name = input.name.trim();
  }
  if (input.category !== undefined) {
    patch.category = input.category;
  }
  if (input.billableRateCents !== undefined) {
    patch.billableRateCents = input.billableRateCents;
  }
  if (input.currency !== undefined) {
    patch.currency = input.currency;
  }

  const [updated] = await db
    .update(agencyOpsClient)
    .set(patch)
    .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
    .returning({
      id: agencyOpsClient.id,
      teamId: agencyOpsClient.teamId,
      name: agencyOpsClient.name,
      category: agencyOpsClient.category,
      billableRateCents: agencyOpsClient.billableRateCents,
      currency: agencyOpsClient.currency,
      archivedAt: agencyOpsClient.archivedAt,
      createdAt: agencyOpsClient.createdAt,
      updatedAt: agencyOpsClient.updatedAt,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  return { ...mapClientRow(updated), archivedAt: updated.archivedAt?.toISOString() ?? null };
}

export async function archiveAgencyClient(
  actorUserId: string,
  input: { teamId: string; clientId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [client] = await db
    .select({ id: agencyOpsClient.id, archivedAt: agencyOpsClient.archivedAt })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)))
    .limit(1);

  if (!client) {
    throw new ORPCError("NOT_FOUND", { message: "Client was not found." });
  }

  if (client.archivedAt) {
    throw new ORPCError("BAD_REQUEST", { message: "Client is already archived." });
  }

  const now = new Date();
  await db
    .update(agencyOpsClient)
    .set({ archivedAt: now, updatedAt: now })
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)));

  return { clientId: input.clientId, archived: true };
}

export async function unarchiveAgencyClient(
  actorUserId: string,
  input: { teamId: string; clientId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const now = new Date();
  await db
    .update(agencyOpsClient)
    .set({ archivedAt: null, updatedAt: now })
    .where(and(eq(agencyOpsClient.id, input.clientId), eq(agencyOpsClient.teamId, input.teamId)));

  return { clientId: input.clientId, archived: false };
}

type AgencyClientContactRecord = {
  id: string;
  teamId: string;
  clientId: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
};

export async function getClientContact(
  actorUserId: string,
  input: { teamId: string; clientId: string },
): Promise<AgencyClientContactRecord | null> {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [row] = await db
    .select()
    .from(agencyOpsClientContact)
    .where(
      and(
        eq(agencyOpsClientContact.teamId, input.teamId),
        eq(agencyOpsClientContact.clientId, input.clientId),
      ),
    )
    .limit(1);

  if (!row) return null;

  return {
    id: row.id,
    teamId: row.teamId,
    clientId: row.clientId,
    name: row.name,
    email: row.email,
    phone: row.phone,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function upsertClientContact(
  actorUserId: string,
  input: {
    teamId: string;
    clientId: string;
    name?: string;
    email?: string;
    phone?: string;
  },
): Promise<AgencyClientContactRecord> {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  await getClientByIdForTeam(input.teamId, input.clientId);

  const now = new Date();

  // Use a single upsert to avoid a TOCTOU race between the existence check
  // and the insert (two concurrent callers could both see no row and both try
  // to insert, hitting the unique constraint).
  const [upserted] = await db
    .insert(agencyOpsClientContact)
    .values({
      id: createWorkspaceId("agency-contact"),
      teamId: input.teamId,
      clientId: input.clientId,
      name: input.name ?? "",
      email: input.email ?? "",
      phone: input.phone ?? "",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsClientContact.clientId],
      set: {
        name: input.name !== undefined ? input.name : sql`${agencyOpsClientContact.name}`,
        email: input.email !== undefined ? input.email : sql`${agencyOpsClientContact.email}`,
        phone: input.phone !== undefined ? input.phone : sql`${agencyOpsClientContact.phone}`,
        updatedAt: now,
      },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return {
    id: upserted.id,
    teamId: upserted.teamId,
    clientId: upserted.clientId,
    name: upserted.name,
    email: upserted.email,
    phone: upserted.phone,
    createdAt: upserted.createdAt.toISOString(),
    updatedAt: upserted.updatedAt.toISOString(),
  };
}
