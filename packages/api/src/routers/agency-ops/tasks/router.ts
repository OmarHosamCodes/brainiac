import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import { teamScopedInputSchema, agencyProjectTaskBlueprintSchema, agencyProjectTaskSchema, attachmentMetadataSchema, agencyTaskThreadAttachmentInputSchema, agencyTaskMessageSchema, agencyTaskAgentAskResponseSchema, agencyTaskThreadMemberSchema } from "../shared/schemas";
import { listAgencyProjectTasks, createAgencyProjectTask, completeAgencyProjectTaskForMember, updateAgencyProjectTaskBlueprint, updateAgencyProjectTask, deleteAgencyProjectTask, listTaskThreadMessages, createTaskThreadMessage, createTaskAttachmentPresignedUrl, createTaskLinkAttachment, deleteTaskAttachment, listTaskThreadMembers, getTaskThreadContext, listRecentTaskThreadMessages } from "./service";
import { askTaskAgent } from "./task-agent";

export const tasksRouter = {
  projectTasks: {
    list: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          projectId: z.string().min(1).optional(),
          status: z.enum(["open", "in_progress", "done", "archived"]).optional(),
          statuses: z.array(z.enum(["open", "in_progress", "done", "archived"])).optional(),
          assigneeUserId: z.string().min(1).optional(),
          delegatedByUserId: z.string().min(1).optional(),
          journeyDiscoveryForUserId: z.string().min(1).optional(),
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
};
