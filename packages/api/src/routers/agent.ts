import {
  agentChatTurnInputSchema,
  agentChatTurnResponseSchema,
  dashboardConversationDeleteInputSchema,
  dashboardConversationDetailSchema,
  dashboardConversationGetInputSchema,
  dashboardConversationListResponseSchema,
  dashboardConversationRenameInputSchema,
  getOpenRouterAccountStatus,
  listOpenRouterModels,
  listOpenRouterFreeModels,
  openRouterAccountStatusSchema,
  openRouterModelCatalogResponseSchema,
  openRouterFreeModelsResponseSchema,
} from "@brainiac/agent";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { getBillingStateForUser } from "../billing-guard";
import { protectedProcedure } from "../procedures";
import { toInternalServerError } from "../dev-errors";
import {
  appendDashboardConversationTurn,
  deleteDashboardConversation,
  getDashboardConversation,
  listDashboardConversations,
  renameDashboardConversation,
} from "./agent/service";

export const agentRouter = {
  freeModels: protectedProcedure.handler(async () => {
    try {
      return openRouterFreeModelsResponseSchema.parse(await listOpenRouterFreeModels());
    } catch (error) {
      throw toInternalServerError("agent.freeModels", error);
    }
  }),
  modelCatalog: protectedProcedure.handler(async () => {
    try {
      return openRouterModelCatalogResponseSchema.parse(await listOpenRouterModels());
    } catch (error) {
      throw toInternalServerError("agent.modelCatalog", error);
    }
  }),
  accountStatus: protectedProcedure.handler(async () => {
    try {
      return openRouterAccountStatusSchema.parse(await getOpenRouterAccountStatus());
    } catch (error) {
      throw toInternalServerError("agent.accountStatus", error);
    }
  }),
  chat: {
    turn: protectedProcedure.input(agentChatTurnInputSchema).handler(async ({ input, context }) => {
      try {
        // Enforce conversation limit for free tier (only for new conversations)
        if (!input.conversationId) {
          const billing = await getBillingStateForUser(context.session.user.id);

          if (billing.limits.aiConversations !== -1) {
            const existing = await listDashboardConversations(context.session.user.id);
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
        }

        return agentChatTurnResponseSchema.parse(
          await appendDashboardConversationTurn(
            context.session.user.id,
            context.session.user.name,
            input,
          ),
        );
      } catch (error) {
        throw toInternalServerError("agent.chat.turn", error, {
          conversationId: input.conversationId ?? null,
          requestedNodesCount: input.nodes?.length,
          workspaceSource: input.nodes ? "request" : "database",
          requestedModel: input.model ?? null,
          toolPreset: input.toolPreset,
        });
      }
    }),
  },
  conversations: {
    list: protectedProcedure.handler(async ({ context }) => {
      try {
        return dashboardConversationListResponseSchema.parse(
          await listDashboardConversations(context.session.user.id),
        );
      } catch (error) {
        throw toInternalServerError("agent.conversations.list", error);
      }
    }),
    get: protectedProcedure
      .input(dashboardConversationGetInputSchema)
      .handler(async ({ input, context }) => {
        try {
          return dashboardConversationDetailSchema.parse(
            await getDashboardConversation(context.session.user.id, input.conversationId),
          );
        } catch (error) {
          throw toInternalServerError("agent.conversations.get", error, {
            conversationId: input.conversationId,
          });
        }
      }),
    rename: protectedProcedure
      .input(dashboardConversationRenameInputSchema)
      .handler(async ({ input, context }) => {
        try {
          return dashboardConversationDetailSchema.parse(
            await renameDashboardConversation(
              context.session.user.id,
              input.conversationId,
              input.title,
            ),
          );
        } catch (error) {
          throw toInternalServerError("agent.conversations.rename", error, {
            conversationId: input.conversationId,
          });
        }
      }),
    delete: protectedProcedure
      .input(dashboardConversationDeleteInputSchema)
      .handler(async ({ input, context }) => {
        try {
          return z
            .object({
              deleted: z.boolean(),
              conversationId: z.string(),
            })
            .parse(
              await deleteDashboardConversation(context.session.user.id, input.conversationId),
            );
        } catch (error) {
          throw toInternalServerError("agent.conversations.delete", error, {
            conversationId: input.conversationId,
          });
        }
      }),
  },
};
