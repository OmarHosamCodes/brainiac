import { workspaceSaveInputSchema } from "@brainiac/workspace";

import { protectedProcedure } from "../../procedures";
import { getWorkspaceNodes, saveWorkspaceNodes } from "./service";

export const workspaceRouter = {
  get: protectedProcedure.handler(async ({ context }) => {
    return {
      nodes: await getWorkspaceNodes(context.session.user.id),
    };
  }),
  save: protectedProcedure
    .input(workspaceSaveInputSchema)
    .handler(async ({ input, context }) => {
      return saveWorkspaceNodes(context.session.user.id, input.nodes);
    }),
};
