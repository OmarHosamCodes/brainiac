import {
  workspaceMarketplaceItemSchema,
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceListOutputSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceNodeSchema,
  workspaceNodeVisibilitySchema,
  workspaceSaveInputSchema,
} from "@orch/workspace";
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

export const workspaceSnapshotOutputSchema = z.object({
  nodes: z.array(workspaceNodeSchema),
  updatedAt: z.string().datetime().nullable(),
});

export const workspaceSaveOutputSchema = z.object({
  nodeCount: z.number().int().nonnegative(),
  savedAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const workspaceShareNodeOutputSchema = z.object({
  nodeId: z.string().min(1),
  teamId: z.string().min(1),
  visibility: workspaceNodeVisibilitySchema,
});

export const workspaceUnshareNodeOutputSchema = z.object({
  nodeId: z.string().min(1),
  visibility: workspaceNodeVisibilitySchema,
});

export const workspaceDeleteNodeOutputSchema = z.object({
  nodeId: z.string().min(1),
  ownerUserId: z.string().min(1),
  deleted: z.boolean(),
});

export {
  workspaceMarketplaceListInputSchema,
  workspaceMarketplaceListOutputSchema,
  workspaceMarketplaceItemSchema,
  workspaceMarketplaceSaveInputSchema,
  workspaceSaveInputSchema,
};
