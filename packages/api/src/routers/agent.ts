import {
  agentChatResponseSchema,
  agentMessageSchema,
  runDashboardAgent,
} from "@brainiac/agent";
import {
  WORKSPACE_NODE_LIMIT,
  workspaceNodeSchema,
} from "@brainiac/workspace";
import { z } from "zod";

import { protectedProcedure } from "../procedures";
import { getWorkspaceSnapshot } from "./workspace/service";

const agentChatInputSchema = z.object({
  messages: z.array(agentMessageSchema).min(1).max(24),
  nodes: z.array(workspaceNodeSchema).max(WORKSPACE_NODE_LIMIT).optional(),
  model: z.string().trim().min(1).optional(),
});

export const agentRouter = {
  chat: protectedProcedure
    .input(agentChatInputSchema)
    .handler(async ({ input, context }) => {
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
    }),
};
