import {
  workspaceNodeVisibilitySchema,
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
} from "@brainiac/workspace";
import { z } from "zod";

import { getBillingStateForUser } from "../../billing-guard";
import { protectedProcedure, protectedProProcedure } from "../../procedures";
import {
  getWorkspaceSnapshot,
  getWorkspaceMarketplaceItems,
  deleteWorkspaceNode,
  shareWorkspaceNode,
  saveWorkspaceMarketplaceItem,
  saveWorkspaceNodes,
  unshareWorkspaceNode,
} from "./service";

const workspaceShareNodeInputSchema = z.object({
  nodeId: z.string().min(1),
  teamId: z.string().min(1),
});

const workspaceUnshareNodeInputSchema = z.object({
  nodeId: z.string().min(1),
});

const workspaceDeleteNodeInputSchema = z.object({
  nodeId: z.string().min(1),
  ownerUserId: z.string().min(1).optional(),
});

export const workspaceRouter = {
  get: protectedProcedure.handler(async ({ context }) => {
    return getWorkspaceSnapshot(context.session.user.id);
  }),
  save: protectedProcedure.input(workspaceSaveInputSchema).handler(async ({ input, context }) => {
    const billing = await getBillingStateForUser(context.session.user.id);

    if (input.nodes.length > billing.limits.workspaceNodes) {
      const { ORPCError } = await import("@orpc/server");
      throw new ORPCError("FORBIDDEN", {
        message: `Your ${billing.tier} plan allows up to ${billing.limits.workspaceNodes} workspace nodes`,
        data: { limit: billing.limits.workspaceNodes, current: input.nodes.length },
      });
    }

    return saveWorkspaceNodes(context.session.user.id, input.nodes);
  }),
  shareNode: protectedProcedure
    .input(workspaceShareNodeInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({
          nodeId: z.string().min(1),
          teamId: z.string().min(1),
          visibility: workspaceNodeVisibilitySchema,
        })
        .parse(await shareWorkspaceNode(context.session.user.id, input));
    }),
  unshareNode: protectedProcedure
    .input(workspaceUnshareNodeInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({
          nodeId: z.string().min(1),
          visibility: workspaceNodeVisibilitySchema,
        })
        .parse(await unshareWorkspaceNode(context.session.user.id, input));
    }),
  deleteNode: protectedProcedure
    .input(workspaceDeleteNodeInputSchema)
    .handler(async ({ context, input }) => {
      return z
        .object({
          nodeId: z.string().min(1),
          ownerUserId: z.string().min(1),
          deleted: z.boolean(),
        })
        .parse(await deleteWorkspaceNode(context.session.user.id, input));
    }),
  marketplace: {
    list: protectedProcedure
      .input(workspaceMarketplaceListInputSchema)
      .handler(async ({ input }) => {
        return getWorkspaceMarketplaceItems(input);
      }),
    save: protectedProProcedure
      .input(workspaceMarketplaceSaveInputSchema)
      .handler(async ({ input, context }) => {
        return saveWorkspaceMarketplaceItem(
          context.session.user.id,
          context.session.user.name,
          input,
        );
      }),
  },
};
