import { db } from "@brainiac/db";
import {
  dashboardWorkspace,
  workspaceMarketplaceItem,
  workspaceTeamMember,
} from "@brainiac/db/schema";
import {
  WORKSPACE_MARKETPLACE_ITEM_LIMIT,
  createWorkspaceId,
  isWorkspaceTeamOnlyBlockType,
  normalizeWorkspaceNode,
  workspaceMarketplaceItemSchema,
  workspaceNodeVisibilitySchema,
  type WorkspaceMarketplaceItem,
  type WorkspaceMarketplaceSaveInput,
  type WorkspaceNode,
  type WorkspaceNodeVisibility,
  type WorkspaceTeamRole,
} from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { desc, eq, inArray } from "drizzle-orm";

const TEAM_ROLE_WEIGHT: Record<WorkspaceTeamRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function hasRoleAtLeast(role: WorkspaceTeamRole, required: WorkspaceTeamRole) {
  return TEAM_ROLE_WEIGHT[role] >= TEAM_ROLE_WEIGHT[required];
}

function normalizeVisibility(visibility: WorkspaceNodeVisibility | undefined, teamId: string | null) {
  const parsedVisibility = workspaceNodeVisibilitySchema.parse(visibility ?? "private");

  if (!teamId) {
    return "private" as const;
  }

  return parsedVisibility === "team" ? "team" : "private";
}

function withOwnerDefaults(node: WorkspaceNode, ownerUserId: string): WorkspaceNode {
  return normalizeWorkspaceNode({
    ...node,
    ownerUserId: node.ownerUserId ?? ownerUserId,
    visibility: normalizeVisibility(node.visibility, node.teamId ?? null),
    teamId: node.teamId ?? null,
  });
}

async function getMembershipMapByUser(userId: string) {
  const memberships = await db
    .select({
      teamId: workspaceTeamMember.teamId,
      role: workspaceTeamMember.role,
    })
    .from(workspaceTeamMember)
    .where(eq(workspaceTeamMember.userId, userId));

  return new Map(memberships.map((membership) => [membership.teamId, membership.role]));
}

async function upsertWorkspaceNodes(userId: string, nodes: WorkspaceNode[], now: Date) {
  await db
    .insert(dashboardWorkspace)
    .values({
      userId,
      nodes,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: dashboardWorkspace.userId,
      set: {
        nodes,
        updatedAt: now,
      },
    });
}

async function getWorkspaceRowsByUserIds(userIds: string[]) {
  if (userIds.length === 0) {
    return [];
  }

  return db
    .select({
      userId: dashboardWorkspace.userId,
      nodes: dashboardWorkspace.nodes,
      updatedAt: dashboardWorkspace.updatedAt,
    })
    .from(dashboardWorkspace)
    .where(inArray(dashboardWorkspace.userId, userIds));
}

function getNodeOwnerKey(node: WorkspaceNode) {
  return `${node.ownerUserId ?? ""}:${node.id}`;
}

function getLatestUpdatedAtIso(rows: Array<{ updatedAt: Date }>) {
  if (rows.length === 0) {
    return null;
  }

  return rows
    .reduce((latest, row) => (row.updatedAt > latest ? row.updatedAt : latest), rows[0]!.updatedAt)
    .toISOString();
}

function validateTeamOnlyBlockPlacement(node: WorkspaceNode) {
  const hasTeamOnlyBlock = node.tabs.some((tab) =>
    tab.blocks.some((block) => isWorkspaceTeamOnlyBlockType(block.type)),
  );

  if (!hasTeamOnlyBlock) {
    return;
  }

  if (node.visibility !== "team" || !node.teamId) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Team-only blocks can only be saved on team-shared nodes.",
    });
  }
}

export async function getWorkspaceSnapshot(userId: string) {
  const [workspace] = await db
    .select({
      nodes: dashboardWorkspace.nodes,
      updatedAt: dashboardWorkspace.updatedAt,
    })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  const membershipMap = await getMembershipMapByUser(userId);
  const teamIds = [...membershipMap.keys()];
  const memberRows =
    teamIds.length > 0
      ? await db
        .select({ userId: workspaceTeamMember.userId })
        .from(workspaceTeamMember)
        .where(inArray(workspaceTeamMember.teamId, teamIds))
      : [];
  const relatedUserIds = [...new Set(memberRows.map((row) => row.userId).filter((id) => id !== userId))];
  const relatedWorkspaces = await getWorkspaceRowsByUserIds(relatedUserIds);

  const ownNodes = (workspace?.nodes ?? []).map((node) =>
    withOwnerDefaults(node as WorkspaceNode, userId),
  );
  const sharedNodes = relatedWorkspaces.flatMap((relatedWorkspace) => {
    return (relatedWorkspace.nodes ?? [])
      .map((node) => withOwnerDefaults(node as WorkspaceNode, relatedWorkspace.userId))
      .filter((node) => {
        if (node.visibility !== "team" || !node.teamId) {
          return false;
        }

        return membershipMap.has(node.teamId);
      });
  });

  const dedupedNodes = new Map<string, WorkspaceNode>();

  for (const node of [...ownNodes, ...sharedNodes]) {
    dedupedNodes.set(getNodeOwnerKey(node), node);
  }

  const latestUpdatedAt = getLatestUpdatedAtIso(
    [
      ...(workspace?.updatedAt ? [{ updatedAt: workspace.updatedAt }] : []),
      ...relatedWorkspaces.map((row) => ({ updatedAt: row.updatedAt })),
    ].filter((row): row is { updatedAt: Date } => Boolean(row.updatedAt)),
  );

  return {
    nodes: [...dedupedNodes.values()],
    updatedAt: latestUpdatedAt,
  };
}

export async function saveWorkspaceNodes(userId: string, nodes: WorkspaceNode[]) {
  const now = new Date();
  const membershipMap = await getMembershipMapByUser(userId);
  const ownedNodes: WorkspaceNode[] = [];
  const sharedNodesByOwner = new Map<string, WorkspaceNode[]>();

  for (const nodeInput of nodes) {
    const node = normalizeWorkspaceNode(nodeInput);
    const ownerUserId = node.ownerUserId ?? userId;

    if (ownerUserId === userId) {
      const teamId = node.teamId ?? null;
      const visibility = normalizeVisibility(node.visibility, teamId);

      if (visibility === "team") {
        if (!teamId) {
          throw new ORPCError("BAD_REQUEST");
        }

        const memberRole = membershipMap.get(teamId);

        if (!memberRole || !hasRoleAtLeast(memberRole, "editor")) {
          throw new ORPCError("UNAUTHORIZED");
        }
      }

      ownedNodes.push(
        withOwnerDefaults(
          {
            ...node,
            ownerUserId,
            visibility,
            teamId: visibility === "team" ? teamId : null,
          },
          ownerUserId,
        ),
      );

      const savedNode = ownedNodes[ownedNodes.length - 1];

      if (savedNode) {
        validateTeamOnlyBlockPlacement(savedNode);
      }

      continue;
    }

    const teamId = node.teamId ?? null;

    if (!teamId || node.visibility !== "team") {
      throw new ORPCError("UNAUTHORIZED");
    }

    const memberRole = membershipMap.get(teamId);

    if (!memberRole || !hasRoleAtLeast(memberRole, "editor")) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const ownerNodes = sharedNodesByOwner.get(ownerUserId) ?? [];
    ownerNodes.push(
      withOwnerDefaults(
        {
          ...node,
          ownerUserId,
          visibility: "team",
          teamId,
        },
        ownerUserId,
      ),
    );
    const savedNode = ownerNodes[ownerNodes.length - 1];

    if (savedNode) {
      validateTeamOnlyBlockPlacement(savedNode);
    }

    sharedNodesByOwner.set(ownerUserId, ownerNodes);
  }

  await upsertWorkspaceNodes(userId, ownedNodes, now);

  for (const [ownerUserId, updates] of sharedNodesByOwner.entries()) {
    const [ownerWorkspace] = await db
      .select({
        nodes: dashboardWorkspace.nodes,
      })
      .from(dashboardWorkspace)
      .where(eq(dashboardWorkspace.userId, ownerUserId))
      .limit(1);

    const existingNodes = (ownerWorkspace?.nodes ?? []).map((node) =>
      withOwnerDefaults(node as WorkspaceNode, ownerUserId),
    );
    const existingById = new Map(existingNodes.map((node) => [node.id, node]));

    for (const update of updates) {
      if (!existingById.has(update.id)) {
        throw new ORPCError("NOT_FOUND");
      }

      existingById.set(update.id, update);
    }

    await upsertWorkspaceNodes(ownerUserId, [...existingById.values()], now);
  }

  return {
    nodeCount: nodes.length,
    savedAt: now.toISOString(),
    updatedAt: now.toISOString(),
  };
}

export async function shareWorkspaceNode(userId: string, input: { nodeId: string; teamId: string }) {
  const membershipMap = await getMembershipMapByUser(userId);
  const role = membershipMap.get(input.teamId);

  if (!role || !hasRoleAtLeast(role, "editor")) {
    throw new ORPCError("UNAUTHORIZED");
  }

  const [workspace] = await db
    .select({ nodes: dashboardWorkspace.nodes })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  const nodes = (workspace?.nodes ?? []).map((node) => withOwnerDefaults(node as WorkspaceNode, userId));
  const targetNode = nodes.find((node) => node.id === input.nodeId);

  if (!targetNode) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();
  const updatedNodes = nodes.map((node) => {
    if (node.id !== input.nodeId) {
      return node;
    }

    return withOwnerDefaults(
      {
        ...node,
        ownerUserId: userId,
        visibility: "team",
        teamId: input.teamId,
        updatedAt: now.toISOString(),
      },
      userId,
    );
  });

  await upsertWorkspaceNodes(userId, updatedNodes, now);

  return {
    nodeId: input.nodeId,
    teamId: input.teamId,
    visibility: "team" as const,
  };
}

export async function unshareWorkspaceNode(userId: string, input: { nodeId: string }) {
  const [workspace] = await db
    .select({ nodes: dashboardWorkspace.nodes })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  const nodes = (workspace?.nodes ?? []).map((node) => withOwnerDefaults(node as WorkspaceNode, userId));
  const targetNode = nodes.find((node) => node.id === input.nodeId);

  if (!targetNode) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();
  const updatedNodes = nodes.map((node) => {
    if (node.id !== input.nodeId) {
      return node;
    }

    return withOwnerDefaults(
      {
        ...node,
        ownerUserId: userId,
        visibility: "private",
        teamId: null,
        updatedAt: now.toISOString(),
      },
      userId,
    );
  });

  await upsertWorkspaceNodes(userId, updatedNodes, now);

  return {
    nodeId: input.nodeId,
    visibility: "private" as const,
  };
}

export async function deleteWorkspaceNode(
  userId: string,
  input: { nodeId: string; ownerUserId?: string },
) {
  const ownerUserId = input.ownerUserId ?? userId;

  if (ownerUserId !== userId) {
    const membershipMap = await getMembershipMapByUser(userId);

    const [ownerWorkspace] = await db
      .select({ nodes: dashboardWorkspace.nodes })
      .from(dashboardWorkspace)
      .where(eq(dashboardWorkspace.userId, ownerUserId))
      .limit(1);

    if (!ownerWorkspace) {
      throw new ORPCError("NOT_FOUND");
    }

    const ownerNodes = (ownerWorkspace.nodes ?? []).map((node) =>
      withOwnerDefaults(node as WorkspaceNode, ownerUserId),
    );
    const targetNode = ownerNodes.find((node) => node.id === input.nodeId);

    if (!targetNode || targetNode.visibility !== "team" || !targetNode.teamId) {
      throw new ORPCError("NOT_FOUND");
    }

    const role = membershipMap.get(targetNode.teamId);

    if (!role || !hasRoleAtLeast(role, "editor")) {
      throw new ORPCError("UNAUTHORIZED");
    }

    const now = new Date();
    await upsertWorkspaceNodes(
      ownerUserId,
      ownerNodes.filter((node) => node.id !== input.nodeId),
      now,
    );

    return {
      nodeId: input.nodeId,
      ownerUserId,
      deleted: true,
    };
  }

  const [workspace] = await db
    .select({ nodes: dashboardWorkspace.nodes })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  const nodes = (workspace?.nodes ?? []).map((node) => withOwnerDefaults(node as WorkspaceNode, userId));

  if (!nodes.some((node) => node.id === input.nodeId)) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();
  await upsertWorkspaceNodes(
    userId,
    nodes.filter((node) => node.id !== input.nodeId),
    now,
  );

  return {
    nodeId: input.nodeId,
    ownerUserId: userId,
    deleted: true,
  };
}

export async function getWorkspaceMarketplaceItems(): Promise<WorkspaceMarketplaceItem[]> {
  const rows = await db
    .select({
      id: workspaceMarketplaceItem.id,
      title: workspaceMarketplaceItem.title,
      summary: workspaceMarketplaceItem.summary,
      payload: workspaceMarketplaceItem.payload,
      createdByUserId: workspaceMarketplaceItem.createdByUserId,
      createdByName: workspaceMarketplaceItem.createdByName,
      createdAt: workspaceMarketplaceItem.createdAt,
      updatedAt: workspaceMarketplaceItem.updatedAt,
    })
    .from(workspaceMarketplaceItem)
    .orderBy(desc(workspaceMarketplaceItem.createdAt))
    .limit(WORKSPACE_MARKETPLACE_ITEM_LIMIT);

  return rows.map((row) =>
    workspaceMarketplaceItemSchema.parse({
      id: row.id,
      title: row.title,
      summary: row.summary,
      payload: row.payload,
      createdByUserId: row.createdByUserId,
      createdByName: row.createdByName,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }),
  );
}

export async function saveWorkspaceMarketplaceItem(
  userId: string,
  userName: string,
  input: WorkspaceMarketplaceSaveInput,
) {
  const now = new Date();
  const itemId = createWorkspaceId("market");

  await db.insert(workspaceMarketplaceItem).values({
    id: itemId,
    title: input.title.trim(),
    summary: input.summary?.trim() ?? "",
    kind: input.payload.kind,
    payload: input.payload,
    createdByUserId: userId,
    createdByName: userName.trim() || "Unknown",
    createdAt: now,
    updatedAt: now,
  });

  return workspaceMarketplaceItemSchema.parse({
    id: itemId,
    title: input.title.trim(),
    summary: input.summary?.trim() ?? "",
    payload: input.payload,
    createdByUserId: userId,
    createdByName: userName.trim() || "Unknown",
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
  });
}
