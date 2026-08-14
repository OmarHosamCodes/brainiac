import { tool } from "@openrouter/sdk/lib/tool";
import {
  createWorkspaceId,
  knowledgeObjectTypeSchema,
  knowledgeObjectViewSchema,
  knowledgeTargetSchema,
} from "@orch/workspace";
import { z } from "zod";

import {
  knowledgeActionLabel,
  knowledgeActionSchema,
  knowledgeDraftPlanSchema,
} from "./knowledge-actions";
import type { CanvasAgentRuntime, DashboardAgentToolPreset } from "./types";

function buildKnowledgeQueryTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "query_knowledge",
    description:
      "Query the team brain: canvas notes/decisions plus live Agency projects, tasks, members, clients, and time entries. Use about: { objectType, id } to find what we know about a project or task. Never invent Agency ids.",
    inputSchema: z.object({
      teamId: z.string().trim().min(1).optional(),
      objectType: knowledgeObjectTypeSchema.optional(),
      query: z.string().trim().min(1).optional(),
      about: knowledgeTargetSchema.optional(),
      limit: z.number().int().min(1).max(50).optional(),
    }),
    outputSchema: z.object({ items: z.array(knowledgeObjectViewSchema) }),
    execute: async (input) => {
      if (!runtime.queryKnowledge) return { items: [] };
      return runtime.queryKnowledge(input);
    },
  });
}

function buildKnowledgeGetTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "get_knowledge_object",
    description:
      "Read one knowledge object or live Agency record. Include inbound relations so you can answer what we decided about a project.",
    inputSchema: z.object({
      id: z.string().trim().min(1),
      objectType: knowledgeObjectTypeSchema.optional(),
      teamId: z.string().trim().min(1).optional(),
    }),
    outputSchema: z.unknown(),
    execute: async (input) => {
      if (!runtime.getKnowledge) return { missing: true };
      return runtime.getKnowledge(input);
    },
  });
}

function buildKnowledgePlanTool() {
  return tool({
    name: "draft_knowledge_plan",
    description:
      "Draft a multi-step knowledge plan (notes, decisions, links to Agency). Does not write. User must Confirm.",
    inputSchema: z.object({
      title: z.string().trim().min(1).max(160),
      summary: z.string().trim().min(1).max(1_000),
      steps: z
        .array(
          z.object({
            label: z.string().trim().min(1).max(200),
            action: knowledgeActionSchema,
          }),
        )
        .min(1)
        .max(20),
    }),
    outputSchema: knowledgeDraftPlanSchema,
    execute: async ({ title, summary, steps }) =>
      knowledgeDraftPlanSchema.parse({
        planId: createWorkspaceId("kplan"),
        title,
        summary,
        steps,
      }),
  });
}

function buildKnowledgeProposeTool(runtime: CanvasAgentRuntime) {
  return tool({
    name: "propose_knowledge_action",
    description:
      "Propose one knowledge write (object.create/update/delete, relation.create/delete, placement.upsert). Does not apply. Cannot create or edit Agency projects/tasks/time. Link with about. Then ui_present and ask Approve.",
    inputSchema: z.object({
      action: knowledgeActionSchema,
      label: z.string().trim().min(1).max(200).optional(),
    }),
    outputSchema: z.object({
      proposalId: z.string(),
      status: z.literal("pending"),
      action: knowledgeActionSchema,
      before: z.unknown(),
      after: z.unknown(),
      label: z.string(),
      note: z.string(),
      boardHref: z.string().nullable(),
    }),
    execute: async ({ action, label }) => {
      const parsed = knowledgeActionSchema.parse(action);
      if (!runtime.createKnowledgeProposal) {
        throw new Error("Knowledge proposals are unavailable.");
      }
      const proposal = await runtime.createKnowledgeProposal({
        action: parsed,
        label: label ?? knowledgeActionLabel(parsed),
      });
      return {
        ...proposal,
        action: knowledgeActionSchema.parse(proposal.action),
        boardHref: proposal.boardHref ?? "/canvas",
        note: "Pending approval. Call ui_present, then tell the user to Approve or Reject.",
      };
    },
  });
}

export function buildKnowledgeTools(runtime: CanvasAgentRuntime, preset: DashboardAgentToolPreset) {
  const reads = [buildKnowledgeQueryTool(runtime), buildKnowledgeGetTool(runtime)];
  switch (preset) {
    case "ask":
      return reads;
    case "plan":
      return [...reads, buildKnowledgePlanTool()];
    case "agent":
      return [...reads, buildKnowledgeProposeTool(runtime)];
    default: {
      const _exhaustive: never = preset;
      return _exhaustive;
    }
  }
}
