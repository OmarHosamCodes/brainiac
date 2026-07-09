import {
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
} from "@brainiac/workspace";
import { z } from "zod";

export const workspaceShareNodeInputSchema = z.object({
  nodeId: z.string().min(1),
  teamId: z.string().min(1),
});

export const workspaceUnshareNodeInputSchema = z.object({
  nodeId: z.string().min(1),
});

export const workspaceDeleteNodeInputSchema = z.object({
  nodeId: z.string().min(1),
  ownerUserId: z.string().min(1).optional(),
});

export {
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
};
