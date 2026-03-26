import {
  agentChatResponseSchema,
  agentMessageSchema,
  listOpenRouterFreeModels,
  openRouterFreeModelsResponseSchema,
  runDashboardAgent,
} from "@brainiac/agent";
import {
  WORKSPACE_NODE_LIMIT,
  workspaceNodeSchema,
} from "@brainiac/workspace";
import { z } from "zod";

import { protectedProcedure } from "../procedures";
import { toInternalServerError } from "../dev-errors";
import { getWorkspaceSnapshot } from "./workspace/service";

const agentChatInputSchema = z.object({
  messages: z.array(agentMessageSchema).min(1).max(24),
  nodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT).optional(),
  model: z.string().trim().min(1).optional(),
});

export const agentRouter = {
  freeModels: protectedProcedure.handler(async () => {
    try {
      return openRouterFreeModelsResponseSchema.parse(
        await listOpenRouterFreeModels(),
      );
    } catch (error) {
      throw toInternalServerError("agent.freeModels", error);
    }
  }),
  chat: protectedProcedure
    .input(agentChatInputSchema)
    .handler(async ({ input, context }) => {
      try {
        const workspaceSnapshot = input.nodes
          ? {
              nodes: input.nodes,
              updatedAt: null,
            }
          : await getWorkspaceSnapshot(context.session.user.id);

        const result = await runDashboardAgent(input.messages, {
          nodes: workspaceSnapshot.nodes,
          updatedAt: workspaceSnapshot.updatedAt,
          userName: context.session.user.name,
        }, {
          model: input.model,
        });

        return agentChatResponseSchema.parse(result);
      } catch (error) {
        throw toInternalServerError("agent.chat", error, {
          inputMessagesCount: input.messages.length,
          requestedNodesCount: input.nodes?.length,
          workspaceSource: input.nodes ? "request" : "database",
          requestedModel: input.model ?? null,
        });
      }
    }),
};
