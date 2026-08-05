import { z } from "zod";

import { protectedProProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import {
  createMemberProfileAlert,
  listMemberProfileAlerts,
  removeMemberProfileAlert,
  sendMemberProfileAlert,
  setMemberProfileAlertNote,
  snoozeMemberProfileAlert,
} from "./member-profile-alert-service";
import {
  createMemberLeave,
  createMemberReview,
  deleteMemberLeave,
  deleteMemberReview,
  getMemberProfile,
  upsertMemberHrProfile,
} from "./service";
import {
  leaveAllowancePeriodSchema,
  memberEmploymentStatusSchema,
  memberEmploymentTypeSchema,
  memberHrProfileSchema,
  memberLeaveSchema,
  memberLeaveTypeSchema,
  memberProfileAlertSchema,
  memberProfileSchema,
  memberReviewSchema,
  memberWorkModelSchema,
  optionalHttpUrlSchema,
} from "./schemas";

const optionalDateKey = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

export const memberProfileRouter = {
  memberProfile: {
    get: protectedProProcedure
      .input(
        teamScopedInputSchema.extend({
          userId: z.string().min(1),
          utcOffsetMinutes: z
            .number()
            .int()
            .min(-14 * 60)
            .max(14 * 60),
          from: z.string().datetime(),
          to: z.string().datetime(),
          calendarMonth: z
            .string()
            .regex(/^\d{4}-\d{2}$/)
            .optional(),
        }),
      )
      .handler(async ({ context, input }) => {
        return memberProfileSchema.parse(await getMemberProfile(context.session.user.id, input));
      }),
    hrProfile: {
      upsert: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            status: memberEmploymentStatusSchema.optional(),
            departmentId: z.string().min(1).nullable().optional(),
            employmentType: memberEmploymentTypeSchema.nullable().optional(),
            workModel: memberWorkModelSchema.nullable().optional(),
            gender: z.string().max(64).nullable().optional(),
            dateOfBirth: optionalDateKey,
            phone: z.string().max(64).nullable().optional(),
            address: z.string().max(500).nullable().optional(),
            linkedinUrl: optionalHttpUrlSchema,
            xUrl: optionalHttpUrlSchema,
            instagramUrl: optionalHttpUrlSchema,
            offAllowanceDays: z.number().int().min(0).max(366).optional(),
            leaveAllowancePeriod: leaveAllowancePeriodSchema.optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          const { teamId, userId, ...patch } = input;
          return z.object({ hrProfile: memberHrProfileSchema }).parse({
            hrProfile: await upsertMemberHrProfile(context.session.user.id, {
              teamId,
              userId,
              patch,
            }),
          });
        }),
    },
    leave: {
      create: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1).nullable(),
            startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            type: memberLeaveTypeSchema,
            reason: z.string().max(500).nullable().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ leave: memberLeaveSchema })
            .parse({ leave: await createMemberLeave(context.session.user.id, input) });
        }),
      delete: protectedProProcedure
        .input(teamScopedInputSchema.extend({ leaveId: z.string().min(1) }))
        .handler(async ({ context, input }) => {
          return z
            .object({ id: z.string().min(1) })
            .parse(await deleteMemberLeave(context.session.user.id, input));
        }),
    },
    review: {
      create: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            subjectUserId: z.string().min(1),
            reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
            body: z.string().min(1).max(4_000),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ review: memberReviewSchema })
            .parse({ review: await createMemberReview(context.session.user.id, input) });
        }),
      delete: protectedProProcedure
        .input(teamScopedInputSchema.extend({ reviewId: z.string().min(1) }))
        .handler(async ({ context, input }) => {
          return z
            .object({ id: z.string().min(1) })
            .parse(await deleteMemberReview(context.session.user.id, input));
        }),
    },
    alerts: {
      list: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            utcOffsetMinutes: z
              .number()
              .int()
              .min(-14 * 60)
              .max(14 * 60)
              .optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({
              items: z.array(memberProfileAlertSchema),
              canManageAlerts: z.boolean(),
            })
            .parse(await listMemberProfileAlerts(context.session.user.id, input));
        }),
      create: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            title: z.string().min(1).max(200),
            body: z.string().max(1_000).optional(),
            note: z.string().max(2_000).nullable().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ alert: memberProfileAlertSchema })
            .parse(await createMemberProfileAlert(context.session.user.id, input));
        }),
      setNote: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            alertId: z.string().min(1),
            note: z.string().max(2_000),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ alert: memberProfileAlertSchema })
            .parse(await setMemberProfileAlertNote(context.session.user.id, input));
        }),
      send: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            alertId: z.string().min(1),
            note: z.string().max(2_000).optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ alert: memberProfileAlertSchema })
            .parse(await sendMemberProfileAlert(context.session.user.id, input));
        }),
      remove: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            alertId: z.string().min(1),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ id: z.string().min(1) })
            .parse(await removeMemberProfileAlert(context.session.user.id, input));
        }),
      snooze: protectedProProcedure
        .input(
          teamScopedInputSchema.extend({
            userId: z.string().min(1),
            alertId: z.string().min(1),
            snoozedUntil: z.string().datetime().optional(),
          }),
        )
        .handler(async ({ context, input }) => {
          return z
            .object({ alert: memberProfileAlertSchema })
            .parse(await snoozeMemberProfileAlert(context.session.user.id, input));
        }),
    },
  },
};
