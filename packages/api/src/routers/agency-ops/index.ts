import { z } from "zod";

import { protectedProProcedure } from "../../procedures";
import {
    createAgencyClient,
    createAgencyProject,
    createManualAgencyTimeEntry,
    createTag,
    deleteMyAgencyTimeEntry,
    deleteTag,
    exportAgencyReportsCsv,
    getAgencyActiveTimer,
    getAgencyReportsSummary,
    listAgencyClients,
    listAgencyProjects,
    listMyAgencyTimeEntries,
    listTags,
    startAgencyTimer,
    stopAgencyTimer,
    updateAgencyClient,
    updateAgencyProject,
    updateMyAgencyTimeEntry,
} from "./service";

const agencyTimeEntrySourceSchema = z.enum(["timer", "manual"]);

const teamScopedInputSchema = z.object({
    teamId: z.string().min(1),
});

const agencyClientSchema = z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    name: z.string().min(1),
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

const agencyTimeEntrySchema = z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    userId: z.string().min(1),
    userName: z.string().min(1),
    projectId: z.string().min(1),
    projectName: z.string().min(1),
    clientId: z.string().min(1),
    clientName: z.string().min(1),
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
    description: z.string(),
    startedAt: z.string().datetime(),
    createdAt: z.string().datetime(),
    updatedAt: z.string().datetime(),
});

const agencyTagSchema = z.object({
    id: z.string().min(1),
    teamId: z.string().min(1),
    name: z.string().min(1),
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

const reportsInputSchema = teamScopedInputSchema.extend({
    from: z.string().datetime(),
    to: z.string().datetime(),
    clientId: z.string().min(1).optional(),
    projectId: z.string().min(1).optional(),
    memberUserId: z.string().min(1).optional(),
    tagIds: z.array(z.string().min(1)).optional(),
});

export const agencyOpsRouter = {
    clients: {
        list: protectedProProcedure
            .input(teamScopedInputSchema)
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
                return agencyClientSchema.parse(await createAgencyClient(context.session.user.id, input));
            }),
        update: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    clientId: z.string().min(1),
                    name: z.string().trim().min(1).max(120).optional(),
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
                return agencyProjectSchema.parse(await createAgencyProject(context.session.user.id, input));
            }),
        update: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    projectId: z.string().min(1),
                    clientId: z.string().min(1).optional(),
                    name: z.string().trim().min(1).max(160).optional(),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencyProjectSchema.parse(await updateAgencyProject(context.session.user.id, input));
            }),
    },
    tags: {
        list: protectedProProcedure
            .input(teamScopedInputSchema)
            .handler(async ({ context, input }) => {
                return z
                    .object({ items: z.array(agencyTagSchema) })
                    .parse(await listTags(context.session.user.id, input));
            }),
        create: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    name: z.string().trim().min(1).max(50),
                }),
            )
            .handler(async ({ context, input }) => {
                return agencyTagSchema.parse(await createTag(context.session.user.id, input));
            }),
        delete: protectedProProcedure
            .input(
                teamScopedInputSchema.extend({
                    tagId: z.string().min(1),
                }),
            )
            .handler(async ({ context, input }) => {
                return z
                    .object({
                        tagId: z.string().min(1),
                        deleted: z.boolean(),
                    })
                    .parse(await deleteTag(context.session.user.id, input));
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
                    projectId: z.string().min(1),
                    description: z.string().max(2_000).optional(),
                    tagIds: z.array(z.string().min(1)).optional(),
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
                    tagIds: z.array(z.string().min(1)).optional(),
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
                    projectId: z.string().min(1),
                    startAt: z.string().datetime(),
                    endAt: z.string().datetime(),
                    description: z.string().max(2_000).optional(),
                    tagIds: z.array(z.string().min(1)).optional(),
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
