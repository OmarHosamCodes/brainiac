import type { KnowledgeAction } from "@orch/agent/knowledge-actions";
import { db } from "@orch/db";
import {
  dashboardWorkspace,
  workspaceObject,
  workspacePlacement,
  workspaceRelation,
  workspaceRevision,
} from "@orch/db/schema";
import {
  createWorkspaceId,
  isAgencyObjectType,
  isCanvasNativeObjectType,
  knowledgeObjectSchema,
  knowledgeObjectTypeSchema,
  knowledgeRelationSchema,
  knowledgeToWorkspaceNode,
  WORKSPACE_NODE_LIMIT,
  workspaceNodeToKnowledge,
  type KnowledgeObject,
  type KnowledgeObjectType,
  type KnowledgeObjectView,
  type KnowledgePlacement,
  type KnowledgeRelation,
  type WorkspaceNode,
} from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";

import { requireTeamMembership } from "../../lib/team-membership";
import {
  assertAgencyTargetExists,
  getAgencyKnowledgeView,
  listAgencyKnowledgeViews,
} from "./knowledge-agency";

type QueryInput = {
  teamId?: string;
  objectType?: KnowledgeObjectType;
  query?: string;
  about?: { objectType: KnowledgeObjectType; id: string };
  limit?: number;
  includePlaced?: boolean;
  includeAgency?: boolean;
};

function toIso(value: Date) {
  return value.toISOString();
}

function rowToObject(row: typeof workspaceObject.$inferSelect): KnowledgeObject {
  return knowledgeObjectSchema.parse({
    id: row.id,
    objectType: row.objectType,
    title: row.title,
    ownerUserId: row.ownerUserId,
    visibility: row.visibility,
    teamId: row.teamId,
    properties: row.properties ?? {},
    content: row.content,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

function rowToRelation(row: typeof workspaceRelation.$inferSelect): KnowledgeRelation {
  return knowledgeRelationSchema.parse({
    id: row.id,
    fromObjectId: row.fromObjectId,
    fromObjectType: row.fromObjectType,
    toObjectType: row.toObjectType,
    toObjectId: row.toObjectId,
    relationType: row.relationType,
    ownerUserId: row.ownerUserId,
    teamId: row.teamId,
    properties: row.properties ?? {},
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  });
}

function rowToPlacement(row: typeof workspacePlacement.$inferSelect): KnowledgePlacement {
  return {
    id: row.id,
    objectId: row.objectId,
    viewId: row.viewId,
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    ownerUserId: row.ownerUserId,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
  };
}

async function assertCanReadObject(
  actorUserId: string,
  object: { ownerUserId: string; visibility: string; teamId?: string | null },
) {
  if (object.ownerUserId === actorUserId) return;
  if (object.visibility !== "team" || !object.teamId) {
    throw new ORPCError("NOT_FOUND");
  }
  await requireTeamMembership(actorUserId, object.teamId, "viewer");
}

async function assertCanWriteObject(
  actorUserId: string,
  object: { ownerUserId: string; teamId?: string | null },
) {
  if (object.ownerUserId === actorUserId) return;
  if (!object.teamId) throw new ORPCError("UNAUTHORIZED");
  await requireTeamMembership(actorUserId, object.teamId, "editor");
}

export async function syncKnowledgeFromNodes(
  actorUserId: string,
  input: { nodes: WorkspaceNode[] },
) {
  void actorUserId;
  await db.transaction(async (tx) => {
    for (const node of input.nodes) {
      const { object, placement, relations } = workspaceNodeToKnowledge(node);
      await tx
        .insert(workspaceObject)
        .values({
          id: object.id,
          ownerUserId: object.ownerUserId,
          objectType: object.objectType,
          title: object.title,
          visibility: object.visibility,
          teamId: object.teamId ?? null,
          properties: object.properties,
          content: object.content ?? null,
          createdAt: new Date(object.createdAt),
          updatedAt: new Date(object.updatedAt),
        })
        .onConflictDoUpdate({
          target: workspaceObject.id,
          set: {
            title: object.title,
            visibility: object.visibility,
            teamId: object.teamId ?? null,
            properties: object.properties,
            content: object.content ?? null,
            updatedAt: new Date(object.updatedAt),
          },
        });

      await tx
        .insert(workspacePlacement)
        .values({
          id: placement.id,
          objectId: placement.objectId,
          viewId: placement.viewId,
          x: placement.x,
          y: placement.y,
          width: placement.width,
          height: placement.height,
          ownerUserId: placement.ownerUserId,
          createdAt: new Date(placement.createdAt),
          updatedAt: new Date(placement.updatedAt),
        })
        .onConflictDoUpdate({
          target: [
            workspacePlacement.objectId,
            workspacePlacement.viewId,
            workspacePlacement.ownerUserId,
          ],
          set: {
            x: placement.x,
            y: placement.y,
            width: placement.width,
            height: placement.height,
            updatedAt: new Date(placement.updatedAt),
          },
        });

      await tx
        .delete(workspaceRelation)
        .where(
          and(
            eq(workspaceRelation.fromObjectId, object.id),
            or(
              eq(workspaceRelation.relationType, "related"),
              and(
                eq(workspaceRelation.relationType, "about"),
                inArray(workspaceRelation.toObjectType, ["agency.project", "agency.task"]),
              ),
            ),
          ),
        );

      for (const relation of relations) {
        await tx
          .insert(workspaceRelation)
          .values({
            id: relation.id,
            fromObjectId: relation.fromObjectId,
            fromObjectType: relation.fromObjectType,
            toObjectType: relation.toObjectType,
            toObjectId: relation.toObjectId,
            relationType: relation.relationType,
            ownerUserId: relation.ownerUserId,
            teamId: relation.teamId ?? null,
            properties: relation.properties,
            createdAt: new Date(relation.createdAt),
            updatedAt: new Date(relation.updatedAt),
          })
          .onConflictDoUpdate({
            target: [
              workspaceRelation.fromObjectId,
              workspaceRelation.toObjectType,
              workspaceRelation.toObjectId,
              workspaceRelation.relationType,
            ],
            set: {
              teamId: relation.teamId ?? null,
              properties: relation.properties,
              updatedAt: new Date(relation.updatedAt),
            },
          });
      }
    }
  });
}

export async function deleteKnowledgeForNode(actorUserId: string, input: { objectId: string }) {
  const objectId = input.objectId;
  void actorUserId;
  await db.transaction(async (tx) => {
    await tx.delete(workspaceRelation).where(eq(workspaceRelation.fromObjectId, objectId));
    await tx
      .delete(workspaceRelation)
      .where(
        and(
          eq(workspaceRelation.toObjectId, objectId),
          eq(workspaceRelation.toObjectType, "document"),
        ),
      );
    await tx.delete(workspacePlacement).where(eq(workspacePlacement.objectId, objectId));
    await tx.delete(workspaceObject).where(eq(workspaceObject.id, objectId));
  });
}

export async function backfillWorkspaceKnowledge(
  actorUserId: string,
  _input: Record<string, never>,
) {
  void actorUserId;
  const rows = await db.select().from(dashboardWorkspace);
  for (const row of rows) {
    await syncKnowledgeFromNodes(row.userId, { nodes: row.nodes as WorkspaceNode[] });
  }
  return { workspaceCount: rows.length };
}

export async function queryKnowledgeObjects(
  actorUserId: string,
  input: QueryInput,
): Promise<{ items: KnowledgeObjectView[] }> {
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  if (input.teamId) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");
  }

  if (input.objectType && isAgencyObjectType(input.objectType)) {
    if (!input.teamId) {
      throw new ORPCError("BAD_REQUEST", { message: "Agency projections require teamId." });
    }
    const items = await listAgencyKnowledgeViews(actorUserId, {
      teamId: input.teamId,
      objectType: input.objectType,
      query: input.query,
      limit,
    });
    return { items };
  }

  const filters = [];
  if (input.objectType && isCanvasNativeObjectType(input.objectType)) {
    filters.push(eq(workspaceObject.objectType, input.objectType));
  }
  if (input.query?.trim()) {
    filters.push(ilike(workspaceObject.title, `%${input.query.trim()}%`));
  }
  if (input.about) {
    const aboutRows = await db
      .select({ fromObjectId: workspaceRelation.fromObjectId })
      .from(workspaceRelation)
      .where(
        and(
          eq(workspaceRelation.relationType, "about"),
          eq(workspaceRelation.toObjectType, input.about.objectType),
          eq(workspaceRelation.toObjectId, input.about.id),
        ),
      );
    const ids = aboutRows.map((row) => row.fromObjectId);
    if (ids.length === 0) {
      return { items: [] };
    }
    filters.push(inArray(workspaceObject.id, ids));
  }

  const visibilityFilter = input.teamId
    ? or(
        eq(workspaceObject.ownerUserId, actorUserId),
        and(eq(workspaceObject.visibility, "team"), eq(workspaceObject.teamId, input.teamId)),
      )
    : eq(workspaceObject.ownerUserId, actorUserId);

  const rows = await db
    .select()
    .from(workspaceObject)
    .where(and(visibilityFilter, ...filters))
    .orderBy(desc(workspaceObject.updatedAt))
    .limit(limit);

  const objectIds = rows.map((row) => row.id);
  const placements =
    input.includePlaced === false || objectIds.length === 0
      ? []
      : await db
          .select()
          .from(workspacePlacement)
          .where(
            and(
              inArray(workspacePlacement.objectId, objectIds),
              eq(workspacePlacement.ownerUserId, actorUserId),
              eq(workspacePlacement.viewId, "board"),
            ),
          );
  const placementByObject = new Map(placements.map((row) => [row.objectId, rowToPlacement(row)]));

  const relationRows =
    objectIds.length === 0
      ? []
      : await db
          .select()
          .from(workspaceRelation)
          .where(
            or(
              inArray(workspaceRelation.fromObjectId, objectIds),
              and(
                inArray(workspaceRelation.toObjectId, objectIds),
                eq(workspaceRelation.toObjectType, "document"),
              ),
            ),
          );
  const counts = new Map<string, { in: number; out: number }>();
  for (const id of objectIds) {
    counts.set(id, { in: 0, out: 0 });
  }
  for (const row of relationRows) {
    const out = counts.get(row.fromObjectId);
    if (out) out.out += 1;
    const inbound = counts.get(row.toObjectId);
    if (inbound && row.toObjectType === "document") inbound.in += 1;
  }

  const canvasItems: KnowledgeObjectView[] = rows.map((row) => ({
    origin: "canvas" as const,
    objectType: knowledgeObjectTypeSchema.parse(row.objectType),
    id: row.id,
    title: row.title,
    teamId: row.teamId,
    properties: row.properties ?? {},
    placement: placementByObject.get(row.id) ?? null,
    relationCounts: counts.get(row.id) ?? { in: 0, out: 0 },
  }));

  if (!input.teamId || input.includeAgency === false || input.objectType || input.about) {
    return { items: canvasItems.slice(0, limit) };
  }

  const remaining = limit - canvasItems.length;
  if (remaining <= 0) {
    return { items: canvasItems.slice(0, limit) };
  }
  const teamId = input.teamId;
  const agencyTypes = [
    "agency.project",
    "agency.task",
    "agency.member",
    "agency.client",
    "agency.timeEntry",
  ] as const;
  const agencyBatches = await Promise.all(
    agencyTypes.map((objectType) =>
      listAgencyKnowledgeViews(actorUserId, {
        teamId,
        objectType,
        query: input.query,
        limit: remaining,
      }),
    ),
  );
  return { items: [...canvasItems, ...agencyBatches.flat()].slice(0, limit) };
}

export async function getKnowledgeObject(
  actorUserId: string,
  input: { id: string; objectType?: KnowledgeObjectType; teamId?: string },
) {
  if (input.objectType && isAgencyObjectType(input.objectType)) {
    if (!input.teamId) {
      throw new ORPCError("BAD_REQUEST", { message: "Agency projections require teamId." });
    }
    await requireTeamMembership(actorUserId, input.teamId, "viewer");
    const view = await getAgencyKnowledgeView(actorUserId, {
      teamId: input.teamId,
      objectType: input.objectType,
      id: input.id,
    });
    const inbound = await db
      .select()
      .from(workspaceRelation)
      .where(
        and(
          eq(workspaceRelation.toObjectType, input.objectType),
          eq(workspaceRelation.toObjectId, input.id),
        ),
      )
      .limit(50);
    return {
      view,
      object: null,
      relations: inbound.map(rowToRelation),
      revisions: [],
    };
  }

  const [row] = await db
    .select()
    .from(workspaceObject)
    .where(eq(workspaceObject.id, input.id))
    .limit(1);
  if (!row) {
    throw new ORPCError("NOT_FOUND");
  }
  await assertCanReadObject(actorUserId, row);
  const object = rowToObject(row);
  const relations = await db
    .select()
    .from(workspaceRelation)
    .where(
      or(
        eq(workspaceRelation.fromObjectId, object.id),
        and(
          eq(workspaceRelation.toObjectId, object.id),
          eq(workspaceRelation.toObjectType, object.objectType),
        ),
      ),
    );
  const revisions = await db
    .select()
    .from(workspaceRevision)
    .where(eq(workspaceRevision.objectId, object.id))
    .orderBy(desc(workspaceRevision.createdAt))
    .limit(5);
  const [placement] = await db
    .select()
    .from(workspacePlacement)
    .where(
      and(
        eq(workspacePlacement.objectId, object.id),
        eq(workspacePlacement.ownerUserId, actorUserId),
        eq(workspacePlacement.viewId, "board"),
      ),
    )
    .limit(1);

  return {
    view: {
      origin: "canvas" as const,
      objectType: object.objectType,
      id: object.id,
      title: object.title,
      teamId: object.teamId ?? null,
      properties: object.properties,
      placement: placement ? rowToPlacement(placement) : null,
      missing: false,
    } satisfies KnowledgeObjectView,
    object,
    relations: relations.map(rowToRelation),
    revisions: revisions.map((revision) => ({
      id: revision.id,
      objectId: revision.objectId,
      actorUserId: revision.actorUserId,
      proposalId: revision.proposalId,
      before: revision.before,
      after: revision.after,
      createdAt: toIso(revision.createdAt),
    })),
  };
}

async function loadObject(id: string) {
  const [row] = await db.select().from(workspaceObject).where(eq(workspaceObject.id, id)).limit(1);
  return row ? rowToObject(row) : null;
}

async function projectObjectIntoWorkspace(actorUserId: string, objectId: string) {
  const object = await loadObject(objectId);
  if (!object) return;
  const relations = (
    await db.select().from(workspaceRelation).where(eq(workspaceRelation.fromObjectId, objectId))
  ).map(rowToRelation);
  const [placementRow] = await db
    .select()
    .from(workspacePlacement)
    .where(
      and(
        eq(workspacePlacement.objectId, objectId),
        eq(workspacePlacement.ownerUserId, object.ownerUserId),
        eq(workspacePlacement.viewId, "board"),
      ),
    )
    .limit(1);
  const node = knowledgeToWorkspaceNode(
    object,
    placementRow ? rowToPlacement(placementRow) : null,
    relations,
  );
  // ponytail: graph rows are uncapped; board cards still share WORKSPACE_NODE_LIMIT (200). Plan 2 lifts the board cap with clustering.
  const [workspace] = await db
    .select()
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, object.ownerUserId))
    .limit(1);
  const existing = (workspace?.nodes ?? []) as WorkspaceNode[];
  const replacing = existing.some((entry) => entry.id === node.id);
  if (!replacing && existing.length >= WORKSPACE_NODE_LIMIT) {
    return;
  }
  const next = replacing
    ? existing.map((entry) => (entry.id === node.id ? node : entry))
    : [...existing, node];
  await db
    .insert(dashboardWorkspace)
    .values({
      userId: object.ownerUserId,
      nodes: next,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: dashboardWorkspace.userId,
      set: { nodes: next, updatedAt: new Date() },
    });
  void actorUserId;
}

async function insertRevision(input: {
  objectId: string;
  actorUserId: string;
  proposalId?: string | null;
  before: unknown;
  after: unknown;
}) {
  await db.insert(workspaceRevision).values({
    id: createWorkspaceId("krev"),
    objectId: input.objectId,
    actorUserId: input.actorUserId,
    proposalId: input.proposalId ?? null,
    before: input.before,
    after: input.after,
  });
}

export async function applyKnowledgeAction(
  actorUserId: string,
  input: { action: KnowledgeAction; proposalId?: string | null; teamId?: string | null },
) {
  const action = input.action;
  const teamId = input.teamId ?? null;
  switch (action.type) {
    case "object.create": {
      if (!isCanvasNativeObjectType(action.objectType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot create Agency records from knowledge actions.",
        });
      }
      const visibility = action.visibility ?? (action.teamId ? "team" : "private");
      const objectTeamId = action.teamId ?? (visibility === "team" ? teamId : null);
      if (visibility === "team") {
        if (!objectTeamId) {
          throw new ORPCError("BAD_REQUEST", { message: "Team-visible objects require teamId." });
        }
        await requireTeamMembership(actorUserId, objectTeamId, "editor");
      }
      if (action.about && isAgencyObjectType(action.about.objectType)) {
        const relationTeamId = objectTeamId ?? teamId;
        if (!relationTeamId) {
          throw new ORPCError("BAD_REQUEST", { message: "Agency links require teamId." });
        }
        await requireTeamMembership(actorUserId, relationTeamId, "editor");
        await assertAgencyTargetExists(actorUserId, {
          teamId: relationTeamId,
          objectType: action.about.objectType,
          id: action.about.id,
        });
      }
      const now = new Date();
      const id = action.id ?? createWorkspaceId("kobj");
      const object = knowledgeObjectSchema.parse({
        id,
        objectType: action.objectType,
        title: action.title,
        ownerUserId: actorUserId,
        visibility,
        teamId: objectTeamId,
        properties: action.properties ?? {},
        content: null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      });
      await db.insert(workspaceObject).values({
        id: object.id,
        ownerUserId: object.ownerUserId,
        objectType: object.objectType,
        title: object.title,
        visibility: object.visibility,
        teamId: object.teamId ?? null,
        properties: object.properties,
        content: object.content ?? null,
        createdAt: now,
        updatedAt: now,
      });
      if (action.placement) {
        await db.insert(workspacePlacement).values({
          id: createWorkspaceId("kplc"),
          objectId: object.id,
          viewId: "board",
          x: action.placement.x,
          y: action.placement.y,
          width: action.placement.width ?? 320,
          height: action.placement.height ?? 220,
          ownerUserId: actorUserId,
          createdAt: now,
          updatedAt: now,
        });
      }
      if (action.about) {
        const nowRelation = new Date();
        await db.insert(workspaceRelation).values({
          id: createWorkspaceId("krel"),
          fromObjectId: object.id,
          fromObjectType: object.objectType,
          toObjectType: action.about.objectType,
          toObjectId: action.about.id,
          relationType: "about",
          ownerUserId: actorUserId,
          teamId: object.teamId ?? teamId,
          properties: {},
          createdAt: nowRelation,
          updatedAt: nowRelation,
        });
      }
      await insertRevision({
        objectId: object.id,
        actorUserId,
        proposalId: input.proposalId,
        before: null,
        after: object,
      });
      await projectObjectIntoWorkspace(actorUserId, object.id);
      return { before: null, after: object, objectId: object.id };
    }
    case "object.update": {
      if (action.objectType && isAgencyObjectType(action.objectType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot update Agency records from knowledge actions.",
        });
      }
      const existing = await loadObject(action.objectId);
      if (!existing) throw new ORPCError("NOT_FOUND");
      await assertCanReadObject(actorUserId, existing);
      await assertCanWriteObject(actorUserId, existing);
      const next = knowledgeObjectSchema.parse({
        ...existing,
        title: action.title ?? existing.title,
        visibility: action.visibility ?? existing.visibility,
        teamId: action.teamId === undefined ? existing.teamId : action.teamId,
        properties: action.properties
          ? { ...existing.properties, ...action.properties }
          : existing.properties,
        updatedAt: new Date().toISOString(),
      });
      await db
        .update(workspaceObject)
        .set({
          title: next.title,
          visibility: next.visibility,
          teamId: next.teamId ?? null,
          properties: next.properties,
          updatedAt: new Date(),
        })
        .where(eq(workspaceObject.id, next.id));
      await insertRevision({
        objectId: next.id,
        actorUserId,
        proposalId: input.proposalId,
        before: existing,
        after: next,
      });
      await projectObjectIntoWorkspace(actorUserId, next.id);
      return { before: existing, after: next, objectId: next.id };
    }
    case "object.delete": {
      if (action.objectType && isAgencyObjectType(action.objectType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot delete Agency records from knowledge actions.",
        });
      }
      const existing = await loadObject(action.objectId);
      if (!existing) throw new ORPCError("NOT_FOUND");
      await assertCanWriteObject(actorUserId, existing);
      await insertRevision({
        objectId: existing.id,
        actorUserId,
        proposalId: input.proposalId,
        before: existing,
        after: null,
      });
      await deleteKnowledgeForNode(actorUserId, { objectId: existing.id });
      const [workspace] = await db
        .select()
        .from(dashboardWorkspace)
        .where(eq(dashboardWorkspace.userId, existing.ownerUserId))
        .limit(1);
      const next = ((workspace?.nodes ?? []) as WorkspaceNode[]).filter(
        (node) => node.id !== existing.id,
      );
      if (workspace) {
        await db
          .update(dashboardWorkspace)
          .set({ nodes: next, updatedAt: new Date() })
          .where(eq(dashboardWorkspace.userId, existing.ownerUserId));
      }
      return { before: existing, after: null, objectId: existing.id };
    }
    case "relation.create": {
      const from = await loadObject(action.fromObjectId);
      if (!from) throw new ORPCError("NOT_FOUND");
      await assertCanWriteObject(actorUserId, from);
      const relationTeamId = from.teamId ?? teamId;
      if (isAgencyObjectType(action.to.objectType)) {
        if (!relationTeamId) {
          throw new ORPCError("BAD_REQUEST", { message: "Agency links require teamId." });
        }
        await requireTeamMembership(actorUserId, relationTeamId, "editor");
        await assertAgencyTargetExists(actorUserId, {
          teamId: relationTeamId,
          objectType: action.to.objectType,
          id: action.to.id,
        });
      }
      const now = new Date();
      const relation: KnowledgeRelation = {
        id: createWorkspaceId("krel"),
        fromObjectId: from.id,
        fromObjectType: from.objectType,
        toObjectType: action.to.objectType,
        toObjectId: action.to.id,
        relationType: action.relationType,
        ownerUserId: actorUserId,
        teamId: relationTeamId,
        properties: {},
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      };
      await db
        .insert(workspaceRelation)
        .values({
          id: relation.id,
          fromObjectId: relation.fromObjectId,
          fromObjectType: relation.fromObjectType,
          toObjectType: relation.toObjectType,
          toObjectId: relation.toObjectId,
          relationType: relation.relationType,
          ownerUserId: relation.ownerUserId,
          teamId: relation.teamId,
          properties: {},
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoNothing();
      await projectObjectIntoWorkspace(actorUserId, from.id);
      return { before: null, after: relation, objectId: from.id };
    }
    case "relation.delete": {
      const [row] = await db
        .select()
        .from(workspaceRelation)
        .where(eq(workspaceRelation.id, action.relationId))
        .limit(1);
      if (!row) throw new ORPCError("NOT_FOUND");
      const from = await loadObject(row.fromObjectId);
      if (!from) throw new ORPCError("NOT_FOUND");
      await assertCanWriteObject(actorUserId, from);
      await db.delete(workspaceRelation).where(eq(workspaceRelation.id, action.relationId));
      await projectObjectIntoWorkspace(actorUserId, row.fromObjectId);
      return { before: rowToRelation(row), after: null, objectId: row.fromObjectId };
    }
    case "placement.upsert": {
      if (action.objectType && isAgencyObjectType(action.objectType)) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot place Agency records on the board in this plan.",
        });
      }
      const existing = await loadObject(action.objectId);
      if (!existing) throw new ORPCError("NOT_FOUND");
      await assertCanWriteObject(actorUserId, existing);
      const now = new Date();
      await db
        .insert(workspacePlacement)
        .values({
          id: createWorkspaceId("kplc"),
          objectId: action.objectId,
          viewId: "board",
          x: action.x,
          y: action.y,
          width: action.width ?? 320,
          height: action.height ?? 220,
          ownerUserId: actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: [
            workspacePlacement.objectId,
            workspacePlacement.viewId,
            workspacePlacement.ownerUserId,
          ],
          set: {
            x: action.x,
            y: action.y,
            width: action.width ?? 320,
            height: action.height ?? 220,
            updatedAt: now,
          },
        });
      await projectObjectIntoWorkspace(actorUserId, action.objectId);
      return { before: existing, after: existing, objectId: action.objectId };
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
