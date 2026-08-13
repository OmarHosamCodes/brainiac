import { z } from "zod";

import { agentTextAttachmentSchema } from "@orch/agent/types";

export const COMPOSER_DRAFT_TEXT_MAX = 20_000;

export function normalizeComposerDraftText(value: string) {
  return value.trim().slice(0, COMPOSER_DRAFT_TEXT_MAX);
}

export function composerDraftKey(conversationId: string | null | undefined) {
  return conversationId?.trim() || "";
}

export const composerDraftConversationInputSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
});

export const composerDraftUpsertInputSchema = composerDraftConversationInputSchema.extend({
  text: z.string().max(COMPOSER_DRAFT_TEXT_MAX),
  attachments: z.array(agentTextAttachmentSchema).max(6).default([]),
});

export const composerDraftRecordSchema = z.object({
  conversationId: z.string().nullable(),
  text: z.string(),
  attachments: z.array(agentTextAttachmentSchema),
  savedAt: z.string().datetime(),
});
