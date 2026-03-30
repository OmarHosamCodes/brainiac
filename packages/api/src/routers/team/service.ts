import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import { createWorkspaceId, type WorkspaceTeamRole } from "@brainiac/workspace";
import { db } from "@brainiac/db";
import { user, workspaceTeam, workspaceTeamMember } from "@brainiac/db/schema";

const TEAM_ROLE_WEIGHT: Record<WorkspaceTeamRole, number> = {
  viewer: 1,
  editor: 2,
  owner: 3,
};

function assertRoleAtLeast(role: WorkspaceTeamRole, required: WorkspaceTeamRole) {
  if (TEAM_ROLE_WEIGHT[role] < TEAM_ROLE_WEIGHT[required]) {
    throw new ORPCError("UNAUTHORIZED");
  }
}

export async function listUserTeams(userId: string) {
  const memberships = await db
    .select({
      teamId: workspaceTeamMember.teamId,
      role: workspaceTeamMember.role,
      teamName: workspaceTeam.name,
      createdByUserId: workspaceTeam.createdByUserId,
      updatedAt: workspaceTeam.updatedAt,
    })
    .from(workspaceTeamMember)
    .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamMember.teamId))
    .where(eq(workspaceTeamMember.userId, userId));

  return memberships.map((membership) => ({
    id: membership.teamId,
    name: membership.teamName,
    role: membership.role,
    createdByUserId: membership.createdByUserId,
    updatedAt: membership.updatedAt.toISOString(),
  }));
}

export async function createTeam(userId: string, name: string) {
  const now = new Date();
  const teamId = createWorkspaceId("team");

  await db.transaction(async (tx) => {
    await tx.insert(workspaceTeam).values({
      id: teamId,
      name,
      createdByUserId: userId,
      createdAt: now,
      updatedAt: now,
    });

    await tx.insert(workspaceTeamMember).values({
      id: createWorkspaceId("team-member"),
      teamId,
      userId,
      role: "owner",
      createdAt: now,
      updatedAt: now,
    });
  });

  return {
    id: teamId,
    name,
    role: "owner" as const,
    createdByUserId: userId,
    updatedAt: now.toISOString(),
  };
}

export async function addTeamMember(
  actorUserId: string,
  input: {
    teamId: string;
    userEmail: string;
    role: WorkspaceTeamRole;
  },
) {
  const [actorMembership] = await db
    .select({ role: workspaceTeamMember.role })
    .from(workspaceTeamMember)
    .where(
      and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.userId, actorUserId)),
    )
    .limit(1);

  if (!actorMembership) {
    throw new ORPCError("UNAUTHORIZED");
  }

  assertRoleAtLeast(actorMembership.role, "owner");

  const [targetUser] = await db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .where(eq(user.email, input.userEmail))
    .limit(1);

  if (!targetUser) {
    throw new ORPCError("NOT_FOUND");
  }

  const now = new Date();

  await db
    .insert(workspaceTeamMember)
    .values({
      id: createWorkspaceId("team-member"),
      teamId: input.teamId,
      userId: targetUser.id,
      role: input.role,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [workspaceTeamMember.teamId, workspaceTeamMember.userId],
      set: {
        role: input.role,
        updatedAt: now,
      },
    });

  return {
    teamId: input.teamId,
    userId: targetUser.id,
    userName: targetUser.name,
    userEmail: targetUser.email,
    role: input.role,
  };
}

export async function updateTeamMemberRole(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    role: WorkspaceTeamRole;
  },
) {
  const [actorMembership] = await db
    .select({ role: workspaceTeamMember.role })
    .from(workspaceTeamMember)
    .where(
      and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.userId, actorUserId)),
    )
    .limit(1);

  if (!actorMembership) {
    throw new ORPCError("UNAUTHORIZED");
  }

  assertRoleAtLeast(actorMembership.role, "owner");

  if (input.userId === actorUserId && input.role !== "owner") {
    const ownerCountRows = await db
      .select({ id: workspaceTeamMember.id })
      .from(workspaceTeamMember)
      .where(and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.role, "owner")));

    if (ownerCountRows.length <= 1) {
      throw new ORPCError("BAD_REQUEST");
    }
  }

  const now = new Date();
  const [updated] = await db
    .update(workspaceTeamMember)
    .set({
      role: input.role,
      updatedAt: now,
    })
    .where(and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.userId, input.userId)))
    .returning({
      teamId: workspaceTeamMember.teamId,
      userId: workspaceTeamMember.userId,
      role: workspaceTeamMember.role,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  return updated;
}

export async function removeTeamMember(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
  },
) {
  const [actorMembership] = await db
    .select({ role: workspaceTeamMember.role })
    .from(workspaceTeamMember)
    .where(
      and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.userId, actorUserId)),
    )
    .limit(1);

  if (!actorMembership) {
    throw new ORPCError("UNAUTHORIZED");
  }

  assertRoleAtLeast(actorMembership.role, "owner");

  if (input.userId === actorUserId) {
    const ownerCountRows = await db
      .select({ id: workspaceTeamMember.id })
      .from(workspaceTeamMember)
      .where(and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.role, "owner")));

    if (ownerCountRows.length <= 1) {
      throw new ORPCError("BAD_REQUEST");
    }
  }

  const [removed] = await db
    .delete(workspaceTeamMember)
    .where(and(eq(workspaceTeamMember.teamId, input.teamId), eq(workspaceTeamMember.userId, input.userId)))
    .returning({
      teamId: workspaceTeamMember.teamId,
      userId: workspaceTeamMember.userId,
    });

  if (!removed) {
    throw new ORPCError("NOT_FOUND");
  }

  return {
    ...removed,
    removed: true,
  };
}
