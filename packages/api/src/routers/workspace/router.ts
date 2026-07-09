import { workspaceNodeVisibilitySchema } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { z } from "zod";

import { getBillingStateForUser } from "../../billing-guard";
import { protectedProcedure, protectedProProcedure } from "../../procedures";
import {
  workspaceDeleteNodeInputSchema,
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
  workspaceShareNodeInputSchema,
  workspaceUnshareNodeInputSchema,
} from "./schemas";
import {
  deleteWorkspaceNode,
  getWorkspaceMarketplaceItems,
  getWorkspaceSnapshot,
  saveWorkspaceMarketplaceItem,
  saveWorkspaceNodes,
  shareWorkspaceNode,
  unshareWorkspaceNode,
} from "./service";

export const workspaceRouter = {
  get: protectedProcedure.handler(async ({ context }) =>
    getWorkspaceSnapshot(context.session.user.id),
  ),
  save: protectedProcedure.input(workspaceSaveInputSchema).handler(async ({ input, context }) => {
    const billing = await getBillingStateForUser(context.session.user.id);
    if (input.nodes.length > billing.limits.workspaceNodes) {
      throw new ORPCError("FORBIDDEN", {
        message: `Your ${billing.tier} plan allows up to ${billing.limits.workspaceNodes} workspace nodes`,
        data: { limit: billing.limits.workspaceNodes, current: input.nodes.length },
      });
    }
    return saveWorkspaceNodes(context.session.user.id, input.nodes);
  }),
  shareNode: protectedProcedure
    .input(workspaceShareNodeInputSchema)
    .handler(async ({ context, input }) =>
      z
        .object({
          nodeId: z.string().min(1),
          teamId: z.string().min(1),
          visibility: workspaceNodeVisibilitySchema,
        })
        .parse(await shareWorkspaceNode(context.session.user.id, input)),
    ),
  unshareNode: protectedProcedure
    .input(workspaceUnshareNodeInputSchema)
    .handler(async ({ context, input }) =>
      z
        .object({ nodeId: z.string().min(1), visibility: workspaceNodeVisibilitySchema })
        .parse(await unshareWorkspaceNode(context.session.user.id, input)),
    ),
  deleteNode: protectedProcedure
    .input(workspaceDeleteNodeInputSchema)
    .handler(async ({ context, input }) =>
      z
        .object({ nodeId: z.string().min(1), ownerUserId: z.string().min(1), deleted: z.boolean() })
        .parse(await deleteWorkspaceNode(context.session.user.id, input)),
    ),
  marketplace: {
    list: protectedProcedure
      .input(workspaceMarketplaceListInputSchema)
      .handler(async ({ input }) => getWorkspaceMarketplaceItems(input)),
    save: protectedProProcedure
      .input(workspaceMarketplaceSaveInputSchema)
      .handler(async ({ input, context }) =>
        saveWorkspaceMarketplaceItem(context.session.user.id, context.session.user.name, input),
      ),
  },
};
