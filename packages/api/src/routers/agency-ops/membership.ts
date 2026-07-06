import { db } from "@brainiac/db";
import { workspaceTeamMember } from "@brainiac/db/schema";
import type { WorkspaceTeamRole } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

const TEAM_ROLE_WEIGHT: Record<WorkspaceTeamRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function hasRoleAtLeast(role: WorkspaceTeamRole, required: WorkspaceTeamRole) {
  return TEAM_ROLE_WEIGHT[role] >= TEAM_ROLE_WEIGHT[required];
}

export async function requireTeamMembership(
  actorUserId: string,
  teamId: string,
  requiredRole: WorkspaceTeamRole = "viewer",
) {
  const [membership] = await db
    .select({ role: workspaceTeamMember.role })
    .from(workspaceTeamMember)
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, actorUserId)))
    .limit(1);

  if (!membership) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (!hasRoleAtLeast(membership.role, requiredRole)) {
    throw new ORPCError("UNAUTHORIZED");
  }

  return membership.role;
}
