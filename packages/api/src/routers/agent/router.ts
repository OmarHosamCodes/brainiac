import { z } from "zod";

import { protectedProcedure } from "../../procedures";
import { toInternalServerError } from "../../dev-errors";
import { approveAgencyProposal, confirmAgentPlan, rejectAgencyProposal } from "./agency-proposals";
import {
  agentChatTurnInputSchema,
  agentChatTurnResponseSchema,
  agentChatTurnStreamEventSchema,
  agentToolCatalogInputSchema,
  agentToolCatalogResponseSchema,
  dashboardConversationDeleteInputSchema,
  dashboardConversationDetailSchema,
  dashboardConversationGetInputSchema,
  dashboardConversationListResponseSchema,
  dashboardConversationRenameInputSchema,
  openRouterAccountStatusSchema,
  openRouterModelCatalogResponseSchema,
  openRouterFreeModelsResponseSchema,
  getOpenRouterAccountStatus,
  listOpenRouterModels,
  listOpenRouterFreeModels,
} from "./schemas";
import {
  composerDraftConversationInputSchema,
  composerDraftRecordSchema,
  composerDraftUpsertInputSchema,
} from "./composer-draft";
import {
  discardComposerDraft,
  getComposerDraft,
  upsertComposerDraft,
} from "./composer-draft-service";
import {
  appendDashboardConversationTurn,
  assertCanCreateDashboardConversation,
  deleteDashboardConversation,
  getAgentToolsCatalog,
  getDashboardConversation,
  listDashboardConversations,
  renameDashboardConversation,
  streamDashboardConversationTurn,
} from "./service";

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
  tools: {
    catalog: protectedProcedure
      .input(agentToolCatalogInputSchema)
      .handler(async ({ input, context }) => {
        try {
          return agentToolCatalogResponseSchema.parse(
            getAgentToolsCatalog(context.session.user.id, input),
          );
        } catch (error) {
          throw toInternalServerError("agent.tools.catalog", error, {
            surface: input.surface,
            mode: input.mode,
          });
        }
      }),
  },
  proposals: {
    confirmPlan: protectedProcedure
      .input(
        z.object({
          teamId: z.string().min(1).optional(),
          domain: z.enum(["agency", "canvas"]).optional(),
          conversationId: z.string().min(1).optional(),
          plan: z.object({
            planId: z.string().min(1),
            title: z.string().min(1),
            summary: z.string().min(1),
            steps: z
              .array(z.object({ label: z.string().min(1), action: z.unknown() }))
              .min(1)
              .max(20),
          }),
        }),
      )
      .handler(async ({ input, context }) => {
        try {
          return z
            .object({
              planId: z.string(),
              proposals: z.array(
                z.object({
                  proposalId: z.string(),
                  status: z.literal("pending"),
                  action: z.unknown(),
                  before: z.unknown(),
                  after: z.unknown(),
                  label: z.string(),
                  boardHref: z.string().optional(),
                }),
              ),
            })
            .parse(await confirmAgentPlan(context.session.user.id, input));
        } catch (error) {
          throw toInternalServerError("agent.proposals.confirmPlan", error, {
            teamId: input.teamId ?? null,
            domain: input.domain ?? "agency",
          });
        }
      }),
    approve: protectedProcedure
      .input(
        z.object({
          teamId: z.string().min(1).optional(),
          proposalId: z.string().min(1),
        }),
      )
      .handler(async ({ input, context }) => {
        try {
          return z
            .object({
              proposalId: z.string(),
              status: z.literal("executed"),
              result: z.unknown(),
              label: z.string(),
              workspaceSnapshot: z
                .object({
                  nodes: z.array(z.unknown()),
                  updatedAt: z.string().nullable(),
                })
                .optional(),
            })
            .parse(await approveAgencyProposal(context.session.user.id, input));
        } catch (error) {
          throw toInternalServerError("agent.proposals.approve", error, {
            proposalId: input.proposalId,
          });
        }
      }),
    reject: protectedProcedure
      .input(
        z.object({
          teamId: z.string().min(1).optional(),
          proposalId: z.string().min(1),
        }),
      )
      .handler(async ({ input, context }) => {
        try {
          return z
            .object({
              proposalId: z.string(),
              status: z.literal("rejected"),
            })
            .parse(await rejectAgencyProposal(context.session.user.id, input));
        } catch (error) {
          throw toInternalServerError("agent.proposals.reject", error, {
            proposalId: input.proposalId,
          });
        }
      }),
  },
  chat: {
    turn: protectedProcedure.input(agentChatTurnInputSchema).handler(async ({ input, context }) => {
      try {
        if (!input.conversationId) {
          await assertCanCreateDashboardConversation(context.session.user.id, {});
        }

        return agentChatTurnResponseSchema.parse(
          await appendDashboardConversationTurn(context.session.user.id, {
            actorUserName: context.session.user.name,
            turn: input,
          }),
        );
      } catch (error) {
        throw toInternalServerError("agent.chat.turn", error, {
          conversationId: input.conversationId ?? null,
          requestedNodesCount: input.nodes?.length,
          workspaceSource: input.nodes ? "request" : "database",
          requestedModel: input.model ?? null,
          toolPreset: input.toolPreset,
          surface: input.surface,
        });
      }
    }),
    turnStream: protectedProcedure.input(agentChatTurnInputSchema).handler(async function* ({
      input,
      context,
      signal,
    }) {
      try {
        if (!input.conversationId) {
          await assertCanCreateDashboardConversation(context.session.user.id, {});
        }

        for await (const event of streamDashboardConversationTurn(context.session.user.id, {
          actorUserName: context.session.user.name,
          turn: input,
          signal,
        })) {
          yield agentChatTurnStreamEventSchema.parse(event);
        }
      } catch (error) {
        throw toInternalServerError("agent.chat.turnStream", error, {
          conversationId: input.conversationId ?? null,
          requestedNodesCount: input.nodes?.length,
          workspaceSource: input.nodes ? "request" : "database",
          requestedModel: input.model ?? null,
          toolPreset: input.toolPreset,
          surface: input.surface,
        });
      }
    }),
  },
  conversations: {
    list: protectedProcedure.handler(async ({ context }) => {
      try {
        return dashboardConversationListResponseSchema.parse(
          await listDashboardConversations(context.session.user.id, {}),
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
            await getDashboardConversation(context.session.user.id, input),
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
            await renameDashboardConversation(context.session.user.id, input),
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
            .parse(await deleteDashboardConversation(context.session.user.id, input));
        } catch (error) {
          throw toInternalServerError("agent.conversations.delete", error, {
            conversationId: input.conversationId,
          });
        }
      }),
    draft: {
      get: protectedProcedure
        .input(composerDraftConversationInputSchema)
        .handler(async ({ input, context }) => {
          return z
            .object({ draft: composerDraftRecordSchema.nullable() })
            .parse(await getComposerDraft(context.session.user.id, input));
        }),
      upsert: protectedProcedure
        .input(composerDraftUpsertInputSchema)
        .handler(async ({ input, context }) => {
          return z
            .object({ draft: composerDraftRecordSchema.nullable() })
            .parse(await upsertComposerDraft(context.session.user.id, input));
        }),
      discard: protectedProcedure
        .input(composerDraftConversationInputSchema)
        .handler(async ({ input, context }) => {
          return z
            .object({ discarded: z.literal(true) })
            .parse(await discardComposerDraft(context.session.user.id, input));
        }),
    },
  },
};
