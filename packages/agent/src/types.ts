import type { WorkspaceNode } from "@brainiac/workspace";
import { z } from "zod";

export const DEFAULT_AGENT_MODEL = "openai/gpt-5-nano";

export const agentMessageRoleSchema = z.enum(["user", "assistant", "system"]);

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
});

export type AgentMessage = z.infer<typeof agentMessageSchema>;
export type AgentChatResponse = z.infer<typeof agentChatResponseSchema>;

export type DashboardAgentWorkspaceContext = {
  nodes: WorkspaceNode[];
  updatedAt?: string | null;
  userName?: string | null;
};

export type DashboardAgentConfig = {
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
};
