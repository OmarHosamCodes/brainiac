import { db } from "@orch/db";
import { dashboardComposerDraft, dashboardConversation } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

import type { AgentTextAttachment } from "@orch/agent/types";

import {
  composerDraftKey,
  composerDraftRecordSchema,
  isComposerDraftUniqueViolation,
  normalizeComposerDraftText,
} from "./composer-draft";

type DraftInput = { conversationId?: string };

function conversationFilter(userId: string, conversationId: string | undefined) {
  const key = composerDraftKey(conversationId);
  if (!key) {
    return and(
      eq(dashboardComposerDraft.userId, userId),
      isNull(dashboardComposerDraft.conversationId),
    );
  }
  return and(
    eq(dashboardComposerDraft.userId, userId),
    eq(dashboardComposerDraft.conversationId, key),
  );
}

async function assertConversationOwnership(actorUserId: string, conversationId: string | undefined) {
  const key = composerDraftKey(conversationId);
  if (!key) return;

  const [conversation] = await db
    .select()
    .from(dashboardConversation)
    .where(
      and(
        eq(dashboardConversation.id, key),
        eq(dashboardConversation.userId, actorUserId),
        isNull(dashboardConversation.archivedAt),
      ),
    )
    .limit(1);

  if (!conversation) {
    throw new ORPCError("NOT_FOUND", {
      message: "Conversation not found.",
    });
  }
}

export async function getComposerDraft(actorUserId: string, input: DraftInput) {
  await assertConversationOwnership(actorUserId, input.conversationId);
  const [row] = await db
    .select()
    .from(dashboardComposerDraft)
    .where(conversationFilter(actorUserId, input.conversationId))
    .limit(1);
  if (!row) return { draft: null };
  return {
    draft: composerDraftRecordSchema.parse({
      conversationId: row.conversationId,
      text: row.text,
      attachments: row.attachments,
      savedAt: row.savedAt.toISOString(),
    }),
  };
}

export async function upsertComposerDraft(
  actorUserId: string,
  input: {
    conversationId?: string;
    text: string;
    attachments?: AgentTextAttachment[];
  },
) {
  await assertConversationOwnership(actorUserId, input.conversationId);

  const text = normalizeComposerDraftText(input.text);
  const attachments = input.attachments ?? [];
  const conversationId = composerDraftKey(input.conversationId) || null;
  const existing = await getComposerDraft(actorUserId, input);
  const savedAt = new Date();
  if (existing.draft) {
    await db
      .update(dashboardComposerDraft)
      .set({ text, attachments, savedAt })
      .where(conversationFilter(actorUserId, input.conversationId));
  } else {
    try {
      await db.insert(dashboardComposerDraft).values({
        id: createWorkspaceId("draft"),
        userId: actorUserId,
        conversationId,
        text,
        attachments,
        savedAt,
      });
    } catch (error) {
      if (!isComposerDraftUniqueViolation(error)) throw error;
      await db
        .update(dashboardComposerDraft)
        .set({ text, attachments, savedAt })
        .where(conversationFilter(actorUserId, input.conversationId));
    }
  }
  return getComposerDraft(actorUserId, input);
}

export async function discardComposerDraft(actorUserId: string, input: DraftInput) {
  await assertConversationOwnership(actorUserId, input.conversationId);
  await db
    .delete(dashboardComposerDraft)
    .where(conversationFilter(actorUserId, input.conversationId));
  return { discarded: true as const };
}
