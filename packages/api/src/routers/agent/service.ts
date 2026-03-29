import {
  DASHBOARD_CONVERSATION_HISTORY_LIMIT,
  DASHBOARD_CONVERSATION_MESSAGE_WINDOW,
  DASHBOARD_CONVERSATION_TITLE_LIMIT,
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

import {
  getWorkspaceMarketplaceItems,
  getWorkspaceSnapshot,
  saveWorkspaceNodes,
} from "../workspace/service";

function buildConversationTitle(content: string) {
  return content.trim().slice(0, DASHBOARD_CONVERSATION_TITLE_LIMIT) || "New conversation";
}

function buildMessagePreview(content: string) {
  const normalized = content.replace(/\s+/g, " ").trim();

  if (!normalized) {
    return null;
  }

  return normalized.slice(0, 280);
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

    previewMap.set(row.conversationId, buildMessagePreview(row.content));
  }

  return previewMap;
}

export async function listDashboardConversations(userId: string) {
  const conversations = await db
    .select()
    .from(dashboardConversation)
    .where(and(eq(dashboardConversation.userId, userId), isNull(dashboardConversation.archivedAt)))
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

export async function getDashboardConversation(userId: string, conversationId: string) {
  const conversation = await getConversationRecord(userId, conversationId);
  const messages = await db
    .select()
    .from(dashboardConversationMessage)
    .where(
      and(
        eq(dashboardConversationMessage.conversationId, conversationId),
        eq(dashboardConversationMessage.userId, userId),
      ),
    )
    .orderBy(asc(dashboardConversationMessage.createdAt), asc(dashboardConversationMessage.id));

  const detail = dashboardConversationDetailSchema.parse({
    ...mapConversationSummary({
      row: conversation,
      lastMessagePreview: buildMessagePreview(messages.at(-1)?.content ?? ""),
    }),
    messages: messages.map(mapConversationMessage),
  });

  return detail;
}

export async function createDashboardConversation(
  userId: string,
  initialSettings: Pick<AgentChatTurnInput, "content" | "model" | "toolPreset">,
) {
  const now = new Date();
  const conversationId = createWorkspaceId("conversation");

  await db.insert(dashboardConversation).values({
    id: conversationId,
    userId,
    title: buildConversationTitle(initialSettings.content),
    model: initialSettings.model?.trim() || null,
    toolPreset: initialSettings.toolPreset,
    usageSummary: normalizeConversationUsageSummary(null),
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    archivedAt: null,
  });

  return getConversationRecord(userId, conversationId);
}

export async function renameDashboardConversation(
  userId: string,
  conversationId: string,
  title: string,
) {
  await getConversationRecord(userId, conversationId);
  const now = new Date();

  await db
    .update(dashboardConversation)
    .set({
      title: title.trim().slice(0, DASHBOARD_CONVERSATION_TITLE_LIMIT),
      updatedAt: now,
    })
    .where(
      and(eq(dashboardConversation.id, conversationId), eq(dashboardConversation.userId, userId)),
    );

  return getDashboardConversation(userId, conversationId);
}

export async function deleteDashboardConversation(userId: string, conversationId: string) {
  await getConversationRecord(userId, conversationId);

  await db
    .delete(dashboardConversation)
    .where(
      and(eq(dashboardConversation.id, conversationId), eq(dashboardConversation.userId, userId)),
    );

  return {
    deleted: true,
    conversationId,
  };
}

export async function appendDashboardConversationTurn(
  userId: string,
  userName: string,
  input: AgentChatTurnInput,
) {
  const now = new Date();
  const [fullWorkspaceSnapshot, marketplaceItems] = await Promise.all([
    input.nodes
      ? Promise.resolve({
          nodes: input.nodes,
          updatedAt: null,
        })
      : getWorkspaceSnapshot(userId),
    getWorkspaceMarketplaceItems(),
  ]);

  const conversation = input.conversationId
    ? await getConversationRecord(userId, input.conversationId)
    : await createDashboardConversation(userId, {
        content: input.content,
        model: input.model,
        toolPreset: input.toolPreset,
      });
  const createdConversation = !input.conversationId;

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
  const scopeNodes = input.scopeNodes ?? input.nodes;

  const result = await runDashboardAgent(
    [
      ...recentMessages,
      {
        role: "user",
        content: input.content,
      },
    ],
    {
      nodes: fullWorkspaceSnapshot.nodes,
      scopeNodes,
      marketplaceItems,
      updatedAt: fullWorkspaceSnapshot.updatedAt,
      userName,
    },
    {
      model: input.model,
      toolPreset: input.toolPreset,
    },
  );
  const nextUsageSummary = buildNextConversationUsageSummary(
    conversation.usageSummary,
    result.usage,
  );
  const workspaceSnapshot = result.workspaceSnapshot
    ? {
        nodes: result.workspaceSnapshot.nodes,
        updatedAt: (await saveWorkspaceNodes(userId, result.workspaceSnapshot.nodes)).updatedAt,
      }
    : null;

  const userMessageRow = {
    id: createWorkspaceId("message"),
    conversationId: conversation.id,
    userId,
    role: "user" as const,
    content: input.content,
    contextNodeTitles: input.contextNodeTitles ?? [],
    model: input.model?.trim() || null,
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
      model: input.model?.trim() || null,
      toolPreset: input.toolPreset,
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
      model: input.model?.trim() || null,
      toolPreset: input.toolPreset,
      usageSummary: nextUsageSummary,
      updatedAt: assistantCreatedAt,
      lastMessageAt: assistantCreatedAt,
    },
    lastMessagePreview: buildMessagePreview(result.response),
  });

  return agentChatTurnResponseSchema.parse({
    conversation: conversationSummary,
    userMessage: mapConversationMessage(userMessageRow),
    assistantMessage: mapConversationMessage(assistantMessageRow),
    createdConversation,
    workspaceSnapshot,
  });
}
