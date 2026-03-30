import {
  workspaceNodeVisibilitySchema,
  workspaceMarketplaceListSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
} from "@brainiac/workspace";
import { z } from "zod";

import { protectedProcedure } from "../../procedures";
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
    list: protectedProcedure.handler(async () => {
      return workspaceMarketplaceListSchema.parse({
        items: await getWorkspaceMarketplaceItems(),
      });
    }),
    save: protectedProcedure
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
