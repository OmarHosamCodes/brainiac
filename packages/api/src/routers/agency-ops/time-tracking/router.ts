import { z } from "zod";
import { protectedProProcedure } from "../../../procedures";
import { teamScopedInputSchema, agencyTimeEntrySchema, agencyActiveTimerSchema, reportsInputSchema, timeSummarySchema } from "../shared/schemas";
import { getAgencyActiveTimer, listAgencyActiveMembers, startAgencyTimer, stopAgencyTimer, updateAgencyActiveTimerStart, listMyAgencyTimeEntries, createManualAgencyTimeEntry, updateMyAgencyTimeEntry, deleteMyAgencyTimeEntry, getAgencyTimeSummary } from "./service";

export const timeTrackingRouter = {
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
                clientName: z.string().min(1),
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
    updateStart: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          startedAt: z.string().datetime(),
        }),
      )
      .handler(async ({ context, input }) => {
        return z
          .object({ timer: agencyActiveTimerSchema })
          .parse(await updateAgencyActiveTimerStart(context.session.user.id, input));
      }),
  },

  timeEntries: {
    listMine: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          page: z.number().int().min(1).optional(),
          pageSize: z.number().int().min(1).max(100).optional(),
          anchorDate: z.string().datetime().optional(),
          utcOffsetMinutes: z.number().int().min(-840).max(840).optional(),
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
};
