import { z } from "zod";

import { protectedProProcedure } from "../../procedures";
import {
    createAgencyClient,
    createAgencyProject,
    createAgencySprint,
    createAgencySprintItem,
    createManualAgencyTimeEntry,
    deleteMyAgencyTimeEntry,
    exportAgencyReportsCsv,
    getAgencyActiveTimer,
    getAgencyReportsSummary,
    listAgencyClients,
    listAgencyProjects,
    listAgencySprintItems,
    listAgencySprints,
    listMyAgencyTimeEntries,
    startAgencyTimer,
    stopAgencyTimer,
    updateAgencyClient,
    updateAgencyProject,
    updateAgencySprint,
    updateAgencySprintItem,
    updateMyAgencyTimeEntry,
} from "./service";

const agencyClientStatusSchema = z.enum(["active", "archived"]);
const agencyProjectStatusSchema = z.enum(["planning", "active", "paused", "completed"]);
const agencySprintStatusSchema = z.enum(["planned", "active", "completed"]);
const agencySprintItemStatusSchema = z.enum(["todo", "doing", "done"]);
const agencySprintItemTypeSchema = z.enum(["task", "step"]);
const agencyTimeEntrySourceSchema = z.enum(["timer", "manual"]);

const teamScopedInputSchema = z.object({
    teamId: z.string().min(1),
});

const agencyClientSchema = z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    name: z.string().min(1),
    brandColor: z.string().min(1),
    status: agencyClientStatusSchema,
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
    description: z.string(),
    status: agencyProjectStatusSchema,
    budgetMinutes: z.number().int().nonnegative(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const agencySprintSchema = z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    projectId: z.string().min(1),
    projectName: z.string().min(1),
    name: z.string().min(1),
    status: agencySprintStatusSchema,
    startDate: z.string().datetime().nullable(),
    endDate: z.string().datetime().nullable(),
    completedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const agencySprintItemSchema = z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    projectId: z.string().min(1),
    projectName: z.string().min(1),
    sprintId: z.string().min(1),
    sprintName: z.string().min(1),
    type: agencySprintItemTypeSchema,
    title: z.string().min(1),
    description: z.string(),
    status: agencySprintItemStatusSchema,
    assigneeUserId: z.string().min(1).nullable(),
    assigneeName: z.string().nullable(),
    estimateMinutes: z.number().int().nonnegative(),
    position: z.number().int(),
    archivedAt: z.string().datetime().nullable(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const agencyTimeEntrySchema = z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    userId: z.string().min(1),
    userName: z.string().min(1),
    projectId: z.string().min(1),
    projectName: z.string().min(1),
    clientId: z.string().min(1),
    clientName: z.string().min(1),
    sprintId: z.string().min(1).nullable(),
    sprintName: z.string().nullable(),
    sprintItemId: z.string().min(1),
    sprintItemTitle: z.string().min(1),
    sprintItemType: agencySprintItemTypeSchema,
    source: agencyTimeEntrySourceSchema,
    description: z.string(),
    startedAt: z.string().datetime(),
    endedAt: z.string().datetime(),
    durationSeconds: z.number().int().positive(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const agencyActiveTimerSchema = z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    userId: z.string().min(1),
    projectId: z.string().min(1),
    projectName: z.string().min(1),
    sprintId: z.string().min(1).nullable(),
    sprintName: z.string().nullable(),
    sprintItemId: z.string().min(1),
    sprintItemTitle: z.string().min(1),
    sprintItemType: agencySprintItemTypeSchema,
    description: z.string(),
    startedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const reportsSummarySchema = z.object({
    totalHours: z.number().nonnegative(),
    totalEntries: z.number().int().nonnegative(),
    burnByProject: z.array(
        z.object({
            projectId: z.string().min(1),
            projectName: z.string().min(1),
            clientId: z.string().min(1),
            clientName: z.string().min(1),
            budgetHours: z.number().nonnegative(),
            loggedHours: z.number().nonnegative(),
            burnPercent: z.number().nonnegative(),
        }),
    ),
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

const reportsInputSchema = teamScopedInputSchema.extend({
    from: z.string().datetime(),
    to: z.string().datetime(),
    clientId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    memberUserId: z.string().min(1).optional(),
});

export const agencyOpsRouter = {
    clients: {
        list: protectedProProcedure
            .input(teamScopedInputSchema.extend({ includeArchived: z.boolean().optional() }))
            .handler(async ({ context, input }) => {
                return z
                    .object({ items: z.array(agencyClientSchema) })
                    .parse(await listAgencyClients(context.session.user.id, input));
            }),
        create: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    name: z.string().trim().min(1).max(120),
                    brandColor: z.string().trim().optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencyClientSchema.parse(await createAgencyClient(context.session.user.id, input));
            }),
        update: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    clientId: z.string().min(1),
                    name: z.string().trim().min(1).max(120).optional(),
                    brandColor: z.string().trim().optional(),
                    status: agencyClientStatusSchema.optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencyClientSchema.parse(await updateAgencyClient(context.session.user.id, input));
            }),
    },
    projects: {
        list: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    clientId: z.string().min(1).optional(),
                    includeArchived: z.boolean().optional(),
                    statuses: z.array(agencyProjectStatusSchema).optional(),
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
                    description: z.string().max(2_000).optional(),
                    status: agencyProjectStatusSchema.optional(),
                    budgetMinutes: z.number().int().min(0).max(10_000_000).optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencyProjectSchema.parse(await createAgencyProject(context.session.user.id, input));
            }),
        update: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    projectId: z.string().min(1),
                    clientId: z.string().min(1).optional(),
                    name: z.string().trim().min(1).max(160).optional(),
                    description: z.string().max(2_000).optional(),
                    status: agencyProjectStatusSchema.optional(),
                    budgetMinutes: z.number().int().min(0).max(10_000_000).optional(),
                    archived: z.boolean().optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencyProjectSchema.parse(await updateAgencyProject(context.session.user.id, input));
            }),
    },
    sprints: {
        list: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    projectId: z.string().min(1).optional(),
                    statuses: z.array(agencySprintStatusSchema).optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return z
                    .object({ items: z.array(agencySprintSchema) })
                    .parse(await listAgencySprints(context.session.user.id, input));
            }),
        create: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    projectId: z.string().min(1),
                    name: z.string().trim().min(1).max(160),
                    status: agencySprintStatusSchema.optional(),
                    startDate: z.string().datetime().nullable().optional(),
                    endDate: z.string().datetime().nullable().optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencySprintSchema.parse(await createAgencySprint(context.session.user.id, input));
            }),
        update: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    sprintId: z.string().min(1),
                    name: z.string().trim().min(1).max(160).optional(),
                    status: agencySprintStatusSchema.optional(),
                    startDate: z.string().datetime().nullable().optional(),
                    endDate: z.string().datetime().nullable().optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencySprintSchema.parse(await updateAgencySprint(context.session.user.id, input));
            }),
    },
    sprintItems: {
        list: protectedProProcedure
            .input(teamScopedInputSchema.extend({ sprintId: z.string().min(1) }))
            .handler(async ({ context, input }) => {
                return z
                    .object({ items: z.array(agencySprintItemSchema) })
                    .parse(await listAgencySprintItems(context.session.user.id, input));
            }),
        create: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    sprintId: z.string().min(1),
                    projectId: z.string().min(1),
                    type: agencySprintItemTypeSchema.optional(),
                    title: z.string().trim().min(1).max(200),
                    description: z.string().max(4_000).optional(),
                    status: agencySprintItemStatusSchema.optional(),
                    assigneeUserId: z.string().min(1).nullable().optional(),
                    estimateMinutes: z.number().int().min(0).max(100_000).optional(),
                    position: z.number().int().optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencySprintItemSchema.parse(
                    await createAgencySprintItem(context.session.user.id, input),
                );
            }),
        update: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    sprintItemId: z.string().min(1),
                    sprintId: z.string().min(1).optional(),
                    status: agencySprintItemStatusSchema.optional(),
                    title: z.string().trim().min(1).max(200).optional(),
                    description: z.string().max(4_000).optional(),
                    assigneeUserId: z.string().min(1).nullable().optional(),
                    estimateMinutes: z.number().int().min(0).max(100_000).optional(),
                    position: z.number().int().optional(),
                    archived: z.boolean().optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencySprintItemSchema.parse(
                    await updateAgencySprintItem(context.session.user.id, input),
                );
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
        start: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    sprintItemId: z.string().min(1),
                    description: z.string().max(2_000).optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return z
                    .object({ timer: agencyActiveTimerSchema.nullable() })
                    .parse(await startAgencyTimer(context.session.user.id, input));
            }),
        stop: protectedProProcedure
            .input(
                z.object({
                    teamId: z.string().min(1).optional(),
                    description: z.string().max(2_000).optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return z
                    .object({
                        timer: agencyActiveTimerSchema.nullable(),
                        createdEntry: agencyTimeEntrySchema.nullable(),
                    })
                    .parse(await stopAgencyTimer(context.session.user.id, input));
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
                    sprintItemId: z.string().min(1),
                    startAt: z.string().datetime(),
                    endAt: z.string().datetime(),
                    description: z.string().max(2_000).optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencyTimeEntrySchema.parse(
                    await createManualAgencyTimeEntry(context.session.user.id, input),
                );
            }),
        updateMine: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    entryId: z.string().min(1),
                    startAt: z.string().datetime().optional(),
                    endAt: z.string().datetime().optional(),
                    description: z.string().max(2_000).optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencyTimeEntrySchema.parse(await updateMyAgencyTimeEntry(context.session.user.id, input));
            }),
        deleteMine: protectedProProcedure
            .input(teamScopedInputSchema.extend({ entryId: z.string().min(1) }))
            .handler(async ({ context, input }) => {
                return z
                    .object({
                        entryId: z.string().min(1),
                        deleted: z.boolean(),
                    })
                    .parse(await deleteMyAgencyTimeEntry(context.session.user.id, input));
            }),
    },
    reports: {
        summary: protectedProProcedure.input(reportsInputSchema).handler(async ({ context, input }) => {
            return z
                .object({
                    summary: reportsSummarySchema,
                })
                .parse(await getAgencyReportsSummary(context.session.user.id, input));
        }),
        exportCsv: protectedProProcedure.input(reportsInputSchema).handler(async ({ context, input }) => {
            return z
                .object({
                    contentType: z.literal("text/csv"),
                    fileName: z.string().min(1),
                    csv: z.string(),
                    totalRows: z.number().int().nonnegative(),
                })
                .parse(await exportAgencyReportsCsv(context.session.user.id, input));
        }),
    },
};
