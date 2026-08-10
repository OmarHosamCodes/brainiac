import { tool } from "@openrouter/sdk/lib/tool";
import { createWorkspaceId } from "@orch/workspace";
import { z } from "zod";

import { createAskAgencyQuestionTool } from "./agency-question";
import { canvasActionLabel, canvasActionSchema, canvasDraftPlanSchema } from "./canvas-actions";
import type { CanvasAgentRuntime, DashboardAgentToolPreset } from "./types";

function buildCanvasPlanTool() {
  return tool({
    name: "draft_canvas_plan",
    description:
      "Draft a multi-step Canvas change plan. Does not write data. User must Confirm in the UI to materialize proposals. Each step is { label, action } where action.type is node.create|replace|delete, tab.create|replace|delete, or block.create|patch|replace|delete.",
    inputSchema: z.object({
      title: z.string().trim().min(1).max(160),
      summary: z.string().trim().min(1).max(1_000),
      steps: z
        .array(
          z.object({
            label: z.string().trim().min(1).max(200),
            action: z.any(),
          }),
        )
        .min(1)
        .max(20),
    }),
    outputSchema: canvasDraftPlanSchema,
    execute: async ({ title, summary, steps }) =>
      canvasDraftPlanSchema.parse({
        planId: createWorkspaceId("cplan"),
        title,
        summary,
        steps,
      }),
  });
}

function buildCanvasProposeTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "propose_canvas_action",
    description:
      "Propose one Canvas write with before/after. Does not apply the write. Then call ui_present with kind workspaceBlock or workspaceNode to illustrate, and ask the user to Approve or Reject. action.type is node.*|tab.*|block.*.",
    inputSchema: z.object({
      action: z.any(),
      label: z.string().trim().min(1).max(200).optional(),
    }),
    outputSchema: z.object({
      proposalId: z.string(),
      status: z.literal("pending"),
      action: canvasActionSchema,
      before: z.unknown(),
      after: z.unknown(),
      label: z.string(),
      note: z.string(),
      boardHref: z.string().nullable(),
    }),
    execute: async ({ action, label }) => {
      const parsedAction = canvasActionSchema.parse(action);
      const proposal = await runtime.createProposal({
        action: parsedAction,
        label: label ?? canvasActionLabel(parsedAction),
      });
      return {
        ...proposal,
        action: canvasActionSchema.parse(proposal.action),
        boardHref: proposal.boardHref ?? null,
        note: "Pending approval. Call ui_present with a workspaceBlock or workspaceNode illustration, then tell the user to Approve or Reject.",
      };
    },
  });
}

export function buildCanvasWriteTools(
  runtime: CanvasAgentRuntime,
  preset: DashboardAgentToolPreset,
) {
  switch (preset) {
    case "plan":
      return [createAskAgencyQuestionTool(), buildCanvasPlanTool()];
    case "agent":
      return [createAskAgencyQuestionTool(), buildCanvasProposeTool(runtime)];
    case "ask":
      return [];
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}
