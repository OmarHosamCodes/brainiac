import { db } from "@orch/db";
import {
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  workspaceTeamMember,
} from "@orch/db/schema";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

export async function getProjectByIdForTeam(
  teamId: string,
  projectId: string,
  options?: { includeDeleted?: boolean },
) {
  const [project] = await db
    .select({
      id: agencyOpsProject.id,
      name: agencyOpsProject.name,
      clientId: agencyOpsProject.clientId,
      deletedAt: agencyOpsProject.deletedAt,
    })
    .from(agencyOpsProject)
    .where(and(eq(agencyOpsProject.id, projectId), eq(agencyOpsProject.teamId, teamId)))
    .limit(1);

  if (!project) {
    throw new ORPCError("NOT_FOUND", {
      message: "Project was not found.",
    });
  }

  if (!options?.includeDeleted && project.deletedAt) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Project is in trash. Restore it first.",
    });
  }

  return {
    id: project.id,
    name: project.name,
    clientId: project.clientId,
    deletedAt: project.deletedAt,
  };
}

export async function getClientByIdForTeam(teamId: string, clientId: string) {
  const [client] = await db
    .select({
      id: agencyOpsClient.id,
    })
    .from(agencyOpsClient)
    .where(and(eq(agencyOpsClient.id, clientId), eq(agencyOpsClient.teamId, teamId)))
    .limit(1);

  if (!client) {
    throw new ORPCError("NOT_FOUND", {
      message: "Client was not found.",
    });
  }
}

export async function requireTeamMember(teamId: string, userId: string) {
  const [membership] = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, userId)))
    .limit(1);

  if (!membership) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Selected user is not a member of this team.",
    });
  }
}

export async function getProjectTaskByIdForTeam(teamId: string, taskId: string) {
  const [task] = await db
    .select({
      id: agencyOpsProjectTask.id,
      title: agencyOpsProjectTask.title,
      projectId: agencyOpsProjectTask.projectId,
      status: agencyOpsProjectTask.status,
    })
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);

  if (!task) {
    throw new ORPCError("NOT_FOUND", { message: "Task was not found." });
  }
  return task;
}
