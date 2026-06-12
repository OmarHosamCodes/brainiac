import { runTaskAgent } from "@brainiac/agent";
import { db } from "@brainiac/db";
import {
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsTaskMessage,
  agencyOpsTaskThread,
  user,
} from "@brainiac/db/schema";
import { createWorkspaceId } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, isNull } from "drizzle-orm";

import { ensureTaskThreadByTaskId, requireTeamMembership } from "./service";

export async function askTaskAgent(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    content: string;
    model?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [context] = await db
    .select({
      taskTitle: agencyOpsProjectTask.title,
      taskStatus: agencyOpsProjectTask.status,
      projectName: agencyOpsProject.name,
      clientName: agencyOpsClient.name,
      assigneeName: user.name,
    })
    .from(agencyOpsProjectTask)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .leftJoin(user, eq(user.id, agencyOpsProjectTask.assigneeUserId))
    .where(
      and(eq(agencyOpsProjectTask.id, input.taskId), eq(agencyOpsProjectTask.teamId, input.teamId)),
    )
    .limit(1);

  if (!context) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  const thread = await ensureTaskThreadByTaskId(input.teamId, input.taskId);

  let recentMessages: Array<{ role: "user" | "assistant"; content: string }> = [];

  const rows = await db
    .select({
      content: agencyOpsTaskMessage.content,
      type: agencyOpsTaskMessage.type,
      senderType: agencyOpsTaskMessage.senderType,
    })
    .from(agencyOpsTaskMessage)
    .where(
      and(eq(agencyOpsTaskMessage.threadId, thread.id), isNull(agencyOpsTaskMessage.deletedAt)),
    )
    .orderBy(desc(agencyOpsTaskMessage.createdAt))
    .limit(10);

  recentMessages = rows
    .map((row) => ({
      role: (row.senderType === "agent" ? "assistant" : "user") as "user" | "assistant",
      content: row.type === "text" ? row.content : `[${row.type}]`,
    }))
    .reverse();

  const result = await runTaskAgent(
    [{ role: "user", content: input.content }],
    {
      taskTitle: context.taskTitle,
      taskStatus: context.taskStatus,
      projectName: context.projectName,
      clientName: context.clientName,
      assigneeName: context.assigneeName ?? null,
      recentMessages,
    },
    { model: input.model },
  );

  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.insert(agencyOpsTaskMessage).values([
      {
        id: createWorkspaceId("agency-task-message"),
        teamId: input.teamId,
        threadId: thread.id,
        userId: actorUserId,
        content: input.content.trim(),
        type: "text",
        senderType: "user",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: createWorkspaceId("agency-task-message"),
        teamId: input.teamId,
        threadId: thread.id,
        userId: actorUserId,
        content: result.response,
        type: "text",
        senderType: "agent",
        createdAt: now,
        updatedAt: now,
      },
    ]);
    await tx
      .update(agencyOpsTaskThread)
      .set({ updatedAt: now })
      .where(eq(agencyOpsTaskThread.id, thread.id));
  });

  return {
    response: result.response,
    model: result.model,
  };
}
