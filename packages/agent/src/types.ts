import {
  WORKSPACE_NODE_LIMIT,
  workspaceNodeSchema,
  type WorkspaceMarketplaceItem,
  type WorkspaceNode,
} from "@orch/workspace";
import { z } from "zod";

export const DEFAULT_AGENT_MODEL = "openai/gpt-5-nano";
export const DASHBOARD_CONVERSATION_TITLE_LIMIT = 80;
export const DASHBOARD_CONVERSATION_HISTORY_LIMIT = 50;
export const DASHBOARD_CONVERSATION_MESSAGE_WINDOW = 20;

export const dashboardConversationUsageLatestSchema = z.object({
  modelId: z.string().trim().min(1),
  contextLength: z.number().int().positive().nullable(),
  inputTokens: z.number().int().nonnegative(),
  cachedTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative().nullable(),
});

export const dashboardConversationUsageTotalsSchema = z.object({
  inputTokens: z.number().int().nonnegative(),
  cachedTokens: z.number().int().nonnegative(),
  outputTokens: z.number().int().nonnegative(),
  reasoningTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
  costUsd: z.number().nonnegative(),
});

export const dashboardConversationUsageSummarySchema = z.object({
  latest: dashboardConversationUsageLatestSchema.nullable().default(null),
  totals: dashboardConversationUsageTotalsSchema.default({
    inputTokens: 0,
    cachedTokens: 0,
    outputTokens: 0,
    reasoningTokens: 0,
    totalTokens: 0,
    costUsd: 0,
  }),
});

export const agentToolCallSchema = z.object({
  id: z.string().trim().min(1).max(160).optional(),
  name: z.string().trim().min(1).max(120),
  input: z.unknown().optional(),
  output: z.unknown().optional(),
  status: z.enum(["completed", "error", "in_progress"]).default("completed"),
  error: z.string().trim().max(4000).nullable().default(null),
  durationMs: z.number().int().nonnegative().optional(),
});

export const agentToolCallEntrySchema = z.union([
  z.string().trim().min(1).max(120),
  agentToolCallSchema,
]);

export const agentMessageRoleSchema = z.enum(["user", "assistant", "system"]);
export const dashboardConversationMessageRoleSchema = z.enum(["user", "assistant"]);
export const dashboardAgentCanonicalToolPresetSchema = z.enum(["ask", "agent"]);
export const dashboardAgentLegacyToolPresetSchema = z.enum([
  "auto",
  "direct",
  "workspace-search",
  "deep-inspect",
]);
export const dashboardAgentToolPresetSchema = dashboardAgentCanonicalToolPresetSchema;

export const agentModelTierSchema = z.enum(["fast", "balanced", "pro"]);
export const agentModelPresetSchema = z.object({
  tier: agentModelTierSchema.default("balanced"),
  auto: z.boolean().default(true),
  free: z.boolean().default(false),
});
export const DEFAULT_AGENT_MODEL_PRESET = {
  tier: "balanced" as const,
  auto: true,
  free: false,
};

export function normalizeDashboardAgentToolPreset(
  preset?: string | null,
): z.infer<typeof dashboardAgentCanonicalToolPresetSchema> {
  switch (preset?.trim()) {
    case "agent":
    case "deep-inspect":
      return "agent";
    case "ask":
    case "auto":
    case "direct":
    case "workspace-search":
    default:
      return "ask";
  }
}

export const dashboardAgentToolPresetInputSchema = z
  .union([dashboardAgentCanonicalToolPresetSchema, dashboardAgentLegacyToolPresetSchema])
  .transform((preset) => normalizeDashboardAgentToolPreset(preset));

export const AGENT_TEXT_ATTACHMENT_MAX_FILES = 5;
export const AGENT_ATTACHMENT_MAX_FILES = AGENT_TEXT_ATTACHMENT_MAX_FILES;
export const AGENT_TEXT_ATTACHMENT_MAX_BYTES = 100_000;
export const AGENT_IMAGE_ATTACHMENT_MAX_BYTES = 2_000_000;

export const agentTextAttachmentMediaTypeSchema = z.enum([
  "text/plain",
  "text/markdown",
  "application/json",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

export const agentTextAttachmentSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  mediaType: agentTextAttachmentMediaTypeSchema,
  /** UTF-8 text for documents, or a data:image/... URL for images. */
  text: z.string().max(AGENT_IMAGE_ATTACHMENT_MAX_BYTES),
});

export const agentMessageSchema = z.object({
  role: agentMessageRoleSchema,
  content: z.string().trim().min(1).max(20_000),
});

export const agentChatResponseSchema = z.object({
  response: z.string(),
  messagesCount: z.number().int().nonnegative(),
  model: z.string(),
  toolsCalled: z.array(agentToolCallEntrySchema).max(48),
  workspaceNodeCount: z.number().int().nonnegative(),
  usage: dashboardConversationUsageLatestSchema.nullable().default(null),
  workspaceSnapshot: z
    .object({
      nodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT),
      updatedAt: z.string().datetime().nullable(),
    })
    .nullable()
    .default(null),
});

export const dashboardConversationSummarySchema = z.object({
  id: z.string().trim().min(1),
  title: z.string().trim().min(1).max(DASHBOARD_CONVERSATION_TITLE_LIMIT),
  model: z.string().trim().min(1).nullable(),
  toolPreset: dashboardAgentToolPresetSchema,
  usageSummary: dashboardConversationUsageSummarySchema.default({
    latest: null,
    totals: {
      inputTokens: 0,
      cachedTokens: 0,
      outputTokens: 0,
      reasoningTokens: 0,
      totalTokens: 0,
      costUsd: 0,
    },
  }),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastMessageAt: z.string().datetime(),
  lastMessagePreview: z.string().max(280).nullable(),
});

export const dashboardConversationMessageSchema = z.object({
  id: z.string().trim().min(1),
  role: dashboardConversationMessageRoleSchema,
  content: z.string().trim().max(20_000),
  attachments: z.array(agentTextAttachmentSchema).max(AGENT_TEXT_ATTACHMENT_MAX_FILES).default([]),
  contextNodeTitles: z.array(z.string().trim().min(1).max(120)).max(24).default([]),
  model: z.string().trim().min(1).nullable(),
  toolsCalled: z.array(agentToolCallEntrySchema).max(48).default([]),
  createdAt: z.string().datetime(),
});

export const dashboardConversationDetailSchema = dashboardConversationSummarySchema.extend({
  messages: z.array(dashboardConversationMessageSchema).default([]),
});

export const dashboardConversationListResponseSchema = z.object({
  conversations: z
    .array(dashboardConversationSummarySchema)
    .max(DASHBOARD_CONVERSATION_HISTORY_LIMIT)
    .default([]),
});

export const dashboardConversationGetInputSchema = z.object({
  conversationId: z.string().trim().min(1),
});

export const dashboardConversationRenameInputSchema = z.object({
  conversationId: z.string().trim().min(1),
  title: z.string().trim().min(1).max(DASHBOARD_CONVERSATION_TITLE_LIMIT),
});

export const dashboardConversationDeleteInputSchema = z.object({
  conversationId: z.string().trim().min(1),
});

export const agentSurfaceSchema = z.enum(["canvas", "agency"]);
export const agentScopeRefKindSchema = z.enum([
  "node",
  "tab",
  "block",
  "timeEntry",
  "project",
  "member",
]);

export const agentScopeRefSchema = z.object({
  kind: agentScopeRefKindSchema,
  id: z.string().trim().min(1).max(160),
  label: z.string().trim().min(1).max(160),
});

export const agentToolCatalogEntrySchema = z.object({
  name: z.string().trim().min(1).max(120),
  usage: z.string().trim().min(1).max(280),
  surface: z.array(agentSurfaceSchema).min(1),
  modes: z.array(dashboardAgentCanonicalToolPresetSchema).min(1),
  available: z.boolean(),
});

export const agentToolCatalogInputSchema = z.object({
  surface: agentSurfaceSchema,
  mode: dashboardAgentToolPresetInputSchema,
});

export const agentToolCatalogResponseSchema = z.object({
  tools: z.array(agentToolCatalogEntrySchema).max(64),
});

export const agentChatTurnInputSchema = z
  .object({
    conversationId: z.string().trim().min(1).optional(),
    content: z.string().trim().max(20_000).default(""),
    attachments: z
      .array(agentTextAttachmentSchema)
      .max(AGENT_TEXT_ATTACHMENT_MAX_FILES)
      .default([]),
    surface: agentSurfaceSchema.optional().default("canvas"),
    teamId: z.string().trim().min(1).optional(),
    nodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT).optional(),
    scopeNodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT).optional(),
    scopeRefs: z.array(agentScopeRefSchema).max(24).optional(),
    contextNodeTitles: z.array(z.string().trim().min(1).max(120)).max(24).optional(),
    activeTabId: z.string().trim().min(1).optional(),
    model: z.string().trim().min(1).optional(),
    modelPreset: agentModelPresetSchema.optional(),
    toolPreset: dashboardAgentToolPresetInputSchema,
  })
  .superRefine((value, ctx) => {
    if (value.content.trim().length === 0 && value.attachments.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Message is empty.",
        path: ["content"],
      });
    }
  });

export const agentChatTurnResponseSchema = z.object({
  conversation: dashboardConversationSummarySchema,
  userMessage: dashboardConversationMessageSchema,
  assistantMessage: dashboardConversationMessageSchema,
  createdConversation: z.boolean(),
  workspaceSnapshot: agentChatResponseSchema.shape.workspaceSnapshot,
});

export const agentChatTurnStreamStartedEventSchema = z.object({
  type: z.literal("started"),
  conversationId: z.string().trim().min(1),
  createdConversation: z.boolean(),
  userMessageId: z.string().trim().min(1),
  assistantMessageId: z.string().trim().min(1),
  model: z.string().trim().min(1),
});

export const agentChatTurnStreamTokenEventSchema = z.object({
  type: z.literal("token"),
  delta: z.string().min(1).max(8_000),
});

export const agentChatTurnStreamToolEventSchema = z.object({
  type: z.literal("tool"),
  tool: agentToolCallSchema,
});

export const agentChatTurnStreamErrorEventSchema = z.object({
  type: z.literal("error"),
  message: z.string().trim().min(1).max(2_000),
});

export const agentChatTurnStreamCompletedEventSchema = z.object({
  type: z.literal("completed"),
  conversation: dashboardConversationSummarySchema,
  userMessage: dashboardConversationMessageSchema,
  assistantMessage: dashboardConversationMessageSchema,
  createdConversation: z.boolean(),
  workspaceSnapshot: agentChatResponseSchema.shape.workspaceSnapshot,
  stopped: z.boolean(),
});

export const agentChatTurnStreamEventSchema = z.discriminatedUnion("type", [
  agentChatTurnStreamStartedEventSchema,
  agentChatTurnStreamTokenEventSchema,
  agentChatTurnStreamToolEventSchema,
  agentChatTurnStreamErrorEventSchema,
  agentChatTurnStreamCompletedEventSchema,
]);

export type AgentMessage = z.infer<typeof agentMessageSchema>;
export type AgentTextAttachment = z.infer<typeof agentTextAttachmentSchema>;
export type AgentTextAttachmentMediaType = z.infer<typeof agentTextAttachmentMediaTypeSchema>;
export type AgentAttachment = AgentTextAttachment;

export type AgentModelContentPart =
  | { type: "input_text"; text: string }
  | { type: "input_image"; imageUrl: string; detail: "auto" };

export type AgentModelInputMessage = {
  role: "user" | "assistant" | "system";
  content: string | AgentModelContentPart[];
};
export type AgentChatResponse = z.infer<typeof agentChatResponseSchema>;
export type AgentToolCall = z.infer<typeof agentToolCallSchema>;
export type AgentToolCallEntry = z.infer<typeof agentToolCallEntrySchema>;
export type DashboardAgentToolPreset = z.infer<typeof dashboardAgentToolPresetSchema>;
export type DashboardConversationUsageLatest = z.infer<
  typeof dashboardConversationUsageLatestSchema
>;
export type DashboardConversationUsageTotals = z.infer<
  typeof dashboardConversationUsageTotalsSchema
>;
export type DashboardConversationUsageSummary = z.infer<
  typeof dashboardConversationUsageSummarySchema
>;
export type DashboardConversationSummary = z.infer<typeof dashboardConversationSummarySchema>;
export type DashboardConversationMessage = z.infer<typeof dashboardConversationMessageSchema>;
export type DashboardConversationDetail = z.infer<typeof dashboardConversationDetailSchema>;
export type AgentChatTurnInput = z.infer<typeof agentChatTurnInputSchema>;
export type AgentChatTurnResponse = z.infer<typeof agentChatTurnResponseSchema>;
export type AgentChatTurnStreamEvent = z.infer<typeof agentChatTurnStreamEventSchema>;
export type AgentSurface = z.infer<typeof agentSurfaceSchema>;
export type AgentScopeRef = z.infer<typeof agentScopeRefSchema>;
export type AgentToolCatalogEntry = z.infer<typeof agentToolCatalogEntrySchema>;
export type AgentToolCatalogInput = z.infer<typeof agentToolCatalogInputSchema>;
export type AgentToolCatalogResponse = z.infer<typeof agentToolCatalogResponseSchema>;
export type AgentModelTier = z.infer<typeof agentModelTierSchema>;
export type AgentModelPreset = z.infer<typeof agentModelPresetSchema>;

export type DashboardAgentWorkspaceContext = {
  nodes: WorkspaceNode[];
  scopeNodes?: WorkspaceNode[];
  marketplaceItems?: WorkspaceMarketplaceItem[];
  updatedAt?: string | null;
  userName?: string | null;
  activeTabId?: string | null;
  surface?: AgentSurface;
  scopeRefs?: AgentScopeRef[];
  teamId?: string | null;
};

export type DashboardAgentConfig = {
  model?: string;
  modelPreset?: AgentModelPreset;
  temperature?: number;
  maxOutputTokens?: number;
  toolPreset?: DashboardAgentToolPreset;
  agencyRuntime?: AgencyAgentRuntime | null;
};

export type AgencyAgentRuntime = {
  teamId: string;
  listMyTimeEntries: (input: { page?: number; pageSize?: number }) => Promise<{
    entries: Array<{
      id: string;
      description: string;
      projectName: string;
      clientName: string;
      durationSeconds: number;
      startedAt: string;
      endedAt: string;
      isBillable: boolean;
    }>;
  }>;
  listProjects: (input?: { clientId?: string }) => Promise<{
    projects: Array<{
      id: string;
      name: string;
      clientId: string;
      clientName: string;
    }>;
  }>;
  listMembers: () => Promise<{
    members: Array<{
      userId: string;
      name: string;
      email: string;
      role: string;
    }>;
  }>;
  getTimeSummary: (input: {
    from: string;
    to: string;
    memberUserId?: string;
    projectId?: string;
    clientId?: string;
  }) => Promise<{
    totalSeconds: number;
    members: Array<{
      userId: string;
      name: string;
      seconds: number;
      isTiming: boolean;
    }>;
  }>;
  getReportsSummary: (input: {
    from: string;
    to: string;
    memberUserId?: string;
    projectId?: string;
    clientId?: string;
  }) => Promise<{
    totalSeconds: number;
    byClient: Array<{ clientId: string; clientName: string; seconds: number }>;
    byProject: Array<{
      projectId: string;
      projectName: string;
      clientName: string;
      seconds: number;
    }>;
    byMember: Array<{ userId: string; userName: string; seconds: number }>;
  }>;
};
