import {
  DASHBOARD_CONVERSATION_HISTORY_LIMIT,
  DASHBOARD_CONVERSATION_MESSAGE_WINDOW,
  agentChatTurnResponseSchema,
  dashboardConversationDetailSchema,
  dashboardConversationListResponseSchema,
  dashboardConversationMessageSchema,
  dashboardConversationSummarySchema,
  dashboardConversationUsageSummarySchema,
  normalizeDashboardAgentToolPreset,
  runDashboardAgent,
  type AgentChatTurnInput,
  type DashboardConversationSummary,
  type DashboardConversationUsageLatest,
  type DashboardConversationUsageSummary,
} from "@brainiac/agent";
import { db } from "@brainiac/db";
import {
  dashboardConversation,
  dashboardConversationMessage,
  type DashboardConversationMessageContextNodeTitlesRecord,
  type DashboardConversationMessageToolsCalledRecord,
  type DashboardConversationUsageSummaryRecord,
} from "@brainiac/db/schema";
import { createWorkspaceId } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { getBillingStateForUser } from "../../billing-guard";
import {
  getWorkspaceMarketplaceItems,
  getWorkspaceSnapshot,
  saveWorkspaceNodes,
} from "../workspace/service";
import {
  buildDashboardConversationDeletionResult,
  buildDashboardConversationTitle,
  buildDashboardMessagePreview,
  normalizeDashboardConversationTitle,
} from "./conversation-contracts";

export async function assertCanCreateDashboardConversation(
  actorUserId: string,
  _input: Record<string, never>,
) {
  const billing = await getBillingStateForUser(actorUserId);

  if (billing.limits.aiConversations === -1) return;

  const existing = await listDashboardConversations(actorUserId, {});
  if (existing.conversations.length >= billing.limits.aiConversations) {
    throw new ORPCError("FORBIDDEN", {
      message: `Your ${billing.tier} plan allows up to ${billing.limits.aiConversations} AI conversations`,
      data: {
        limit: billing.limits.aiConversations,
        current: existing.conversations.length,
      },
    });
  }
}

function normalizeConversationUsageSummary(
  usageSummary: DashboardConversationUsageSummaryRecord | null | undefined,
) {
  return dashboardConversationUsageSummarySchema.parse(
    usageSummary ?? {
      latest: null,
      totals: {
        inputTokens: 0,
        cachedTokens: 0,
        outputTokens: 0,
        reasoningTokens: 0,
        totalTokens: 0,
        costUsd: 0,
      },
    },
  );
}

function buildNextConversationUsageSummary(
  currentUsageSummary: DashboardConversationUsageSummaryRecord | null | undefined,
  latestUsage: DashboardConversationUsageLatest | null,
): DashboardConversationUsageSummary {
  const current = normalizeConversationUsageSummary(currentUsageSummary);

  if (!latestUsage) {
    return current;
  }

  return dashboardConversationUsageSummarySchema.parse({
    latest: latestUsage,
    totals: {
      inputTokens: current.totals.inputTokens + latestUsage.inputTokens,
      cachedTokens: current.totals.cachedTokens + latestUsage.cachedTokens,
      outputTokens: current.totals.outputTokens + latestUsage.outputTokens,
      reasoningTokens: current.totals.reasoningTokens + latestUsage.reasoningTokens,
      totalTokens: current.totals.totalTokens + latestUsage.totalTokens,
      costUsd: current.totals.costUsd + (latestUsage.costUsd ?? 0),
    },
  });
}

function mapConversationSummary(args: {
  row: typeof dashboardConversation.$inferSelect;
  lastMessagePreview: string | null;
}): DashboardConversationSummary {
  return dashboardConversationSummarySchema.parse({
    id: args.row.id,
    title: args.row.title,
    model: args.row.model,
    toolPreset: normalizeDashboardAgentToolPreset(args.row.toolPreset),
    usageSummary: normalizeConversationUsageSummary(
      args.row.usageSummary as DashboardConversationUsageSummaryRecord | null,
    ),
    createdAt: args.row.createdAt.toISOString(),
    updatedAt: args.row.updatedAt.toISOString(),
    lastMessageAt: args.row.lastMessageAt.toISOString(),
    lastMessagePreview: args.lastMessagePreview,
  });
}

function mapConversationMessage(row: typeof dashboardConversationMessage.$inferSelect) {
  return dashboardConversationMessageSchema.parse({
    id: row.id,
    role: row.role,
    content: row.content,
    contextNodeTitles:
      (row.contextNodeTitles as DashboardConversationMessageContextNodeTitlesRecord | null) ?? [],
    model: row.model,
    toolsCalled: (row.toolsCalled as DashboardConversationMessageToolsCalledRecord | null) ?? [],
    createdAt: row.createdAt.toISOString(),
  });
}

async function getConversationRecord(userId: string, conversationId: string) {
  const [conversation] = await db
    .select()
    .from(dashboardConversation)
    .where(
      and(
        eq(dashboardConversation.id, conversationId),
        eq(dashboardConversation.userId, userId),
        isNull(dashboardConversation.archivedAt),
      ),
    )
    .limit(1);

  if (!conversation) {
    throw new ORPCError("NOT_FOUND", {
      message: "Conversation not found.",
    });
  }

  return conversation;
}

async function getConversationPreviewMap(conversationIds: string[]) {
  if (conversationIds.length === 0) {
    return new Map<string, string | null>();
  }

  const rows = await db
    .select({
      conversationId: dashboardConversationMessage.conversationId,
      content: dashboardConversationMessage.content,
      createdAt: dashboardConversationMessage.createdAt,
    })
    .from(dashboardConversationMessage)
    .where(inArray(dashboardConversationMessage.conversationId, conversationIds))
    .orderBy(desc(dashboardConversationMessage.createdAt), desc(dashboardConversationMessage.id));

  const previewMap = new Map<string, string | null>();

  for (const row of rows) {
    if (previewMap.has(row.conversationId)) {
      continue;
    }

    previewMap.set(row.conversationId, buildDashboardMessagePreview(row.content));
  }

  return previewMap;
}

export async function listDashboardConversations(
  actorUserId: string,
  _input: Record<string, never>,
) {
  const conversations = await db
    .select()
    .from(dashboardConversation)
    .where(
      and(eq(dashboardConversation.userId, actorUserId), isNull(dashboardConversation.archivedAt)),
    )
    .orderBy(desc(dashboardConversation.updatedAt), desc(dashboardConversation.id))
    .limit(DASHBOARD_CONVERSATION_HISTORY_LIMIT);

  const previewMap = await getConversationPreviewMap(conversations.map((item) => item.id));

  return dashboardConversationListResponseSchema.parse({
    conversations: conversations.map((conversation) =>
      mapConversationSummary({
        row: conversation,
        lastMessagePreview: previewMap.get(conversation.id) ?? null,
      }),
    ),
  });
}

export async function getDashboardConversation(
  actorUserId: string,
  input: { conversationId: string },
) {
  const conversation = await getConversationRecord(actorUserId, input.conversationId);
  const messages = await db
    .select()
    .from(dashboardConversationMessage)
    .where(
      and(
        eq(dashboardConversationMessage.conversationId, input.conversationId),
        eq(dashboardConversationMessage.userId, actorUserId),
      ),
    )
    .orderBy(asc(dashboardConversationMessage.createdAt), asc(dashboardConversationMessage.id));

  const detail = dashboardConversationDetailSchema.parse({
    ...mapConversationSummary({
      row: conversation,
      lastMessagePreview: buildDashboardMessagePreview(messages.at(-1)?.content ?? ""),
    }),
    messages: messages.map(mapConversationMessage),
  });

  return detail;
}

export async function createDashboardConversation(
  actorUserId: string,
  input: Pick<AgentChatTurnInput, "content" | "model" | "toolPreset">,
) {
  const now = new Date();
  const conversationId = createWorkspaceId("conversation");

  await db.insert(dashboardConversation).values({
    id: conversationId,
    userId: actorUserId,
    title: buildDashboardConversationTitle(input.content),
    model: input.model?.trim() || null,
    toolPreset: input.toolPreset,
    usageSummary: normalizeConversationUsageSummary(null),
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    archivedAt: null,
  });

  return getConversationRecord(actorUserId, conversationId);
}

export async function renameDashboardConversation(
  actorUserId: string,
  input: { conversationId: string; title: string },
) {
  await getConversationRecord(actorUserId, input.conversationId);
  const now = new Date();

  await db
    .update(dashboardConversation)
    .set({
      title: normalizeDashboardConversationTitle(input.title),
      updatedAt: now,
    })
    .where(
      and(
        eq(dashboardConversation.id, input.conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    );

  return getDashboardConversation(actorUserId, { conversationId: input.conversationId });
}

export async function deleteDashboardConversation(
  actorUserId: string,
  input: { conversationId: string },
) {
  await getConversationRecord(actorUserId, input.conversationId);

  await db
    .delete(dashboardConversation)
    .where(
      and(
        eq(dashboardConversation.id, input.conversationId),
        eq(dashboardConversation.userId, actorUserId),
      ),
    );

  return buildDashboardConversationDeletionResult(input.conversationId);
}

export async function appendDashboardConversationTurn(
  actorUserId: string,
  input: { actorUserName: string; turn: AgentChatTurnInput },
) {
  const userId = actorUserId;
  const { actorUserName: userName, turn } = input;
  const now = new Date();
  const [fullWorkspaceSnapshot, marketplaceResult] = await Promise.all([
    turn.nodes
      ? Promise.resolve({
          nodes: turn.nodes,
          updatedAt: null,
        })
      : getWorkspaceSnapshot(userId, {}),
    getWorkspaceMarketplaceItems(userId, { limit: 200, kind: "all" }),
  ]);

  const conversation = turn.conversationId
    ? await getConversationRecord(userId, turn.conversationId)
    : await createDashboardConversation(userId, {
        content: turn.content,
        model: turn.model,
        toolPreset: turn.toolPreset,
      });
  const createdConversation = !turn.conversationId;

  const recentMessagesDesc = await db
    .select()
    .from(dashboardConversationMessage)
    .where(
      and(
        eq(dashboardConversationMessage.conversationId, conversation.id),
        eq(dashboardConversationMessage.userId, userId),
      ),
    )
    .orderBy(desc(dashboardConversationMessage.createdAt), desc(dashboardConversationMessage.id))
    .limit(Math.max(0, DASHBOARD_CONVERSATION_MESSAGE_WINDOW - 1));
  const recentMessages = [...recentMessagesDesc].reverse().map((message) => ({
    role: message.role as "user" | "assistant",
    content: message.content,
  }));
  const scopeNodes = turn.scopeNodes ?? turn.nodes;

  const result = await runDashboardAgent(
    [
      ...recentMessages,
      {
        role: "user",
        content: turn.content,
      },
    ],
    {
      nodes: fullWorkspaceSnapshot.nodes,
      scopeNodes,
      marketplaceItems: marketplaceResult.items,
      updatedAt: fullWorkspaceSnapshot.updatedAt,
      userName,
      activeTabId: turn.activeTabId,
    },
    {
      model: turn.model,
      toolPreset: turn.toolPreset,
    },
  );
  const nextUsageSummary = buildNextConversationUsageSummary(
    conversation.usageSummary,
    result.usage,
  );
  const workspaceSnapshot = result.workspaceSnapshot
    ? {
        nodes: result.workspaceSnapshot.nodes,
        updatedAt: (await saveWorkspaceNodes(userId, { nodes: result.workspaceSnapshot.nodes }))
          .updatedAt,
      }
    : null;

  const userMessageRow = {
    id: createWorkspaceId("message"),
    conversationId: conversation.id,
    userId,
    role: "user" as const,
    content: turn.content,
    contextNodeTitles: turn.contextNodeTitles ?? [],
    model: turn.model?.trim() || null,
    toolsCalled: [],
    createdAt: now,
  };
  const assistantCreatedAt = new Date();
  const assistantMessageRow = {
    id: createWorkspaceId("message"),
    conversationId: conversation.id,
    userId,
    role: "assistant" as const,
    content: result.response,
    contextNodeTitles: [],
    model: result.model,
    toolsCalled: result.toolsCalled,
    createdAt: assistantCreatedAt,
  };

  await db.insert(dashboardConversationMessage).values([userMessageRow, assistantMessageRow]);

  await db
    .update(dashboardConversation)
    .set({
      model: turn.model?.trim() || null,
      toolPreset: turn.toolPreset,
      usageSummary: nextUsageSummary,
      updatedAt: assistantCreatedAt,
      lastMessageAt: assistantCreatedAt,
    })
    .where(
      and(eq(dashboardConversation.id, conversation.id), eq(dashboardConversation.userId, userId)),
    );

  const conversationSummary = mapConversationSummary({
    row: {
      ...conversation,
      model: turn.model?.trim() || null,
      toolPreset: turn.toolPreset,
      usageSummary: nextUsageSummary,
      updatedAt: assistantCreatedAt,
      lastMessageAt: assistantCreatedAt,
    },
    lastMessagePreview: buildDashboardMessagePreview(result.response),
  });

  return agentChatTurnResponseSchema.parse({
    conversation: conversationSummary,
    userMessage: mapConversationMessage(userMessageRow),
    assistantMessage: mapConversationMessage(assistantMessageRow),
    createdConversation,
    workspaceSnapshot,
  });
}
