import { z } from "zod";

export const agencyProjectTaskStatusSchema = z.enum(["open", "in_progress", "done", "archived"]);

export const agencyProjectTaskKindSchema = z.enum([
  "standard",
  "journey_anchor",
  "journey_milestone",
]);

export const agencyJourneyStepKindSchema = z.enum([
  "start",
  "milestone",
  "checkpoint",
  "destination",
]);

export const agencyJourneyStepStatusSchema = z.enum(["planned", "active", "done", "blocked"]);

export const agencyTimeEntrySourceSchema = z.enum(["timer", "manual"]);

export const attachmentMediaKindSchema = z.enum([
  "image",
  "video",
  "audio",
  "document",
  "archive",
  "other",
  "link",
]);

export const attachmentMetadataSchema = z
  .object({
    imageWidth: z.number().int().positive().optional(),
    imageHeight: z.number().int().positive().optional(),
    videoWidth: z.number().int().positive().optional(),
    videoHeight: z.number().int().positive().optional(),
    durationSeconds: z.number().nonnegative().optional(),
    fileExtension: z.string().optional(),
    lastModified: z.string().optional(),
    mediaKind: attachmentMediaKindSchema.optional(),
    sourceUrl: z.string().url().optional(),
  })
  .nullable()
  .optional();

export const agencyTaskThreadAttachmentInputSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  storageKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative().optional(),
  uploadToken: z.string().min(1),
  metadata: attachmentMetadataSchema,
});

export const agencyClientCategorySchema = z.enum(["internal", "external"]);

export const agencyClientSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  category: agencyClientCategorySchema,
  billableRateCents: z.number().int().nonnegative().nullable(),
  currency: z.string().min(1),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyProjectSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyProjectTaskMemberStatusSchema = z.enum(["open", "in_progress", "done"]);

export const agencyProjectTaskAssigneeSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
  status: agencyProjectTaskMemberStatusSchema,
});

export const agencyProjectTaskBlueprintSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
});

export const agencyProjectTaskSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  status: agencyProjectTaskStatusSchema,
  taskKind: agencyProjectTaskKindSchema,
  assignedToTeam: z.boolean(),
  isWaste: z.boolean(),
  createdByUserId: z.string().min(1),
  assignees: z.array(agencyProjectTaskAssigneeSchema),
  viewerStatus: agencyProjectTaskMemberStatusSchema.optional(),
  viewerCompletionCount: z.number().int().nonnegative().optional(),
  viewerBlueprints: z.array(agencyProjectTaskBlueprintSchema).optional(),
  totalTrackedSeconds: z.number().int().nonnegative().optional(),
  dueDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyProjectJourneyStepSchema = z.object({
  id: z.string().min(1),
  journeyId: z.string().min(1),
  sortOrder: z.number().int(),
  label: z.string().min(1),
  stepKind: agencyJourneyStepKindSchema,
  status: agencyJourneyStepStatusSchema,
  taskId: z.string().nullable(),
  task: agencyProjectTaskSchema.nullable().optional(),
  timeEntryCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyProjectJourneySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  steps: z.array(agencyProjectJourneyStepSchema),
  completedSteps: z.number().int().nonnegative(),
  totalSteps: z.number().int().nonnegative(),
});

export const createAgencyProjectWithJourneyMilestoneInputSchema = z.object({
  title: z.string().trim().min(1).max(240),
  assigneeUserIds: z.array(z.string().min(1)).default([]),
});

export const createAgencyProjectWithJourneyInputSchema = z.object({
  teamId: z.string().min(1),
  clientId: z.string().min(1),
  name: z.string().trim().min(1).max(160),
  milestones: z.array(createAgencyProjectWithJourneyMilestoneInputSchema).min(1),
});

export const createAgencyProjectWithJourneyOutputSchema = z.object({
  project: agencyProjectSchema,
  journey: agencyProjectJourneySchema,
});

export const updateAgencyProjectJourneyStepInputSchema = z.object({
  id: z.string().min(1),
  sortOrder: z.number().int().nonnegative().optional(),
  label: z.string().trim().min(1).max(240).optional(),
});

export const previewRemoveAgencyProjectJourneyStepOutputSchema = z.object({
  stepId: z.string().min(1),
  label: z.string().min(1),
  timeEntryCount: z.number().int().nonnegative(),
});

/** Case/whitespace-insensitive task title key (must match DB unique index expression). */
export function normalizeTaskTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** One check-off: bump count, stay/return open so the todo auto-reappears. */
export function applyMemberTaskCompletion(current: { completionCount: number }): {
  completionCount: number;
  status: "done";
} {
  return {
    completionCount: current.completionCount + 1,
    status: "done",
  };
}

export function formatTaskAssigneeLabel(task: {
  assignedToTeam: boolean;
  assignees: Array<{ userName: string }>;
}): string {
  if (task.assignedToTeam) return "Entire team";
  if (task.assignees.length === 0) return "Unassigned";
  return task.assignees.map((assignee) => assignee.userName).join(", ");
}

export function taskVisibleToAssignee(
  task: {
    assignedToTeam: boolean;
    assignees: Array<{ userId: string }>;
  },
  assigneeUserId: string,
): boolean {
  if (task.assignedToTeam) return true;
  return task.assignees.some((assignee) => assignee.userId === assigneeUserId);
}

export const agencyTaskMessageAttachmentSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  messageId: z.string().min(1),
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  storageKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  metadata: attachmentMetadataSchema,
  createdAt: z.string().datetime(),
  url: z.string().nullable(),
});

export const agencyTaskMessageSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  threadId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
  content: z.string(),
  type: z.enum(["text", "voice", "attachment"]),
  senderType: z.enum(["user", "agent"]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  attachments: z.array(agencyTaskMessageAttachmentSchema),
});

export const agencyTaskThreadMemberSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
});

export const agencyTimeEntrySchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().nullable(),
  taskTitle: z.string().nullable(),
  taskIsWaste: z.boolean().nullable(),
  projectName: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  source: agencyTimeEntrySourceSchema,
  description: z.string(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime(),
  durationSeconds: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const agencyActiveTimerSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1),
  projectId: z.string().min(1),
  taskId: z.string().nullable(),
  taskTitle: z.string().nullable(),
  projectName: z.string().min(1),
  description: z.string(),
  startedAt: z.string().datetime(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/** List/summary shapes used in work segment UI. */
export const agencyTaskProjectSchema = agencyProjectSchema.pick({
  id: true,
  clientId: true,
  clientName: true,
  name: true,
});

export type AgencyProjectTaskStatus = z.infer<typeof agencyProjectTaskStatusSchema>;
export type AgencyProjectTaskKind = z.infer<typeof agencyProjectTaskKindSchema>;
export type AgencyJourneyStepKind = z.infer<typeof agencyJourneyStepKindSchema>;
export type AgencyJourneyStepStatus = z.infer<typeof agencyJourneyStepStatusSchema>;
export type AgencyProjectTaskAssignee = z.infer<typeof agencyProjectTaskAssigneeSchema>;
export type AgencyClient = z.infer<typeof agencyClientSchema>;
export type AgencyProject = z.infer<typeof agencyProjectSchema>;
export type AgencyProjectTask = z.infer<typeof agencyProjectTaskSchema>;
export type AgencyProjectJourney = z.infer<typeof agencyProjectJourneySchema>;
export type AgencyProjectJourneyStep = z.infer<typeof agencyProjectJourneyStepSchema>;
export type CreateAgencyProjectWithJourneyInput = z.infer<
  typeof createAgencyProjectWithJourneyInputSchema
>;
export type CreateAgencyProjectWithJourneyOutput = z.infer<
  typeof createAgencyProjectWithJourneyOutputSchema
>;
export type AgencyTaskProject = z.infer<typeof agencyTaskProjectSchema>;
export type AgencyTaskMessage = z.infer<typeof agencyTaskMessageSchema>;

export const agencyTaskAgentAskResponseSchema = z.object({
  userMessage: agencyTaskMessageSchema,
  agentMessage: agencyTaskMessageSchema,
  model: z.string(),
  response: z.string(),
});

export type AgencyTaskAgentAskResponse = z.infer<typeof agencyTaskAgentAskResponseSchema>;
export type AgencyTaskMessageAttachment = z.infer<typeof agencyTaskMessageAttachmentSchema>;
export type AgencyTaskThreadMember = z.infer<typeof agencyTaskThreadMemberSchema>;
export type AgencyTimeEntry = z.infer<typeof agencyTimeEntrySchema>;
export type AgencyActiveTimer = z.infer<typeof agencyActiveTimerSchema>;
