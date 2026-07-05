import { z } from "zod";

import { protectedProProcedure } from "../../procedures";
import { agencyLiveEventSchema, agencyLivePublisher } from "./live";
import {
  archiveAgencyClient,
  createAgencyClient,
  createAgencyProject,
  createAgencyProjectWithJourney,
  createAgencyProjectTask,
  completeAgencyProjectTaskForMember,
  createInvoice,
  createManualAgencyTimeEntry,
  createTaskAttachmentPresignedUrl,
  createTaskLinkAttachment,
  createTaskThreadMessage,
  deleteAgencyProjectTask,
  deleteMyAgencyTimeEntry,
  deleteTaskAttachment,
  exportAgencyReportsCsv,
  getAgencyActiveTimer,
  getAgencyProjectJourney,
  listAgencyActiveMembers,
  getAgencyDashboardSummary,
  getAgencyReportsSummary,
  getAgencyTimeSummary,
  getClientContact,
  getInvoiceSummary,
  getTaskThreadContext,
  listAgencyClients,
  listAgencyProjects,
  addAgencyProjectJourneyStep,
  previewRemoveAgencyProjectJourneyStep,
  removeAgencyProjectJourneyStep,
  updateAgencyProjectJourneySteps,
  listAgencyProjectTasks,
  listAllAgencyTimeEntries,
  listInvoices,
  listMemberCapacity,
  listMemberRates,
  listMyAgencyTimeEntries,
  listRecentTaskThreadMessages,
  listTaskThreadMembers,
  listTaskThreadMessages,
  requireTeamMembership,
  setMemberCapacity,
  startAgencyTimer,
  stopAgencyTimer,
  unarchiveAgencyClient,
  updateAgencyClient,
  updateAgencyProject,
  updateAgencyProjectTask,
  updateAgencyProjectTaskBlueprint,
  updateAnyAgencyTimeEntry,
  updateInvoiceStatus,
  updateMyAgencyTimeEntry,
  upsertClientContact,
  upsertMemberRate,
} from "./service";
import { askTaskAgent } from "./task-agent";
import {
  deleteTenureExemption,
  getTenureMember,
  getTenurePolicy,
  listTenureExemptions,
  listTenureProfiles,
  listTenureSummary,
  upsertTenureExemption,
  upsertTenurePolicy,
  upsertTenureProfile,
} from "./tenure-service";

const agencyTimeEntrySourceSchema = z.enum(["timer", "manual"]);

const teamScopedInputSchema = z.object({
  teamId: z.string().min(1),
});

const agencyClientSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  name: z.string().min(1),
  archivedAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyProjectSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  clientId: z.string().min(1),
  clientName: z.string().min(1),
  name: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyProjectTaskBlueprintSchema = z.object({
  id: z.string().min(1),
  description: z.string(),
});

const agencyProjectTaskSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  projectId: z.string().min(1),
  title: z.string().min(1),
  status: z.enum(["open", "in_progress", "done", "archived"]),
  taskKind: z.enum(["standard", "journey_anchor", "journey_milestone"]),
  assignedToTeam: z.boolean(),
  isWaste: z.boolean(),
  assignees: z.array(
    z.object({
      userId: z.string().min(1),
      userName: z.string().min(1),
      userAvatar: z.string().nullable(),
      status: z.enum(["open", "in_progress", "done"]),
    }),
  ),
  viewerStatus: z.enum(["open", "in_progress", "done"]).optional(),
  viewerCompletionCount: z.number().int().nonnegative().optional(),
  viewerBlueprints: z.array(agencyProjectTaskBlueprintSchema).optional(),
  dueDate: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyProjectJourneyStepSchema = z.object({
  id: z.string().min(1),
  journeyId: z.string().min(1),
  sortOrder: z.number().int(),
  label: z.string().min(1),
  stepKind: z.enum(["start", "milestone", "checkpoint", "destination"]),
  status: z.enum(["planned", "active", "done", "blocked"]),
  taskId: z.string().nullable(),
  task: agencyProjectTaskSchema.nullable().optional(),
  timeEntryCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

const agencyProjectJourneySchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  steps: z.array(agencyProjectJourneyStepSchema),
  completedSteps: z.number().int().nonnegative(),
  totalSteps: z.number().int().nonnegative(),
});

const attachmentMetadataSchema = z
  .object({
    imageWidth: z.number().int().positive().optional(),
    imageHeight: z.number().int().positive().optional(),
    videoWidth: z.number().int().positive().optional(),
    videoHeight: z.number().int().positive().optional(),
    durationSeconds: z.number().nonnegative().optional(),
    fileExtension: z.string().optional(),
    lastModified: z.string().optional(),
    mediaKind: z
      .enum(["image", "video", "audio", "document", "archive", "other", "link"])
      .optional(),
    sourceUrl: z.string().url().optional(),
  })
  .nullable()
  .optional();

const agencyTaskThreadAttachmentInputSchema = z.object({
  fileName: z.string().min(1),
  mimeType: z.string().min(1),
  storageKey: z.string().min(1),
  sizeBytes: z.number().int().nonnegative(),
  durationSeconds: z.number().int().nonnegative().optional(),
  uploadToken: z.string().min(1),
  metadata: attachmentMetadataSchema,
});

const agencyTaskMessageAttachmentSchema = z.object({
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

const agencyTaskMessageSchema = z.object({
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

const agencyTaskAgentAskResponseSchema = z.object({
  userMessage: agencyTaskMessageSchema,
  agentMessage: agencyTaskMessageSchema,
  model: z.string(),
  response: z.string(),
});

const agencyTaskThreadMemberSchema = z.object({
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
});

const agencyTimeEntrySchema = z.object({
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

const agencyActiveTimerSchema = z.object({
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

const reportsSummarySchema = z.object({
  totalHours: z.number().nonnegative(),
  totalEntries: z.number().int().nonnegative(),
  timeDistributionByClient: z.array(
    z.object({
      clientId: z.string().min(1),
      clientName: z.string().min(1),
      hours: z.number().nonnegative(),
    }),
  ),
  timeDistributionByProject: z.array(
    z.object({
      projectId: z.string().min(1),
      projectName: z.string().min(1),
      clientId: z.string().min(1),
      clientName: z.string().min(1),
      hours: z.number().nonnegative(),
    }),
  ),
  teamActivity: z.array(
    z.object({
      userId: z.string().min(1),
      userName: z.string().min(1),
      userEmail: z.email(),
      hours: z.number().nonnegative(),
    }),
  ),
});

const reportsDashboardSummarySchema = reportsSummarySchema.extend({
  totalSeconds: z.number().int().nonnegative(),
  activeTimerCount: z.number().int().nonnegative(),
  topClient: z
    .object({
      clientId: z.string().min(1),
      clientName: z.string().min(1),
      seconds: z.number().int().nonnegative(),
    })
    .nullable(),
  topProject: z
    .object({
      projectId: z.string().min(1),
      projectName: z.string().min(1),
      clientId: z.string().min(1),
      clientName: z.string().min(1),
      seconds: z.number().int().nonnegative(),
    })
    .nullable(),
  dailyBuckets: z.array(
    z.object({
      date: z.string().min(1),
      totalSeconds: z.number().int().nonnegative(),
      segments: z.array(
        z.object({
          projectId: z.string().min(1),
          projectName: z.string().min(1),
          clientName: z.string().min(1),
          seconds: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
  teamMembers: z.array(
    z.object({
      userId: z.string().min(1),
      userName: z.string().min(1),
      userEmail: z.email(),
      avatar: z.string().nullable(),
      isActive: z.boolean(),
      totalSeconds: z.number().int().nonnegative(),
      latestEntry: z
        .object({
          projectName: z.string().min(1),
          clientName: z.string().min(1),
          description: z.string(),
          startedAt: z.string().datetime(),
        })
        .nullable(),
      projectBreakdown: z.array(
        z.object({
          projectId: z.string().min(1),
          projectName: z.string().min(1),
          clientName: z.string().min(1),
          seconds: z.number().int().nonnegative(),
        }),
      ),
    }),
  ),
});

const reportsInputSchema = teamScopedInputSchema.extend({
  from: z.string().datetime(),
  to: z.string().datetime(),
  clientId: z.string().min(1).optional(),
  projectId: z.string().min(1).optional(),
  memberUserId: z.string().min(1).optional(),
});

const timeSummarySchema = z.object({
  totalSeconds: z.number().int().nonnegative(),
  activeCount: z.number().int().nonnegative(),
  teamMembers: z.array(
    z.object({
      id: z.string().min(1),
      avatar: z.string().nullable(),
      name: z.string(),
      email: z.email(),
      isActive: z.boolean(),
      totalSeconds: z.number().int().nonnegative(),
      latestEntry: z
        .object({
          projectName: z.string(),
          description: z.string(),
        })
        .nullable(),
    }),
  ),
});

export const agencyOpsRouter = {
  live: {
    subscribe: protectedProProcedure.input(teamScopedInputSchema).handler(async function* ({
      context,
      input,
      signal,
    }) {
      await requireTeamMembership(context.session.user.id, input.teamId, "viewer");
      for await (const event of agencyLivePublisher.subscribe(input.teamId, signal)) {
        yield agencyLiveEventSchema.parse(event);
      }
    }),
  },
  clients: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          includeArchived: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ items: z.array(agencyClientSchema) })
          .parse(await listAgencyClients(context.session.user.id, input));
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          name: z.string().trim().min(1).max(120),
        }),
      )
      .handler(async ({ context, input }) => {
        const client = agencyClientSchema.parse(
          await createAgencyClient(context.session.user.id, input),
        );
        return client;
      }),
    update: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          name: z.string().trim().min(1).max(120).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const client = agencyClientSchema.parse(
          await updateAgencyClient(context.session.user.id, input),
        );
        return client;
      }),
    archive: protectedProProcedure
      .input(teamScopedInputSchema.extend({ clientId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const result = z
          .object({ clientId: z.string().min(1), archived: z.boolean() })
          .parse(await archiveAgencyClient(context.session.user.id, input));
        return result;
      }),
    unarchive: protectedProProcedure
      .input(teamScopedInputSchema.extend({ clientId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const result = z
          .object({ clientId: z.string().min(1), archived: z.boolean() })
          .parse(await unarchiveAgencyClient(context.session.user.id, input));
        const clients = await listAgencyClients(context.session.user.id, {
          teamId: input.teamId,
        });
        const client = clients.items.find((item) => item.id === result.clientId);
        if (client) {
        }
        return result;
      }),
  },
  projects: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ items: z.array(agencyProjectSchema) })
          .parse(await listAgencyProjects(context.session.user.id, input));
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          name: z.string().trim().min(1).max(160),
        }),
      )
      .handler(async ({ context, input }) => {
        const project = agencyProjectSchema.parse(
          await createAgencyProject(context.session.user.id, input),
        );
        return project;
      }),
    createWithJourney: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          name: z.string().trim().min(1).max(160),
          milestones: z
            .array(
              z.object({
                title: z.string().trim().min(1).max(240),
                assigneeUserIds: z.array(z.string().min(1)).default([]),
              }),
            )
            .min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            project: agencyProjectSchema,
            journey: agencyProjectJourneySchema,
          })
          .parse(await createAgencyProjectWithJourney(context.session.user.id, input));
      }),
    journey: {
      get: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return agencyProjectJourneySchema.parse(
            await getAgencyProjectJourney(context.session.user.id, input),
          );
        }),
      updateSteps: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
            steps: z.array(
              z.object({
                id: z.string().min(1),
                sortOrder: z.number().int().nonnegative().optional(),
                label: z.string().trim().min(1).max(240).optional(),
              }),
            ),
          }),
        )
        .handler(async ({ context, input }) => {
          return agencyProjectJourneySchema.parse(
            await updateAgencyProjectJourneySteps(context.session.user.id, input),
          );
        }),
      addStep: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
            label: z.string().trim().min(1).max(240),
            assigneeUserIds: z.array(z.string().min(1)).optional(),
            sortOrder: z.number().int().nonnegative().optional(),
            stepKind: z.enum(["milestone", "checkpoint"]).optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return agencyProjectJourneySchema.parse(
            await addAgencyProjectJourneyStep(context.session.user.id, input),
          );
        }),
      removeStep: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
            stepId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return agencyProjectJourneySchema.parse(
            await removeAgencyProjectJourneyStep(context.session.user.id, input),
          );
        }),
      previewRemoveStep: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            projectId: z.string().min(1),
            stepId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              stepId: z.string().min(1),
              label: z.string().min(1),
              timeEntryCount: z.number().int().nonnegative(),
            })
            .parse(await previewRemoveAgencyProjectJourneyStep(context.session.user.id, input));
        }),
    },
    update: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1),
          clientId: z.string().min(1).optional(),
          name: z.string().trim().min(1).max(160).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const project = agencyProjectSchema.parse(
          await updateAgencyProject(context.session.user.id, input),
        );
        return project;
      }),
  },
  projectTasks: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1).optional(),
          status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
          statuses: z.array(z.enum(["open", "in_progress", "done", "archived"])).optional(),
          assigneeUserId: z.string().min(1).optional(),
          search: z.string().optional(),
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(agencyProjectTaskSchema),
            page: z.number().int().min(1),
            pageSize: z.number().int().min(1),
            total: z.number().int().nonnegative(),
          })
          .parse(await listAgencyProjectTasks(context.session.user.id, input));
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1),
          title: z.string().trim().min(1).max(240),
          status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
          assignedToTeam: z.boolean().optional(),
          assigneeUserIds: z.array(z.string().min(1)).optional(),
          dueDate: z.string().datetime().optional(),
          description: z.string().max(4000).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const task = agencyProjectTaskSchema.parse(
          await createAgencyProjectTask(context.session.user.id, input),
        );
        return task;
      }),
    update: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          taskId: z.string().min(1),
          title: z.string().trim().min(1).max(240).optional(),
          status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
          assignedToTeam: z.boolean().optional(),
          assigneeUserIds: z.array(z.string().min(1)).optional(),
          dueDate: z.string().datetime().nullable().optional(),
          isWaste: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const task = agencyProjectTaskSchema.parse(
          await updateAgencyProjectTask(context.session.user.id, input),
        );
        return task;
      }),
    delete: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          taskId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        const result = z
          .object({
            taskId: z.string().min(1),
            deleted: z.boolean(),
          })
          .parse(await deleteAgencyProjectTask(context.session.user.id, input));
        return result;
      }),
    completeForMember: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          taskId: z.string().min(1),
        }),
      )
      .handler(async ({ context, input }) => {
        const task = agencyProjectTaskSchema.parse(
          await completeAgencyProjectTaskForMember(context.session.user.id, input),
        );
        return task;
      }),
    updateBlueprint: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          blueprintId: z.string().min(1),
          description: z.string().max(4000),
        }),
      )
      .handler(async ({ context, input }) => {
        const blueprint = agencyProjectTaskBlueprintSchema.parse(
          await updateAgencyProjectTaskBlueprint(context.session.user.id, input),
        );
        return blueprint;
      }),
  },
  taskThreads: {
    messages: {
      list: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            taskId: z.string().min(1),
            page: z.number().int().min(1).optional(),
            pageSize: z.number().int().min(1).max(100).optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              items: z.array(agencyTaskMessageSchema),
              page: z.number().int().min(1),
              pageSize: z.number().int().min(1),
              total: z.number().int().nonnegative(),
            })
            .parse(await listTaskThreadMessages(context.session.user.id, input));
        }),
      create: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            taskId: z.string().min(1),
            content: z.string().max(10_000),
            type: z.enum(["text", "voice", "attachment"]).optional(),
            attachments: z.array(agencyTaskThreadAttachmentInputSchema).optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          const message = agencyTaskMessageSchema.parse(
            await createTaskThreadMessage(context.session.user.id, input),
          );
          return message;
        }),
    },
    attachments: {
      create: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            taskId: z.string().min(1),
            fileName: z.string().min(1).max(260),
            mimeType: z.string().min(1).max(120),
            sizeBytes: z.number().int().nonnegative(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              storageKey: z.string().min(1),
              publicUrl: z.string().min(1),
              uploadUrl: z.string().min(1),
              uploadToken: z.string().min(1),
            })
            .parse(await createTaskAttachmentPresignedUrl(context.session.user.id, input));
        }),
      createLink: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            taskId: z.string().min(1),
            url: z.string().trim().min(1).max(2048),
            label: z.string().trim().max(260).optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              storageKey: z.string().min(1),
              publicUrl: z.string().url(),
              fileName: z.string().min(1),
              mimeType: z.string().min(1),
              sizeBytes: z.number().int().nonnegative(),
              uploadToken: z.string().min(1),
              metadata: attachmentMetadataSchema,
            })
            .parse(await createTaskLinkAttachment(context.session.user.id, input));
        }),
      delete: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            attachmentId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              attachmentId: z.string().min(1),
              deleted: z.boolean(),
            })
            .parse(await deleteTaskAttachment(context.session.user.id, input));
        }),
    },
    members: {
      list: protectedProProcedure
        .input(teamScopedInputSchema)
        .handler(async ({ context, input }) => {
          return z
            .object({ items: z.array(agencyTaskThreadMemberSchema) })
            .parse(await listTaskThreadMembers(context.session.user.id, input));
        }),
    },
    context: {
      get: protectedProProcedure
        .input(teamScopedInputSchema.extend({ taskId: z.string().min(1) }))
        .handler(async ({ context, input }) => {
          return z
            .object({
              taskId: z.string().min(1),
              taskTitle: z.string().min(1),
              taskStatus: z.enum(["open", "in_progress", "done", "archived"]),
              projectId: z.string().min(1),
              projectName: z.string().min(1),
              clientId: z.string().min(1),
              clientName: z.string().min(1),
              assignedToTeam: z.boolean(),
              assignees: z.array(agencyTaskThreadMemberSchema),
              assigneeName: z.string().nullable(),
            })
            .parse(await getTaskThreadContext(context.session.user.id, input));
        }),
    },
    recentMessages: {
      list: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            taskId: z.string().min(1),
            limit: z.number().int().min(1).max(50).optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ items: z.array(agencyTaskMessageSchema) })
            .parse(await listRecentTaskThreadMessages(context.session.user.id, input));
        }),
    },
  },
  taskAgent: {
    ask: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          taskId: z.string().min(1),
          content: z.string().trim().min(1).max(10_000),
          model: z.string().trim().min(1).optional(),
          attachments: z.array(agencyTaskThreadAttachmentInputSchema).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return agencyTaskAgentAskResponseSchema.parse(
          await askTaskAgent(context.session.user.id, input),
        );
      }),
  },
  contacts: {
    get: protectedProProcedure
      .input(teamScopedInputSchema.extend({ clientId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const contactSchema = z
          .object({
            id: z.string().min(1),
            teamId: z.string().min(1),
            clientId: z.string().min(1),
            name: z.string(),
            email: z.string(),
            phone: z.string(),
            createdAt: z.string().datetime(),
            updatedAt: z.string().datetime(),
          })
          .nullable();
        return contactSchema.parse(await getClientContact(context.session.user.id, input));
      }),
    upsert: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          name: z.string().trim().max(200).optional(),
          email: z.string().trim().email().or(z.literal("")).optional(),
          phone: z.string().trim().max(50).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const contactSchema = z.object({
          id: z.string().min(1),
          teamId: z.string().min(1),
          clientId: z.string().min(1),
          name: z.string(),
          email: z.string(),
          phone: z.string(),
          createdAt: z.string().datetime(),
          updatedAt: z.string().datetime(),
        });
        const contact = contactSchema.parse(
          await upsertClientContact(context.session.user.id, input),
        );
        return contact;
      }),
  },
  timer: {
    getActive: protectedProProcedure
      .input(z.object({ teamId: z.string().min(1).optional() }))
      .handler(async ({ context, input }) => {
        return z
          .object({ timer: agencyActiveTimerSchema.nullable() })
          .parse(await getAgencyActiveTimer(context.session.user.id, input));
      }),
    listActiveMembers: protectedProProcedure
      .input(teamScopedInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(
              z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userAvatar: z.string().nullable(),
                projectName: z.string().min(1),
                description: z.string(),
                startedAt: z.string().datetime(),
              }),
            ),
          })
          .parse(await listAgencyActiveMembers(context.session.user.id, input));
      }),
    start: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1).optional(),
          taskId: z.string().min(1).optional(),
          description: z.string().max(2_000).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const result = z
          .object({
            timer: agencyActiveTimerSchema.nullable(),
            createdEntry: agencyTimeEntrySchema.nullable(),
          })
          .parse(await startAgencyTimer(context.session.user.id, input));
        return result;
      }),
    stop: protectedProProcedure
      .input(
        z.object({
          teamId: z.string().min(1).optional(),
          taskId: z.string().min(1).optional(),
          description: z.string().max(2_000).optional(),
          discard: z.boolean().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const result = z
          .object({
            timer: agencyActiveTimerSchema.nullable(),
            createdEntry: agencyTimeEntrySchema.nullable(),
          })
          .parse(await stopAgencyTimer(context.session.user.id, input));
        const teamId = input.teamId ?? result.createdEntry?.teamId ?? result.timer?.teamId;
        if (teamId) {
          if (result.createdEntry) {
          }
        }
        return result;
      }),
  },
  timeEntries: {
    listMine: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
          anchorDate: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(agencyTimeEntrySchema),
            page: z.number().int().min(1),
            pageSize: z.number().int().min(1),
            total: z.number().int().nonnegative(),
            weekSummary: z.object({
              startDate: z.string().datetime(),
              endDate: z.string().datetime(),
              totalSeconds: z.number().int().nonnegative(),
              daily: z.array(
                z.object({
                  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                  totalSeconds: z.number().int().nonnegative(),
                }),
              ),
            }),
          })
          .parse(await listMyAgencyTimeEntries(context.session.user.id, input));
      }),
    createManual: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1).optional(),
          taskId: z.string().min(1).optional(),
          startAt: z.string().datetime(),
          endAt: z.string().datetime(),
          description: z.string().max(2_000).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const entry = agencyTimeEntrySchema.parse(
          await createManualAgencyTimeEntry(context.session.user.id, input),
        );
        return entry;
      }),
    updateMine: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          entryId: z.string().min(1),
          projectId: z.string().min(1).optional(),
          taskId: z.string().min(1).nullable().optional(),
          startAt: z.string().datetime().optional(),
          endAt: z.string().datetime().optional(),
          description: z.string().max(2_000).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const entry = agencyTimeEntrySchema.parse(
          await updateMyAgencyTimeEntry(context.session.user.id, input),
        );
        return entry;
      }),
    deleteMine: protectedProProcedure
      .input(teamScopedInputSchema.extend({ entryId: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        const result = z
          .object({
            entryId: z.string().min(1),
            deleted: z.boolean(),
          })
          .parse(await deleteMyAgencyTimeEntry(context.session.user.id, input));
        return result;
      }),
  },
  summary: {
    list: protectedProProcedure.input(reportsInputSchema).handler(async ({ context, input }) => {
      return z
        .object({ summary: timeSummarySchema })
        .parse(await getAgencyTimeSummary(context.session.user.id, input));
    }),
  },
  reports: {
    dashboard: protectedProProcedure
      .input(reportsInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            summary: reportsDashboardSummarySchema,
          })
          .parse(await getAgencyDashboardSummary(context.session.user.id, input));
      }),
    summary: protectedProProcedure.input(reportsInputSchema).handler(async ({ context, input }) => {
      return z
        .object({
          summary: reportsSummarySchema,
        })
        .parse(await getAgencyReportsSummary(context.session.user.id, input));
    }),
    exportCsv: protectedProProcedure
      .input(reportsInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            contentType: z.literal("text/csv"),
            fileName: z.string().min(1),
            csv: z.string(),
            totalRows: z.number().int().nonnegative(),
          })
          .parse(await exportAgencyReportsCsv(context.session.user.id, input));
      }),
    listEntries: protectedProProcedure
      .input(
        reportsInputSchema.extend({
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(agencyTimeEntrySchema),
            page: z.number().int().min(1),
            pageSize: z.number().int().min(1),
            total: z.number().int().nonnegative(),
          })
          .parse(await listAllAgencyTimeEntries(context.session.user.id, input));
      }),
    updateEntry: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          entryId: z.string().min(1),
          startAt: z.string().datetime().optional(),
          endAt: z.string().datetime().optional(),
          description: z.string().max(2_000).optional(),
          projectId: z.string().min(1).optional(),
          taskId: z.string().min(1).nullable().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        const entry = agencyTimeEntrySchema.parse(
          await updateAnyAgencyTimeEntry(context.session.user.id, input),
        );
        return entry;
      }),
  },
  // Phase 4 stubs.
  //
  // Each surface below ships with an honest, empty-but-shaped response.
  // Schemas define the eventual record shape so client surfaces can wire
  // directly today and only need to gain populated rows once the data
  // model lands. No DB writes; no derived numbers.
  budgets: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1).optional(),
        }),
      )
      .handler(async () => {
        return z
          .object({
            items: z.array(
              z.object({
                projectId: z.string().min(1),
                currency: z.string().min(1),
                hoursBudget: z.number().nonnegative().nullable(),
                costBudgetCents: z.number().int().nonnegative().nullable(),
                hoursLogged: z.number().nonnegative(),
                costLoggedCents: z.number().int().nonnegative(),
                periodStart: z.string().datetime().nullable(),
                periodEnd: z.string().datetime().nullable(),
              }),
            ),
          })
          .parse({ items: [] });
      }),
  },
  rates: {
    list: protectedProProcedure.input(teamScopedInputSchema).handler(async ({ context, input }) => {
      return z
        .object({
          items: z.array(
            z.object({
              userId: z.string().min(1),
              userName: z.string().min(1),
              userEmail: z.email(),
              costRateCents: z.number().int().nonnegative().nullable(),
              billableRateCents: z.number().int().nonnegative().nullable(),
              currency: z.string().min(1),
              effectiveFrom: z.string().datetime().nullable(),
            }),
          ),
        })
        .parse(await listMemberRates(context.session.user.id, input));
    }),
    upsert: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          userId: z.string().min(1),
          costRateCents: z.number().int().nonnegative().nullable().optional(),
          billableRateCents: z.number().int().nonnegative().nullable().optional(),
          currency: z.string().length(3).optional(),
          effectiveFrom: z.string().datetime().optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            userId: z.string().min(1),
            userName: z.string().min(1),
            userEmail: z.email(),
            costRateCents: z.number().int().nonnegative().nullable(),
            billableRateCents: z.number().int().nonnegative().nullable(),
            currency: z.string().min(1),
            effectiveFrom: z.string().datetime().nullable(),
          })
          .parse(await upsertMemberRate(context.session.user.id, input));
      }),
  },
  capacity: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          weekStart: z.string().datetime(),
          weeks: z.number().int().min(1).max(12),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            weeks: z.array(
              z.object({
                weekStart: z.string().datetime(),
                members: z.array(
                  z.object({
                    userId: z.string().min(1),
                    userName: z.string().min(1),
                    capacitySeconds: z.number().int().nonnegative(),
                    bookedSeconds: z.number().int().nonnegative(),
                    loggedSeconds: z.number().int().nonnegative(),
                  }),
                ),
              }),
            ),
          })
          .parse(await listMemberCapacity(context.session.user.id, input));
      }),
    set: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          userId: z.string().min(1),
          weekStart: z.string().datetime(),
          capacitySeconds: z.number().int().nonnegative(),
        }),
      )
      .handler(async ({ context, input }) => {
        const result = z
          .object({
            userId: z.string().min(1),
            weekStart: z.string().datetime(),
            capacitySeconds: z.number().int().nonnegative(),
          })
          .parse(await setMemberCapacity(context.session.user.id, input));
        return result;
      }),
  },
  invoices: {
    summary: protectedProProcedure
      .input(teamScopedInputSchema)
      .handler(async ({ context, input }) => {
        return z
          .object({
            draftCount: z.number().int().nonnegative(),
            sentCount: z.number().int().nonnegative(),
            paidCount: z.number().int().nonnegative(),
            outstandingCents: z.number().int().nonnegative(),
            currency: z.string().min(1),
            outstandingByCurrency: z.record(z.string(), z.number().int().nonnegative()),
          })
          .parse(await getInvoiceSummary(context.session.user.id, input));
      }),
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          status: z.enum(["draft", "sent", "paid"]).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            items: z.array(
              z.object({
                id: z.string().min(1),
                clientId: z.string().min(1),
                clientName: z.string().min(1),
                number: z.string().min(1),
                status: z.enum(["draft", "sent", "paid"]),
                amountCents: z.number().int().nonnegative(),
                currency: z.string().min(1),
                periodStart: z.string().datetime(),
                periodEnd: z.string().datetime(),
                issuedAt: z.string().datetime().nullable(),
                paidAt: z.string().datetime().nullable(),
              }),
            ),
          })
          .parse(await listInvoices(context.session.user.id, input));
      }),
    create: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          clientId: z.string().min(1),
          periodStart: z.string().datetime(),
          periodEnd: z.string().datetime(),
          currency: z.string().length(3).optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            id: z.string().min(1),
            clientId: z.string().min(1),
            clientName: z.string().min(1),
            number: z.string().min(1),
            status: z.enum(["draft", "sent", "paid"]),
            amountCents: z.number().int().nonnegative(),
            currency: z.string().min(1),
            periodStart: z.string().datetime(),
            periodEnd: z.string().datetime(),
            issuedAt: z.string().datetime().nullable(),
            paidAt: z.string().datetime().nullable(),
          })
          .parse(await createInvoice(context.session.user.id, input));
      }),
    updateStatus: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          invoiceId: z.string().min(1),
          status: z.enum(["sent", "paid"]),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({
            id: z.string().min(1),
            clientId: z.string().min(1),
            clientName: z.string().min(1),
            number: z.string().min(1),
            status: z.enum(["draft", "sent", "paid"]),
            amountCents: z.number().int().nonnegative(),
            currency: z.string().min(1),
            periodStart: z.string().datetime(),
            periodEnd: z.string().datetime(),
            issuedAt: z.string().datetime().nullable(),
            paidAt: z.string().datetime().nullable(),
          })
          .parse(await updateInvoiceStatus(context.session.user.id, input));
      }),
  },
  integrations: {
    list: protectedProProcedure.input(teamScopedInputSchema).handler(async () => {
      return z
        .object({
          items: z.array(
            z.object({
              id: z.enum(["slack", "calendar", "quickbooks", "webhooks"]),
              name: z.string().min(1),
              description: z.string().min(1),
              status: z.enum(["available", "connected"]),
              connectedAt: z.string().datetime().nullable(),
            }),
          ),
        })
        .parse({
          items: [
            {
              id: "slack",
              name: "Slack",
              description: "Daily totals and budget warnings in your channel.",
              status: "available",
              connectedAt: null,
            },
            {
              id: "calendar",
              name: "Calendar",
              description: "Suggest time entries from Google or Outlook events.",
              status: "available",
              connectedAt: null,
            },
            {
              id: "quickbooks",
              name: "QuickBooks · Xero",
              description: "Send invoices straight to your books.",
              status: "available",
              connectedAt: null,
            },
            {
              id: "webhooks",
              name: "Webhooks",
              description: "Stream entries into anything you already script.",
              status: "available",
              connectedAt: null,
            },
          ],
        });
    }),
  },
  tenure: {
    policy: {
      get: protectedProProcedure
        .input(teamScopedInputSchema)
        .handler(async ({ context, input }) => {
          return z
            .object({
              policy: z
                .object({
                  fiscalYearStartMonth: z.number().int().min(1).max(12),
                  fiscalYearStartDay: z.number().int().min(1).max(31),
                  quarterlyMinHours: z.number().int().positive(),
                  penaltyMonths: z.number().int().positive(),
                  internDurationMonths: z.number().int().nonnegative(),
                  internDurationWeeks: z.number().int().nonnegative(),
                  policyEffectiveFrom: z.string().datetime(),
                  enabled: z.boolean(),
                })
                .nullable(),
            })
            .parse(await getTenurePolicy(context.session.user.id, input));
        }),
      upsert: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            fiscalYearStartMonth: z.number().int().min(1).max(12),
            fiscalYearStartDay: z.number().int().min(1).max(31),
            quarterlyMinHours: z.number().int().positive(),
            penaltyMonths: z.number().int().positive(),
            internDurationMonths: z.number().int().nonnegative(),
            internDurationWeeks: z.number().int().nonnegative(),
            policyEffectiveFrom: z.string().datetime(),
            enabled: z.boolean(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              policy: z.object({
                fiscalYearStartMonth: z.number().int().min(1).max(12),
                quarterlyMinHours: z.number().int().positive(),
                penaltyMonths: z.number().int().positive(),
                internDurationMonths: z.number().int().nonnegative(),
                internDurationWeeks: z.number().int().nonnegative(),
                policyEffectiveFrom: z.string().datetime(),
                enabled: z.boolean(),
              }),
            })
            .parse(await upsertTenurePolicy(context.session.user.id, input));
        }),
    },
    profiles: {
      list: protectedProProcedure
        .input(teamScopedInputSchema)
        .handler(async ({ context, input }) => {
          return z
            .object({
              items: z.array(
                z.object({
                  userId: z.string().min(1),
                  userName: z.string().min(1),
                  userEmail: z.email(),
                  joinedAt: z.string().datetime(),
                  internStart: z.string().datetime().nullable(),
                  internEnd: z.string().datetime().nullable(),
                  internCountsTowardTenure: z.boolean(),
                  internExemptFromQuarterMin: z.boolean(),
                  notes: z.string().nullable(),
                }),
              ),
            })
            .parse(await listTenureProfiles(context.session.user.id, input));
        }),
      upsert: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            internStart: z.string().datetime().nullable().optional(),
            internEnd: z.string().datetime().nullable().optional(),
            internCountsTowardTenure: z.boolean().optional(),
            internExemptFromQuarterMin: z.boolean().optional(),
            notes: z.string().nullable().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              profile: z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userEmail: z.email(),
                joinedAt: z.string().datetime(),
                internStart: z.string().datetime().nullable(),
                internEnd: z.string().datetime().nullable(),
                internCountsTowardTenure: z.boolean(),
                internExemptFromQuarterMin: z.boolean(),
                notes: z.string().nullable(),
              }),
            })
            .parse(await upsertTenureProfile(context.session.user.id, input));
        }),
    },
    exemptions: {
      list: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            fiscalYear: z.number().int().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              items: z.array(
                z.object({
                  id: z.string().min(1),
                  type: z.enum([
                    "team_holiday",
                    "member_waiver",
                    "member_reduced_min",
                    "member_frozen_month",
                  ]),
                  fiscalYear: z.number().int(),
                  fiscalQuarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
                  userId: z.string().nullable(),
                  userName: z.string().nullable(),
                  reducedMinHours: z.number().int().nullable(),
                  frozenMonth: z.number().int().nullable(),
                  reason: z.string().nullable(),
                  createdAt: z.string().datetime(),
                }),
              ),
            })
            .parse(await listTenureExemptions(context.session.user.id, input));
        }),
      upsert: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            id: z.string().min(1).optional(),
            type: z.enum([
              "team_holiday",
              "member_waiver",
              "member_reduced_min",
              "member_frozen_month",
            ]),
            fiscalYear: z.number().int(),
            fiscalQuarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
            userId: z.string().nullable().optional(),
            reducedMinHours: z.number().int().positive().nullable().optional(),
            frozenMonth: z.number().int().min(1).max(12).nullable().optional(),
            reason: z.string().nullable().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              exemption: z.object({
                id: z.string().min(1),
                type: z.enum([
                  "team_holiday",
                  "member_waiver",
                  "member_reduced_min",
                  "member_frozen_month",
                ]),
                fiscalYear: z.number().int(),
                fiscalQuarter: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
                userId: z.string().nullable(),
                userName: z.string().nullable(),
                reducedMinHours: z.number().int().nullable(),
                frozenMonth: z.number().int().nullable(),
                reason: z.string().nullable(),
                createdAt: z.string().datetime(),
              }),
            })
            .parse(await upsertTenureExemption(context.session.user.id, input));
        }),
      delete: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            exemptionId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ ok: z.literal(true) })
            .parse(await deleteTenureExemption(context.session.user.id, input));
        }),
    },
    summary: {
      list: protectedProProcedure
        .input(teamScopedInputSchema)
        .handler(async ({ context, input }) => {
          return z
            .object({
              policyEnabled: z.boolean(),
              items: z.array(
                z.object({
                  userId: z.string().min(1),
                  userName: z.string().min(1),
                  userEmail: z.email(),
                  joinedAt: z.string().datetime(),
                  internStart: z.string().datetime().nullable(),
                  internEnd: z.string().datetime().nullable(),
                  internDerived: z.boolean(),
                  rawTenureMonths: z.number().int().nonnegative(),
                  rawTenureLabel: z.string().min(1),
                  penaltyMonths: z.number().int().nonnegative(),
                  netTenureMonths: z.number().int().nonnegative(),
                  netTenureLabel: z.string().min(1),
                  failedQuarterCount: z.number().int().nonnegative(),
                  awaitingFirstEntry: z.boolean(),
                  currentQuarter: z
                    .object({
                      fiscalYear: z.number().int(),
                      fiscalQuarter: z.union([
                        z.literal(1),
                        z.literal(2),
                        z.literal(3),
                        z.literal(4),
                      ]),
                      label: z.string().min(1),
                      requiredHours: z.number().nonnegative(),
                      loggedHours: z.number().nonnegative(),
                      status: z.enum([
                        "intern",
                        "waived",
                        "met",
                        "missed",
                        "on-track",
                        "at-risk",
                        "in-progress",
                        "skipped",
                      ]),
                      penaltyMonthsApplied: z.number().int().nonnegative(),
                      prorated: z.boolean(),
                    })
                    .nullable(),
                }),
              ),
            })
            .parse(await listTenureSummary(context.session.user.id, input));
        }),
    },
    member: {
      get: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              policy: z
                .object({
                  fiscalYearStartMonth: z.number().int().min(1).max(12),
                  fiscalYearStartDay: z.number().int().min(1).max(31),
                  quarterlyMinHours: z.number().int().positive(),
                  penaltyMonths: z.number().int().positive(),
                  internDurationMonths: z.number().int().nonnegative(),
                  internDurationWeeks: z.number().int().nonnegative(),
                  policyEffectiveFrom: z.string().datetime(),
                  enabled: z.boolean(),
                })
                .nullable(),
              member: z.object({
                userId: z.string().min(1),
                userName: z.string().min(1),
                userEmail: z.email(),
                joinedAt: z.string().datetime(),
                internStart: z.string().datetime().nullable(),
                internEnd: z.string().datetime().nullable(),
                internDerived: z.boolean(),
                internCountsTowardTenure: z.boolean(),
                internExemptFromQuarterMin: z.boolean(),
                notes: z.string().nullable(),
                rawTenureMonths: z.number().int().nonnegative(),
                rawTenureLabel: z.string().min(1),
                penaltyMonths: z.number().int().nonnegative(),
                netTenureMonths: z.number().int().nonnegative(),
                netTenureLabel: z.string().min(1),
                failedQuarterCount: z.number().int().nonnegative(),
                awaitingFirstEntry: z.boolean(),
                currentQuarter: z
                  .object({
                    fiscalYear: z.number().int(),
                    fiscalQuarter: z.union([
                      z.literal(1),
                      z.literal(2),
                      z.literal(3),
                      z.literal(4),
                    ]),
                    label: z.string().min(1),
                    periodStart: z.string().datetime(),
                    periodEnd: z.string().datetime(),
                    requiredHours: z.number().nonnegative(),
                    loggedHours: z.number().nonnegative(),
                    status: z.enum([
                      "intern",
                      "waived",
                      "met",
                      "missed",
                      "on-track",
                      "at-risk",
                      "in-progress",
                      "skipped",
                    ]),
                    penaltyMonthsApplied: z.number().int().nonnegative(),
                    prorated: z.boolean(),
                  })
                  .nullable(),
                quarters: z.array(
                  z.object({
                    fiscalYear: z.number().int(),
                    fiscalQuarter: z.union([
                      z.literal(1),
                      z.literal(2),
                      z.literal(3),
                      z.literal(4),
                    ]),
                    label: z.string().min(1),
                    periodStart: z.string().datetime(),
                    periodEnd: z.string().datetime(),
                    requiredHours: z.number().nonnegative(),
                    loggedHours: z.number().nonnegative(),
                    status: z.enum([
                      "intern",
                      "waived",
                      "met",
                      "missed",
                      "on-track",
                      "at-risk",
                      "in-progress",
                      "skipped",
                    ]),
                    penaltyMonthsApplied: z.number().int().nonnegative(),
                    prorated: z.boolean(),
                  }),
                ),
              }),
            })
            .parse(await getTenureMember(context.session.user.id, input));
        }),
    },
  },
};
