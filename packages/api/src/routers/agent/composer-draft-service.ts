import { db } from "@orch/db";
import { dashboardComposerDraft } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { and, eq, isNull } from "drizzle-orm";

import type { AgentTextAttachment } from "@orch/agent/types";

import {
  composerDraftKey,
  composerDraftRecordSchema,
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

export async function getComposerDraft(actorUserId: string, input: DraftInput) {
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
    await db.insert(dashboardComposerDraft).values({
      id: createWorkspaceId("draft"),
      userId: actorUserId,
      conversationId,
      text,
      attachments,
      savedAt,
    });
  }
  return getComposerDraft(actorUserId, input);
}

export async function discardComposerDraft(actorUserId: string, input: DraftInput) {
  await db
    .delete(dashboardComposerDraft)
    .where(conversationFilter(actorUserId, input.conversationId));
  return { discarded: true as const };
}
