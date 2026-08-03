import { z } from "zod";

const idSchema = z.string().trim().min(1).max(160);

/** Compact Agency write intents. Executed only after human Approve. */
export const agencyActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("time_entry.create"),
    projectId: idSchema.optional(),
    taskId: idSchema.optional(),
    startAt: z.string().trim().min(1),
    endAt: z.string().trim().min(1),
    description: z.string().max(2000).optional(),
    tagIds: z.array(idSchema).max(20).optional(),
    isBillable: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("time_entry.update"),
    entryId: idSchema,
    projectId: idSchema.optional(),
    taskId: idSchema.nullable().optional(),
    startAt: z.string().trim().min(1).optional(),
    endAt: z.string().trim().min(1).optional(),
    description: z.string().max(2000).optional(),
    tagIds: z.array(idSchema).max(20).optional(),
    isBillable: z.boolean().optional(),
    isWaste: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("time_entry.delete"),
    entryId: idSchema,
  }),
  z.object({
    type: z.literal("timer.start"),
    projectId: idSchema.optional(),
    taskId: idSchema.optional(),
    description: z.string().max(2000).optional(),
    tagIds: z.array(idSchema).max(20).optional(),
    isBillable: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("timer.stop"),
  }),
  z.object({
    type: z.literal("timer.update"),
    description: z.string().max(2000).optional(),
    taskId: idSchema.nullable().optional(),
    startAt: z.string().trim().min(1).optional(),
  }),
  z.object({
    type: z.literal("project.create"),
    clientId: idSchema,
    name: z.string().trim().min(1).max(200),
  }),
  z.object({
    type: z.literal("project.update"),
    projectId: idSchema,
    name: z.string().trim().min(1).max(200).optional(),
    clientId: idSchema.optional(),
  }),
  z.object({
    type: z.literal("project.archive"),
    projectId: idSchema,
  }),
  z.object({
    type: z.literal("project.restore"),
    projectId: idSchema,
  }),
  z.object({
    type: z.literal("task.create"),
    projectId: idSchema,
    title: z.string().trim().min(1).max(200),
    description: z.string().max(4000).optional(),
  }),
  z.object({
    type: z.literal("task.update"),
    taskId: idSchema,
    title: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
  }),
  z.object({
    type: z.literal("task.delete"),
    taskId: idSchema,
  }),
  z.object({
    type: z.literal("tag.create"),
    name: z.string().trim().min(1).max(80),
  }),
  z.object({
    type: z.literal("tag.delete"),
    tagId: idSchema,
  }),
  z.object({
    type: z.literal("client.create"),
    name: z.string().trim().min(1).max(200),
    category: z.enum(["internal", "external"]).optional(),
  }),
  z.object({
    type: z.literal("client.update"),
    clientId: idSchema,
    name: z.string().trim().min(1).max(200).optional(),
  }),
  z.object({
    type: z.literal("client.archive"),
    clientId: idSchema,
  }),
]);

export type AgencyAction = z.infer<typeof agencyActionSchema>;

export const agencyPlanStepSchema = z.object({
  action: agencyActionSchema,
  label: z.string().trim().min(1).max(200),
});

export const agencyDraftPlanSchema = z.object({
  planId: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(1_000),
  steps: z.array(agencyPlanStepSchema).min(1).max(20),
});

export type AgencyDraftPlan = z.infer<typeof agencyDraftPlanSchema>;

export const agencyProposalSnapshotSchema = z.object({
  proposalId: z.string().trim().min(1).max(160),
  status: z.enum(["pending", "approved", "rejected", "executed", "failed", "expired"]),
  action: agencyActionSchema,
  before: z.unknown(),
  after: z.unknown(),
  label: z.string().trim().min(1).max(200).optional(),
  note: z.string().optional(),
});

export type AgencyProposalSnapshot = z.infer<typeof agencyProposalSnapshotSchema>;

export function agencyActionLabel(action: AgencyAction): string {
  switch (action.type) {
    case "time_entry.create":
      return "Create time entry";
    case "time_entry.update":
      return "Update time entry";
    case "time_entry.delete":
      return "Delete time entry";
    case "timer.start":
      return "Start timer";
    case "timer.stop":
      return "Stop timer";
    case "timer.update":
      return "Update timer";
    case "project.create":
      return `Create project “${action.name}”`;
    case "project.update":
      return "Update project";
    case "project.archive":
      return "Archive project";
    case "project.restore":
      return "Restore project";
    case "task.create":
      return `Create task “${action.title}”`;
    case "task.update":
      return "Update task";
    case "task.delete":
      return "Delete task";
    case "tag.create":
      return `Create tag “${action.name}”`;
    case "tag.delete":
      return "Delete tag";
    case "client.create":
      return `Create client “${action.name}”`;
    case "client.update":
      return "Update client";
    case "client.archive":
      return "Archive client";
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
