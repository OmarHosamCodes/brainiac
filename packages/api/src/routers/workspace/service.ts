import { db } from "@brainiac/db";
import { dashboardWorkspace, workspaceMarketplaceItem } from "@brainiac/db/schema";
import {
  WORKSPACE_MARKETPLACE_ITEM_LIMIT,
  createWorkspaceId,
  workspaceMarketplaceItemSchema,
  type WorkspaceMarketplaceItem,
  type WorkspaceMarketplaceSaveInput,
  type WorkspaceNode,
} from "@brainiac/workspace";
import { desc, eq } from "drizzle-orm";

export async function getWorkspaceSnapshot(userId: string) {
  const [workspace] = await db
    .select({
      nodes: dashboardWorkspace.nodes,
      updatedAt: dashboardWorkspace.updatedAt,
    })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  return {
    nodes: workspace?.nodes ?? [],
    updatedAt: workspace?.updatedAt?.toISOString() ?? null,
  };
}

export async function saveWorkspaceNodes(userId: string, nodes: WorkspaceNode[]) {
  const now = new Date();

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

  return {
    nodeCount: nodes.length,
    savedAt: now.toISOString(),
    updatedAt: now.toISOString(),
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
