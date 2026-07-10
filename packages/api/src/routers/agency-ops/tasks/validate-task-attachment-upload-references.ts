import { ORPCError } from "@orpc/server";

import { verifyTaskAttachmentUploadToken } from "../../../storage";

export function validateTaskAttachmentUploadReferences(input: {
  teamId: string;
  taskId: string;
  attachments?: Array<{
    fileName: string;
    mimeType: string;
    storageKey: string;
    sizeBytes: number;
    uploadToken: string;
  }>;
}) {
  for (const attachment of input.attachments ?? []) {
    const linkPrefix = `task-links/${input.teamId}/${input.taskId}/`;
    if (attachment.storageKey.startsWith(linkPrefix)) {
      if (
        attachment.mimeType !== "text/uri-list" ||
        attachment.sizeBytes !== 0 ||
        !verifyTaskAttachmentUploadToken(attachment.uploadToken, {
          teamId: input.teamId,
          taskId: input.taskId,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          storageKey: attachment.storageKey,
          sizeBytes: attachment.sizeBytes,
        })
      ) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Link attachment reference is invalid or expired.",
        });
      }
      continue;
    }

    const expectedPrefix = `task-attachments/${input.teamId}/${input.taskId}/`;
    if (
      !attachment.storageKey.startsWith(expectedPrefix) ||
      !verifyTaskAttachmentUploadToken(attachment.uploadToken, {
        teamId: input.teamId,
        taskId: input.taskId,
        fileName: attachment.fileName,
        mimeType: attachment.mimeType,
        storageKey: attachment.storageKey,
        sizeBytes: attachment.sizeBytes,
      })
    ) {
      throw new ORPCError("BAD_REQUEST", {
        message: "Attachment upload reference is invalid or expired.",
      });
    }
  }
}
