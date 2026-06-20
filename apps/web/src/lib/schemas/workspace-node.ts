import {
  workspaceNodeDashboardFeaturedBlockSchema,
  workspaceNodeTintSchema,
  workspaceNodeTypeSchema,
} from "@brainiac/workspace";
import { z } from "zod";

export const workspaceNodeEditorFormSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string(),
  nodeType: workspaceNodeTypeSchema,
  tint: workspaceNodeTintSchema,
  featuredBlocks: z.array(workspaceNodeDashboardFeaturedBlockSchema),
});

export type WorkspaceNodeEditorFormValues = z.infer<typeof workspaceNodeEditorFormSchema>;
