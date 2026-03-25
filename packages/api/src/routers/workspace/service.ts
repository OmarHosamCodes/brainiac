import { db } from "@brainiac/db";
import { dashboardWorkspace } from "@brainiac/db/schema";
import type { WorkspaceNode } from "@brainiac/workspace";
import { eq } from "drizzle-orm";

export async function getWorkspaceNodes(userId: string): Promise<WorkspaceNode[]> {
  const [workspace] = await db
    .select({
      nodes: dashboardWorkspace.nodes,
    })
    .from(dashboardWorkspace)
    .where(eq(dashboardWorkspace.userId, userId))
    .limit(1);

  return workspace?.nodes ?? [];
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
  };
}
