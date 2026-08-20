import { z } from "zod";

export const agencyTaskMessageAttachmentSchema = z.object({
  id: z.string(),
  fileName: z.string(),
  mimeType: z.string(),
  sizeBytes: z.number().int().nonnegative(),
  url: z.string().nullable(),
});

export const agencyTaskMessageSchema = z.object({
  id: z.string(),
  teamId: z.string(),
  taskId: z.string(),
  userId: z.string(),
  userName: z.string(),
  userAvatar: z.string().nullable(),
  content: z.string(),
  createdAt: z.string(),
  attachments: z.array(agencyTaskMessageAttachmentSchema),
  pending: z.boolean().optional(),
  /** Client-only: Orch in-thread replies (not persisted). */
  authorKind: z.enum(["user", "agent"]).optional(),
  streaming: z.boolean().optional(),
});

export const listTaskMessagesInputSchema = z.object({
  teamId: z.string().min(1),
  taskId: z.string().min(1),
  cursor: z.string().optional(),
  pageSize: z.number().int().min(1).max(100).default(50),
});

export const listTaskMessagesOutputSchema = z.object({
  items: z.array(agencyTaskMessageSchema),
  nextCursor: z.string().nullable(),
  canPost: z.boolean(),
});

export const sendTaskMessageInputSchema = z.object({
  teamId: z.string().min(1),
  taskId: z.string().min(1),
  content: z.string().max(8000),
  attachmentUploadTokens: z.array(z.string()).max(10).default([]),
});

export type AgencyTaskMessage = z.infer<typeof agencyTaskMessageSchema>;
export type ListTaskMessagesInput = z.infer<typeof listTaskMessagesInputSchema>;
export type SendTaskMessageInput = z.infer<typeof sendTaskMessageInputSchema>;
