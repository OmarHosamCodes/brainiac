import {
  workspaceMarketplaceListSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
} from "@brainiac/workspace";

import { protectedProcedure } from "../../procedures";
import {
  getWorkspaceSnapshot,
  getWorkspaceMarketplaceItems,
  saveWorkspaceMarketplaceItem,
  saveWorkspaceNodes,
} from "./service";

export const workspaceRouter = {
  get: protectedProcedure.handler(async ({ context }) => {
    return getWorkspaceSnapshot(context.session.user.id);
  }),
  save: protectedProcedure.input(workspaceSaveInputSchema).handler(async ({ input, context }) => {
    return saveWorkspaceNodes(context.session.user.id, input.nodes);
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
