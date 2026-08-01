import { z } from "zod";

import { protectedProProcedure } from "../../../procedures";
import { teamScopedInputSchema } from "../shared/schemas";
import {
  createMemberLeave,
  createMemberReview,
  deleteMemberLeave,
  deleteMemberReview,
  getMemberProfile,
} from "./service";
import {
  memberLeaveSchema,
  memberLeaveTypeSchema,
  memberProfileSchema,
  memberReviewSchema,
} from "./schemas";

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
        }),
      )
      .handler(async ({ context, input }) => {
        return memberProfileSchema.parse(await getMemberProfile(context.session.user.id, input));
      }),
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
  },
};
