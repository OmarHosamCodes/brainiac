import { createContext, type Context } from "@brainiac/api/context";
import {
  createTaskAttachmentUploadToken,
  getTaskAttachmentReadUrl,
  uploadTaskAttachmentBuffer,
} from "@brainiac/api/storage";
import { db } from "@brainiac/db";
import { agencyOpsProjectTask, workspaceTeamMember } from "@brainiac/db/schema";
import { createWorkspaceId } from "@brainiac/workspace";
import { and, eq } from "drizzle-orm";
import type { Hono } from "hono";

async function requireAuthTeamAccess(context: Context, teamId: string) {
  const userId = context.session?.user?.id;
  if (!userId) {
    return null;
  }

  const [membership] = await db
    .select({ role: workspaceTeamMember.role })
    .from(workspaceTeamMember)
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, userId)))
    .limit(1);

  return membership ? userId : null;
}

async function resolveTaskProjectId(teamId: string, taskId: string) {
  const [task] = await db
    .select({ projectId: agencyOpsProjectTask.projectId })
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);

  return task?.projectId ?? null;
}

export function registerTaskAttachmentUploadRoute(app: Hono) {
  app.post("/uploads/task-attachments", async (c) => {
    const requestContext = await createContext({ context: c });
    const userId = requestContext.session?.user?.id;

    if (!userId) {
      return c.json({ error: "Unauthorized" }, 401);
    }

    const formData = await c.req.formData();
    const teamId = formData.get("teamId");
    const taskId = formData.get("taskId");
    const file = formData.get("file");

    if (typeof teamId !== "string" || !teamId) {
      return c.json({ error: "teamId is required" }, 400);
    }

    if (!(file instanceof File)) {
      return c.json({ error: "file is required" }, 400);
    }

    if (typeof taskId !== "string" || !taskId) {
      return c.json({ error: "taskId is required" }, 400);
    }

    const memberUserId = await requireAuthTeamAccess(requestContext, teamId);
    if (!memberUserId) {
      return c.json({ error: "Forbidden" }, 403);
    }

    const projectId = await resolveTaskProjectId(teamId, taskId);
    if (!projectId) {
      return c.json({ error: "Task not found" }, 404);
    }

    const extension = file.name.split(".").pop() ?? "";
    const storageKey = `task-attachments/${teamId}/${taskId}/${createWorkspaceId("upload")}${extension ? `.${extension}` : ""}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await uploadTaskAttachmentBuffer({
      storageKey,
      buffer,
      mimeType: file.type || "application/octet-stream",
    });

    return c.json(
      {
        storageKey,
        publicUrl: await getTaskAttachmentReadUrl(storageKey),
        uploadToken: createTaskAttachmentUploadToken({
          teamId,
          taskId,
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          storageKey,
          sizeBytes: arrayBuffer.byteLength,
        }),
        fileName: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeBytes: arrayBuffer.byteLength,
        taskId,
        projectId,
      },
      201,
    );
  });
}
