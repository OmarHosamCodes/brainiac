import {
  DASHBOARD_CONVERSATION_HISTORY_LIMIT,
  DASHBOARD_CONVERSATION_MESSAGE_WINDOW,
  DEFAULT_AGENT_MODEL_PRESET,
  agentChatTurnResponseSchema,
  agentChatTurnStreamEventSchema,
  agentToolCatalogResponseSchema,
  buildAgentModelUserContent,
  modelContentLength,
  dashboardConversationDetailSchema,
  dashboardConversationListResponseSchema,
  dashboardConversationMessageSchema,
  dashboardConversationSummarySchema,
  dashboardConversationUsageSummarySchema,
  listAgentToolCatalog,
  normalizeDashboardAgentToolPreset,
  resolveOpenRouterModelForTurn,
  runDashboardAgent,
  streamDashboardAgent,
  titleSeedFromAgentTurn,
  type AgencyAgentRuntime,
  type AgentChatTurnInput,
  type AgentChatTurnStreamEvent,
  type AgentSurface,
  type AgentTextAttachment,
  type AgentToolCall,
  type AgentToolCatalogInput,
  type DashboardConversationSummary,
  type DashboardConversationUsageLatest,
  type DashboardConversationUsageSummary,
} from "@orch/agent";
import { db } from "@orch/db";
import {
  dashboardConversation,
  dashboardConversationMessage,
  type DashboardConversationMessageAttachmentRecord,
  type DashboardConversationMessageContextNodeTitlesRecord,
  type DashboardConversationMessageToolsCalledRecord,
  type DashboardConversationUsageSummaryRecord,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";

import { getBillingStateForUser } from "../../billing-guard";
import { listAgencyProjects } from "../agency-ops/projects/service";
import { getAgencyReportsSummary } from "../agency-ops/reports/service";
import { getAgencyTimeSummary, listMyAgencyTimeEntries } from "../agency-ops/time-tracking/service";
import { listTeamMembers } from "../team/service";
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

function attachmentsFromRow(
  value: DashboardConversationMessageAttachmentRecord[] | null | undefined,
): AgentTextAttachment[] {
  return (value ?? []) as AgentTextAttachment[];
}

function modelUserContent(content: string, attachments: AgentTextAttachment[]) {
  return buildAgentModelUserContent(content, attachments);
}

function createAgencyAgentRuntime(actorUserId: string, teamId: string): AgencyAgentRuntime {
  return {
    teamId,
    listMyTimeEntries: async ({ page, pageSize }) => {
      const result = await listMyAgencyTimeEntries(actorUserId, {
        teamId,
        page,
        pageSize,
      });
      return {
        entries: result.items.map((entry) => ({
          id: entry.id,
          description: entry.description,
          projectName: entry.projectName,
          clientName: entry.clientName,
          durationSeconds: entry.durationSeconds,
          startedAt: entry.startedAt,
          endedAt: entry.endedAt,
          isBillable: entry.isBillable,
        })),
      };
    },
    listProjects: async ({ clientId } = {}) => {
      const result = await listAgencyProjects(actorUserId, {
        teamId,
        ...(clientId ? { clientId } : {}),
      });
      return {
        projects: result.items.map((project) => ({
          id: project.id,
          name: project.name,
          clientId: project.clientId,
          clientName: project.clientName,
        })),
      };
    },
    listMembers: async () => {
      const members = await listTeamMembers(actorUserId, { teamId });
      return {
        members: members.map((member) => ({
          userId: member.userId,
          name: member.userName,
          email: member.userEmail,
          role: member.role,
        })),
      };
    },
    getTimeSummary: async (input) => {
      const result = await getAgencyTimeSummary(actorUserId, {
        teamId,
        from: input.from,
        to: input.to,
        memberUserId: input.memberUserId,
        projectId: input.projectId,
        clientId: input.clientId,
      });
      return {
        totalSeconds: result.summary.totalSeconds,
        members: result.summary.teamMembers.map((member) => ({
          userId: member.id,
          name: member.name,
          seconds: member.totalSeconds,
          isTiming: member.isActive,
        })),
      };
    },
    getReportsSummary: async (input) => {
      const result = await getAgencyReportsSummary(actorUserId, {
        teamId,
        from: input.from,
        to: input.to,
        memberUserId: input.memberUserId,
        projectId: input.projectId,
        clientId: input.clientId,
      });
      return {
        totalSeconds: Math.round(result.summary.totalHours * 3_600),
        byClient: result.summary.timeDistributionByClient.map((entry) => ({
          clientId: entry.clientId,
          clientName: entry.clientName,
          seconds: Math.round(entry.hours * 3_600),
        })),
        byProject: result.summary.timeDistributionByProject.map((entry) => ({
          projectId: entry.projectId,
          projectName: entry.projectName,
          clientName: entry.clientName,
          seconds: Math.round(entry.hours * 3_600),
        })),
        byMember: result.summary.teamActivity.map((entry) => ({
          userId: entry.userId,
          userName: entry.userName,
          seconds: Math.round(entry.hours * 3_600),
        })),
      };
    },
  };
}

export function getAgentToolsCatalog(actorUserId: string, input: AgentToolCatalogInput) {
  void actorUserId;
  const mode = input.surface === "agency" ? "ask" : input.mode;
  return agentToolCatalogResponseSchema.parse({
    tools: listAgentToolCatalog({ surface: input.surface, mode }),
  });
}
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
    attachments: attachmentsFromRow(row.attachments),
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
  input: {
    content: string;
    attachments?: AgentTextAttachment[];
    model?: string | null;
    toolPreset: AgentChatTurnInput["toolPreset"];
  },
) {
  const now = new Date();
  const conversationId = createWorkspaceId("conversation");

  await db.insert(dashboardConversation).values({
    id: conversationId,
    userId: actorUserId,
    title: buildDashboardConversationTitle(
      titleSeedFromAgentTurn(input.content, input.attachments ?? []),
    ),
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
  const surface: AgentSurface = turn.surface ?? "canvas";
  const toolPreset = surface === "agency" ? "ask" : turn.toolPreset;

  if (surface === "agency" && !turn.teamId?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Agency agent turns require a teamId.",
    });
  }

  if (surface === "agency" && turn.toolPreset === "agent") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Agent edits are canvas-only for now.",
    });
  }

  const now = new Date();
  const [fullWorkspaceSnapshot, marketplaceResult] = await Promise.all([
    surface === "agency"
      ? Promise.resolve({ nodes: [], updatedAt: null as string | null })
      : turn.nodes
        ? Promise.resolve({
            nodes: turn.nodes,
            updatedAt: null as string | null,
          })
        : getWorkspaceSnapshot(userId, {}),
    surface === "agency"
      ? Promise.resolve({ items: [] })
      : getWorkspaceMarketplaceItems(userId, { limit: 200, kind: "all" }),
  ]);

  const turnAttachments = turn.attachments ?? [];
  const turnModelContent = modelUserContent(turn.content, turnAttachments);
  const modelPreset = turn.modelPreset ?? DEFAULT_AGENT_MODEL_PRESET;
  const resolvedModel = await resolveOpenRouterModelForTurn({
    preset: modelPreset,
    pinnedModelId: turn.model,
    content: typeof turnModelContent === "string" ? turnModelContent : turn.content,
    signals: {
      contentLength: modelContentLength(turnModelContent),
      scopeCount: turn.scopeRefs?.length ?? turn.scopeNodes?.length ?? 0,
      mentionCount: turn.contextNodeTitles?.length ?? 0,
      toolPreset,
    },
  });
  const resolvedModelId = resolvedModel.modelId;

  const conversation = turn.conversationId
    ? await getConversationRecord(userId, turn.conversationId)
    : await createDashboardConversation(userId, {
        content: turn.content,
        attachments: turnAttachments,
        model: resolvedModelId,
        toolPreset,
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
    content:
      message.role === "user"
        ? modelUserContent(message.content, attachmentsFromRow(message.attachments))
        : message.content,
  }));
  const scopeNodes = turn.scopeNodes ?? turn.nodes;
  const agencyRuntime =
    surface === "agency" && turn.teamId ? createAgencyAgentRuntime(userId, turn.teamId) : null;

  const result = await runDashboardAgent(
    [
      ...recentMessages,
      {
        role: "user",
        content: turnModelContent,
      },
    ],
    {
      nodes: fullWorkspaceSnapshot.nodes,
      scopeNodes,
      marketplaceItems: marketplaceResult.items,
      updatedAt: fullWorkspaceSnapshot.updatedAt,
      userName,
      activeTabId: turn.activeTabId,
      surface,
      scopeRefs: turn.scopeRefs,
      teamId: turn.teamId ?? null,
    },
    {
      model: resolvedModelId,
      modelPreset,
      toolPreset,
      agencyRuntime,
    },
  );
  const nextUsageSummary = buildNextConversationUsageSummary(
    conversation.usageSummary,
    result.usage,
  );
  const workspaceSnapshot =
    surface === "agency"
      ? null
      : result.workspaceSnapshot
        ? {
            nodes: result.workspaceSnapshot.nodes,
            updatedAt: (await saveWorkspaceNodes(userId, { nodes: result.workspaceSnapshot.nodes }))
              .updatedAt,
          }
        : null;

  const contextTitles = turn.contextNodeTitles ?? turn.scopeRefs?.map((ref) => ref.label) ?? [];

  const userMessageRow = {
    id: createWorkspaceId("message"),
    conversationId: conversation.id,
    userId,
    role: "user" as const,
    content: turn.content,
    attachments: turnAttachments,
    contextNodeTitles: contextTitles,
    model: resolvedModelId,
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
    attachments: [] as AgentTextAttachment[],
    contextNodeTitles: [],
    model: result.model,
    toolsCalled: result.toolsCalled,
    createdAt: assistantCreatedAt,
  };

  await db.insert(dashboardConversationMessage).values([userMessageRow, assistantMessageRow]);

  await db
    .update(dashboardConversation)
    .set({
      model: result.model || resolvedModelId,
      toolPreset,
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
      model: result.model || resolvedModelId,
      toolPreset,
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

export async function* streamDashboardConversationTurn(
  actorUserId: string,
  input: { actorUserName: string; turn: AgentChatTurnInput; signal?: AbortSignal },
): AsyncGenerator<AgentChatTurnStreamEvent, void, void> {
  const userId = actorUserId;
  const { actorUserName: userName, turn } = input;
  const surface: AgentSurface = turn.surface ?? "canvas";
  const toolPreset = surface === "agency" ? "ask" : turn.toolPreset;

  if (surface === "agency" && !turn.teamId?.trim()) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Agency agent turns require a teamId.",
    });
  }

  if (surface === "agency" && turn.toolPreset === "agent") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Agent edits are canvas-only for now.",
    });
  }

  const now = new Date();
  const [fullWorkspaceSnapshot, marketplaceResult] = await Promise.all([
    surface === "agency"
      ? Promise.resolve({ nodes: [], updatedAt: null as string | null })
      : turn.nodes
        ? Promise.resolve({
            nodes: turn.nodes,
            updatedAt: null as string | null,
          })
        : getWorkspaceSnapshot(userId, {}),
    surface === "agency"
      ? Promise.resolve({ items: [] })
      : getWorkspaceMarketplaceItems(userId, { limit: 200, kind: "all" }),
  ]);

  const turnAttachments = turn.attachments ?? [];
  const turnModelContent = modelUserContent(turn.content, turnAttachments);
  const modelPreset = turn.modelPreset ?? DEFAULT_AGENT_MODEL_PRESET;
  const resolvedModel = await resolveOpenRouterModelForTurn({
    preset: modelPreset,
    pinnedModelId: turn.model,
    content: typeof turnModelContent === "string" ? turnModelContent : turn.content,
    signals: {
      contentLength: modelContentLength(turnModelContent),
      scopeCount: turn.scopeRefs?.length ?? turn.scopeNodes?.length ?? 0,
      mentionCount: turn.contextNodeTitles?.length ?? 0,
      toolPreset,
    },
  });
  const resolvedModelId = resolvedModel.modelId;

  const conversation = turn.conversationId
    ? await getConversationRecord(userId, turn.conversationId)
    : await createDashboardConversation(userId, {
        content: turn.content,
        attachments: turnAttachments,
        model: resolvedModelId,
        toolPreset,
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
    content:
      message.role === "user"
        ? modelUserContent(message.content, attachmentsFromRow(message.attachments))
        : message.content,
  }));
  const scopeNodes = turn.scopeNodes ?? turn.nodes;
  const agencyRuntime =
    surface === "agency" && turn.teamId ? createAgencyAgentRuntime(userId, turn.teamId) : null;

  const contextTitles = turn.contextNodeTitles ?? turn.scopeRefs?.map((ref) => ref.label) ?? [];
  const userMessageId = createWorkspaceId("message");
  const assistantMessageId = createWorkspaceId("message");

  const userMessageRow = {
    id: userMessageId,
    conversationId: conversation.id,
    userId,
    role: "user" as const,
    content: turn.content,
    attachments: turnAttachments,
    contextNodeTitles: contextTitles,
    model: resolvedModelId,
    toolsCalled: [] as AgentToolCall[],
    createdAt: now,
  };

  await db.insert(dashboardConversationMessage).values(userMessageRow);

  yield agentChatTurnStreamEventSchema.parse({
    type: "started",
    conversationId: conversation.id,
    createdConversation,
    userMessageId,
    assistantMessageId,
    model: resolvedModelId,
  });

  let accumulated = "";
  const toolsById = new Map<string, AgentToolCall>();
  const toolOrder: string[] = [];
  let stopped = Boolean(input.signal?.aborted);

  try {
    for await (const event of streamDashboardAgent(
      [
        ...recentMessages,
        {
          role: "user",
          content: turnModelContent,
        },
      ],
      {
        nodes: fullWorkspaceSnapshot.nodes,
        scopeNodes,
        marketplaceItems: marketplaceResult.items,
        updatedAt: fullWorkspaceSnapshot.updatedAt,
        userName,
        activeTabId: turn.activeTabId,
        surface,
        scopeRefs: turn.scopeRefs,
        teamId: turn.teamId ?? null,
      },
      {
        model: resolvedModelId,
        modelPreset,
        toolPreset,
        agencyRuntime,
        signal: input.signal,
      },
    )) {
      if (event.type === "token") {
        accumulated += event.delta;
        yield agentChatTurnStreamEventSchema.parse(event);
        continue;
      }
      if (event.type === "tool") {
        const toolId = event.tool.id ?? `tool_${toolOrder.length}`;
        if (!toolsById.has(toolId)) {
          toolOrder.push(toolId);
        }
        toolsById.set(toolId, { ...event.tool, id: toolId });
        yield agentChatTurnStreamEventSchema.parse({
          type: "tool",
          tool: { ...event.tool, id: toolId },
        });
        continue;
      }
      if (event.type === "done") {
        stopped = stopped || Boolean(input.signal?.aborted);
        const toolsCalled = toolOrder
          .map((id) => toolsById.get(id))
          .filter((tool): tool is AgentToolCall => Boolean(tool));
        const finalTools = event.toolCalls.length > 0 ? event.toolCalls : toolsCalled;
        const responseText =
          event.responseText.trim().length > 0
            ? event.responseText.trim().slice(0, 20_000)
            : stopped
              ? "Stopped before a reply."
              : "I couldn't generate a response.";

        const nextUsageSummary = buildNextConversationUsageSummary(
          conversation.usageSummary,
          event.usage,
        );
        const workspaceSnapshot =
          surface === "agency"
            ? null
            : event.workspaceSnapshot
              ? {
                  nodes: event.workspaceSnapshot.nodes,
                  updatedAt: (
                    await saveWorkspaceNodes(userId, { nodes: event.workspaceSnapshot.nodes })
                  ).updatedAt,
                }
              : null;

        const assistantCreatedAt = new Date();
        const assistantMessageRow = {
          id: assistantMessageId,
          conversationId: conversation.id,
          userId,
          role: "assistant" as const,
          content: responseText,
          attachments: [] as AgentTextAttachment[],
          contextNodeTitles: [] as string[],
          model: event.model || resolvedModelId,
          toolsCalled: finalTools,
          createdAt: assistantCreatedAt,
        };

        await db.insert(dashboardConversationMessage).values(assistantMessageRow);
        await db
          .update(dashboardConversation)
          .set({
            model: event.model || resolvedModelId,
            toolPreset,
            usageSummary: nextUsageSummary,
            updatedAt: assistantCreatedAt,
            lastMessageAt: assistantCreatedAt,
          })
          .where(
            and(
              eq(dashboardConversation.id, conversation.id),
              eq(dashboardConversation.userId, userId),
            ),
          );

        const conversationSummary = mapConversationSummary({
          row: {
            ...conversation,
            model: event.model || resolvedModelId,
            toolPreset,
            usageSummary: nextUsageSummary,
            updatedAt: assistantCreatedAt,
            lastMessageAt: assistantCreatedAt,
          },
          lastMessagePreview: buildDashboardMessagePreview(responseText),
        });

        yield agentChatTurnStreamEventSchema.parse({
          type: "completed",
          conversation: conversationSummary,
          userMessage: mapConversationMessage(userMessageRow),
          assistantMessage: mapConversationMessage(assistantMessageRow),
          createdConversation,
          workspaceSnapshot,
          stopped,
        });
      }
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim()
        ? error.message.trim().slice(0, 2_000)
        : "Failed to stream the agent reply.";
    yield agentChatTurnStreamEventSchema.parse({
      type: "error",
      message,
    });
  }
}
