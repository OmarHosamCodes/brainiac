import {
  WORKSPACE_NODE_LIMIT,
  workspaceNodeSchema,
  type WorkspaceMarketplaceItem,
  type WorkspaceNode,
} from "@brainiac/workspace";
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

export const agentMessageSchema = z.object({
  role: agentMessageRoleSchema,
  content: z.string().trim().min(1).max(20_000),
});

export const agentChatResponseSchema = z.object({
  response: z.string(),
  messagesCount: z.number().int().nonnegative(),
  model: z.string(),
  toolsCalled: z.array(z.string()),
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
  content: z.string().trim().min(1).max(20_000),
  contextNodeTitles: z.array(z.string().trim().min(1).max(120)).max(24).default([]),
  model: z.string().trim().min(1).nullable(),
  toolsCalled: z.array(z.string().trim().min(1).max(120)).max(24).default([]),
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

export const agentChatTurnInputSchema = z.object({
  conversationId: z.string().trim().min(1).optional(),
  content: z.string().trim().min(1).max(20_000),
  nodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT).optional(),
  scopeNodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT).optional(),
  contextNodeTitles: z.array(z.string().trim().min(1).max(120)).max(24).optional(),
  model: z.string().trim().min(1).optional(),
  toolPreset: dashboardAgentToolPresetInputSchema,
});

export const agentChatTurnResponseSchema = z.object({
  conversation: dashboardConversationSummarySchema,
  userMessage: dashboardConversationMessageSchema,
  assistantMessage: dashboardConversationMessageSchema,
  createdConversation: z.boolean(),
  workspaceSnapshot: agentChatResponseSchema.shape.workspaceSnapshot,
});

export type AgentMessage = z.infer<typeof agentMessageSchema>;
export type AgentChatResponse = z.infer<typeof agentChatResponseSchema>;
export type DashboardAgentToolPreset = z.infer<typeof dashboardAgentToolPresetSchema>;
export type DashboardConversationUsageLatest = z.infer<typeof dashboardConversationUsageLatestSchema>;
export type DashboardConversationUsageTotals = z.infer<typeof dashboardConversationUsageTotalsSchema>;
export type DashboardConversationUsageSummary = z.infer<
  typeof dashboardConversationUsageSummarySchema
>;
export type DashboardConversationSummary = z.infer<typeof dashboardConversationSummarySchema>;
export type DashboardConversationMessage = z.infer<typeof dashboardConversationMessageSchema>;
export type DashboardConversationDetail = z.infer<typeof dashboardConversationDetailSchema>;
export type AgentChatTurnInput = z.infer<typeof agentChatTurnInputSchema>;
export type AgentChatTurnResponse = z.infer<typeof agentChatTurnResponseSchema>;

export type DashboardAgentWorkspaceContext = {
  nodes: WorkspaceNode[];
  scopeNodes?: WorkspaceNode[];
  marketplaceItems?: WorkspaceMarketplaceItem[];
  updatedAt?: string | null;
  userName?: string | null;
};

export type DashboardAgentConfig = {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
  toolPreset?: DashboardAgentToolPreset;
};
