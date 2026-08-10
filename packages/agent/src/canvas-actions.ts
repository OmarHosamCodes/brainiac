import { z } from "zod";

const idSchema = z.string().trim().min(1).max(160);

/** Compact Canvas write intents. Executed only after human Approve. */
export const canvasActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("node.create"),
    title: z.string().trim().min(1).max(120),
    content: z.string().max(4000).optional(),
    x: z.number().finite().optional(),
    y: z.number().finite().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    tint: z.string().trim().min(1).max(40).optional(),
    overviewTabTitle: z.string().trim().min(1).max(80).optional(),
    visibility: z.enum(["private", "team"]).optional(),
    teamId: idSchema.nullable().optional(),
    agencyRef: z
      .object({
        teamId: idSchema,
        projectId: idSchema.optional(),
        taskId: idSchema.optional(),
      })
      .nullable()
      .optional(),
  }),
  z.object({
    type: z.literal("node.replace"),
    nodeId: idSchema,
    node: z.unknown(),
  }),
  z.object({
    type: z.literal("node.delete"),
    nodeId: idSchema,
  }),
  z.object({
    type: z.literal("tab.create"),
    nodeId: idSchema,
    title: z.string().trim().min(1).max(80).optional(),
  }),
  z.object({
    type: z.literal("tab.replace"),
    nodeId: idSchema,
    tabId: idSchema,
    tab: z.unknown(),
  }),
  z.object({
    type: z.literal("tab.delete"),
    nodeId: idSchema,
    tabId: idSchema,
  }),
  z.object({
    type: z.literal("block.create"),
    nodeId: idSchema,
    tabId: idSchema,
    blockType: z.string().trim().min(1).max(80),
    title: z.string().trim().min(1).max(120).optional(),
    content: z.string().max(8000).optional(),
    customTemplateId: idSchema.optional(),
  }),
  z.object({
    type: z.literal("block.patch"),
    nodeId: idSchema,
    tabId: idSchema,
    blockId: idSchema,
    operations: z.array(z.unknown()).min(1).max(50),
  }),
  z.object({
    type: z.literal("block.replace"),
    nodeId: idSchema,
    tabId: idSchema,
    blockId: idSchema,
    block: z.unknown(),
  }),
  z.object({
    type: z.literal("block.delete"),
    nodeId: idSchema,
    tabId: idSchema,
    blockId: idSchema,
  }),
]);

export type CanvasAction = z.infer<typeof canvasActionSchema>;

export const canvasPlanStepSchema = z.object({
  action: canvasActionSchema,
  label: z.string().trim().min(1).max(200),
});

export const canvasDraftPlanSchema = z.object({
  planId: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1_000),
  steps: z.array(canvasPlanStepSchema).min(1).max(20),
});

export type CanvasDraftPlan = z.infer<typeof canvasDraftPlanSchema>;

export const canvasProposalSnapshotSchema = z.object({
  proposalId: z.string().trim().min(1).max(160),
  status: z.enum(["pending", "approved", "rejected", "executed", "failed", "expired"]),
  action: canvasActionSchema,
  before: z.unknown(),
  after: z.unknown(),
  label: z.string().trim().min(1).max(200).optional(),
  note: z.string().optional(),
  boardHref: z.string().trim().min(1).max(400).optional(),
});

export type CanvasProposalSnapshot = z.infer<typeof canvasProposalSnapshotSchema>;

export function canvasActionLabel(action: CanvasAction): string {
  switch (action.type) {
    case "node.create":
      return `Create node “${action.title}”`;
    case "node.replace":
      return "Replace node";
    case "node.delete":
      return "Delete node";
    case "tab.create":
      return action.title ? `Create tab “${action.title}”` : "Create tab";
    case "tab.replace":
      return "Replace tab";
    case "tab.delete":
      return "Delete tab";
    case "block.create":
      return action.title
        ? `Create ${action.blockType} “${action.title}”`
        : `Create ${action.blockType} block`;
    case "block.patch":
      return "Patch block";
    case "block.replace":
      return "Replace block";
    case "block.delete":
      return "Delete block";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function canvasActionBoardTarget(action: CanvasAction): {
  nodeId?: string;
  tabId?: string;
  blockId?: string;
} {
  switch (action.type) {
    case "node.create":
      return {};
    case "node.replace":
    case "node.delete":
      return { nodeId: action.nodeId };
    case "tab.create":
      return { nodeId: action.nodeId };
    case "tab.replace":
    case "tab.delete":
      return { nodeId: action.nodeId, tabId: action.tabId };
    case "block.create":
      return { nodeId: action.nodeId, tabId: action.tabId };
    case "block.patch":
    case "block.replace":
    case "block.delete":
      return { nodeId: action.nodeId, tabId: action.tabId, blockId: action.blockId };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
