import {
  canvasNativeObjectTypeSchema,
  knowledgeObjectTypeSchema,
  knowledgeRelationTypeSchema,
  knowledgeTargetSchema,
  isAgencyObjectType,
} from "@orch/workspace";
import { z } from "zod";

const idSchema = z.string().trim().min(1).max(160);

export const knowledgeActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("object.create"),
    id: idSchema.optional(),
    objectType: canvasNativeObjectTypeSchema,
    title: z.string().trim().min(1).max(120),
    properties: z.record(z.string(), z.unknown()).optional(),
    visibility: z.enum(["private", "team"]).optional(),
    teamId: idSchema.nullable().optional(),
    about: knowledgeTargetSchema.optional(),
    placement: z
      .object({
        x: z.number().finite(),
        y: z.number().finite(),
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
      })
      .optional(),
  }),
  z
    .object({
      type: z.literal("object.update"),
      objectId: idSchema,
      objectType: knowledgeObjectTypeSchema.optional(),
      title: z.string().trim().min(1).max(120).optional(),
      properties: z.record(z.string(), z.unknown()).optional(),
      visibility: z.enum(["private", "team"]).optional(),
      teamId: idSchema.nullable().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.objectType && isAgencyObjectType(value.objectType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot update Agency records from knowledge actions.",
        });
      }
      if (
        value.title === undefined &&
        value.properties === undefined &&
        value.visibility === undefined &&
        value.teamId === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "object.update requires a field to change.",
        });
      }
    }),
  z
    .object({
      type: z.literal("object.delete"),
      objectId: idSchema,
      objectType: knowledgeObjectTypeSchema.optional(),
    })
    .superRefine((value, ctx) => {
      if (value.objectType && isAgencyObjectType(value.objectType)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cannot delete Agency records from knowledge actions.",
        });
      }
    }),
  z.object({
    type: z.literal("relation.create"),
    fromObjectId: idSchema,
    to: knowledgeTargetSchema,
    relationType: knowledgeRelationTypeSchema.default("about"),
  }),
  z.object({
    type: z.literal("relation.delete"),
    relationId: idSchema,
  }),
  z
    .object({
      type: z.literal("placement.upsert"),
      objectId: idSchema,
      objectType: knowledgeObjectTypeSchema.optional(),
      teamId: idSchema.nullable().optional(),
      x: z.number().finite(),
      y: z.number().finite(),
      width: z.number().positive().optional(),
      height: z.number().positive().optional(),
    })
    .superRefine((value, ctx) => {
      if (value.objectType && isAgencyObjectType(value.objectType) && !value.teamId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["teamId"],
          message: "Agency pins require teamId.",
        });
      }
    }),
]);

export type KnowledgeAction = z.infer<typeof knowledgeActionSchema>;

export const knowledgePlanStepSchema = z.object({
  action: knowledgeActionSchema,
  label: z.string().trim().min(1).max(200),
});

export const knowledgeDraftPlanSchema = z.object({
  planId: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1_000),
  steps: z.array(knowledgePlanStepSchema).min(1).max(20),
});

export const knowledgeProposalSnapshotSchema = z.object({
  proposalId: z.string().trim().min(1).max(160),
  status: z.enum(["pending", "approved", "rejected", "executed", "failed", "expired"]),
  action: knowledgeActionSchema,
  before: z.unknown(),
  after: z.unknown(),
  label: z.string().trim().min(1).max(200).optional(),
  note: z.string().optional(),
  boardHref: z.string().trim().min(1).max(400).optional(),
});

export function knowledgeActionLabel(action: KnowledgeAction): string {
  switch (action.type) {
    case "object.create":
      return `Remember ${action.objectType} “${action.title}”`;
    case "object.update":
      return "Update knowledge object";
    case "object.delete":
      return "Delete knowledge object";
    case "relation.create":
      return `Link ${action.relationType} ${action.to.objectType}`;
    case "relation.delete":
      return "Remove knowledge link";
    case "placement.upsert":
      return "Place on canvas";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
