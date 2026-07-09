import { runTaskAgent } from "@brainiac/agent";
import { db } from "@brainiac/db";
import {
  agencyOpsClient,
  agencyOpsProject,
  agencyOpsProjectTask,
  agencyOpsProjectTaskAssignee,
  agencyOpsTaskAttachment,
  agencyOpsTaskMessage,
  agencyOpsTaskThread,
  user,
} from "@brainiac/db/schema";
import { formatTaskAssigneeLabel } from "../../../schemas/agency-ops";
import type { AttachmentMetadata } from "@brainiac/db/schema/agency-ops";
import { createWorkspaceId } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  ensureTaskThreadByTaskId,
  getTaskThreadMessageById,
  validateTaskAttachmentUploadReferences,
} from "./service";
import { requireTeamMembership } from "../shared/membership";
import { liveUpdatedAt, publishAgencyLiveEvent } from "../live/live";

function formatAttachmentSummary(
  attachments: Array<{
    fileName: string;
    mimeType: string;
    sizeBytes: number;
    metadata: AttachmentMetadata | null;
  }>,
): string {
  if (attachments.length === 0) return "";
  const lines = attachments.map((a) => {
    const parts: string[] = [a.fileName];
    const meta = a.metadata;
    if (meta?.mediaKind === "link" && meta.sourceUrl) {
      parts.push(`(${meta.sourceUrl})`);
      return `  - ${parts.join(" ")}`;
    }
    if (meta?.mediaKind) {
      parts.push(`(${meta.mediaKind}`);
      if (meta.imageWidth && meta.imageHeight) {
        parts.push(`${meta.imageWidth}×${meta.imageHeight}`);
      } else if (meta.videoWidth && meta.videoHeight) {
        parts.push(`${meta.videoWidth}×${meta.videoHeight}`);
      }
      if (meta.durationSeconds) {
        const min = Math.floor(meta.durationSeconds / 60);
        const sec = Math.floor(meta.durationSeconds % 60);
        parts.push(`${min}:${sec.toString().padStart(2, "0")}`);
      }
      parts.push(`${(a.sizeBytes / 1024).toFixed(0)}KB`);
      parts.push(")");
    } else {
      parts.push(`(${(a.sizeBytes / 1024).toFixed(0)}KB)`);
    }
    return `  - ${parts.join(" ")}`;
  });
  return `Attachments:\n${lines.join("\n")}`;
}

export async function askTaskAgent(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    content: string;
    model?: string;
    attachments?: Array<{
      fileName: string;
      mimeType: string;
      storageKey: string;
      sizeBytes: number;
      durationSeconds?: number | null;
      uploadToken: string;
      metadata?: AttachmentMetadata | null;
    }>;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  validateTaskAttachmentUploadReferences(input);

  const [context] = await db
    .select({
      taskTitle: agencyOpsProjectTask.title,
      taskStatus: agencyOpsProjectTask.status,
      projectName: agencyOpsProject.name,
      clientName: agencyOpsClient.name,
      assignedToTeam: agencyOpsProjectTask.assignedToTeam,
    })
    .from(agencyOpsProjectTask)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(
      and(eq(agencyOpsProjectTask.id, input.taskId), eq(agencyOpsProjectTask.teamId, input.teamId)),
    )
    .limit(1);

  if (!context) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  const assigneeRows = await db
    .select({
      userId: agencyOpsProjectTaskAssignee.userId,
      userName: user.name,
    })
    .from(agencyOpsProjectTaskAssignee)
    .innerJoin(user, eq(user.id, agencyOpsProjectTaskAssignee.userId))
    .where(eq(agencyOpsProjectTaskAssignee.taskId, input.taskId));

  const assigneeName = formatTaskAssigneeLabel({
    assignedToTeam: context.assignedToTeam,
    assignees: assigneeRows.map((row) => ({
      userName: row.userName ?? "Unknown",
    })),
  });

  const thread = await ensureTaskThreadByTaskId(input.teamId, input.taskId);

  // ------------------------------------------------------------------
  // Build recent messages with attachment summaries for the agent
  // ------------------------------------------------------------------
  const messageRows = await db
    .select({
      id: agencyOpsTaskMessage.id,
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

  const messageIds = messageRows.map((r) => r.id);

  let attachmentMap = new Map<
    string,
    Array<{
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      metadata: AttachmentMetadata | null;
    }>
  >();
  if (messageIds.length > 0) {
    const attachmentRows = await db
      .select({
        messageId: agencyOpsTaskAttachment.messageId,
        fileName: agencyOpsTaskAttachment.fileName,
        mimeType: agencyOpsTaskAttachment.mimeType,
        sizeBytes: agencyOpsTaskAttachment.sizeBytes,
        metadata: agencyOpsTaskAttachment.metadata,
      })
      .from(agencyOpsTaskAttachment)
      .where(
        and(
          inArray(agencyOpsTaskAttachment.messageId, messageIds),
          isNull(agencyOpsTaskAttachment.deletedAt),
        ),
      );

    for (const a of attachmentRows) {
      const existing = attachmentMap.get(a.messageId) ?? [];
      existing.push({
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        metadata: a.metadata as AttachmentMetadata | null,
      });
      attachmentMap.set(a.messageId, existing);
    }
  }

  const recentMessages: Array<{ role: "user" | "assistant"; content: string }> = messageRows
    .map((row) => {
      const attachments = attachmentMap.get(row.id) ?? [];
      let content: string;
      if (row.type === "text") {
        content = row.content;
      } else if (row.type === "voice") {
        content = "[voice message]";
      } else {
        const summary = formatAttachmentSummary(attachments);
        content = row.content ? `${row.content}\n${summary}` : summary || "[attachment]";
      }
      return {
        role: (row.senderType === "agent" ? "assistant" : "user") as "user" | "assistant",
        content,
      };
    })
    .reverse();

  // Build user message content — include attachment summary if present
  let userContent = input.content.trim();
  if (input.attachments && input.attachments.length > 0) {
    const summary = formatAttachmentSummary(
      input.attachments.map((a) => ({
        fileName: a.fileName,
        mimeType: a.mimeType,
        sizeBytes: a.sizeBytes,
        metadata: a.metadata ?? null,
      })),
    );
    userContent = userContent ? `${userContent}\n${summary}` : summary;
  }

  const result = await runTaskAgent(
    [{ role: "user", content: userContent }],
    {
      taskTitle: context.taskTitle,
      taskStatus: context.taskStatus,
      projectName: context.projectName,
      clientName: context.clientName,
      assigneeName: assigneeName === "Unassigned" ? null : assigneeName,
      recentMessages,
    },
    { model: input.model },
  );

  // ------------------------------------------------------------------
  // Persist user message + agent response
  // ------------------------------------------------------------------
  const now = new Date();
  const userMessageId = createWorkspaceId("agency-task-message");
  const agentMessageId = createWorkspaceId("agency-task-message");

  await db.transaction(async (tx) => {
    await tx.insert(agencyOpsTaskMessage).values([
      {
        id: userMessageId,
        teamId: input.teamId,
        threadId: thread.id,
        userId: actorUserId,
        content: input.content.trim(),
        type: input.attachments && input.attachments.length > 0 ? "attachment" : "text",
        senderType: "user",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: agentMessageId,
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

    if (input.attachments && input.attachments.length > 0) {
      await tx.insert(agencyOpsTaskAttachment).values(
        input.attachments.map((a) => ({
          id: createWorkspaceId("agency-task-attachment"),
          teamId: input.teamId,
          messageId: userMessageId,
          fileName: a.fileName,
          mimeType: a.mimeType,
          storageKey: a.storageKey,
          sizeBytes: a.sizeBytes,
          durationSeconds: a.durationSeconds ?? null,
          metadata: a.metadata ?? null,
          createdAt: now,
        })),
      );
    }

    await tx
      .update(agencyOpsTaskThread)
      .set({ updatedAt: now })
      .where(eq(agencyOpsTaskThread.id, thread.id));
  });

  const [userMessage, agentMessage] = await Promise.all([
    getTaskThreadMessageById(actorUserId, { teamId: input.teamId, messageId: userMessageId }),
    getTaskThreadMessageById(actorUserId, { teamId: input.teamId, messageId: agentMessageId }),
  ]);

  await Promise.all([
    publishAgencyLiveEvent(input.teamId, {
      type: "taskMessage.created",
      teamId: input.teamId,
      taskId: input.taskId,
      updatedAt: liveUpdatedAt(userMessage.updatedAt),
      message: userMessage,
    }),
    publishAgencyLiveEvent(input.teamId, {
      type: "taskMessage.created",
      teamId: input.teamId,
      taskId: input.taskId,
      updatedAt: liveUpdatedAt(agentMessage.updatedAt),
      message: agentMessage,
    }),
  ]);

  return {
    userMessage,
    agentMessage,
    model: result.model,
    response: result.response,
  };
}
