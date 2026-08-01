import { z } from "zod";

export const memberLeaveTypeSchema = z.enum(["pto", "sick", "team_holiday", "other"]);

export const memberLeaveSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  userId: z.string().min(1).nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: memberLeaveTypeSchema,
  reason: z.string().nullable(),
  createdByUserId: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const memberReviewSchema = z.object({
  id: z.string().min(1),
  teamId: z.string().min(1),
  subjectUserId: z.string().min(1),
  authorUserId: z.string().min(1),
  authorName: z.string().min(1),
  authorAvatar: z.string().nullable(),
  reviewDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  body: z.string().min(1),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const memberProfileHeatDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  totalSeconds: z.number().int().nonnegative(),
  intensity: z.number().int().min(0).max(4),
  off: z
    .object({
      leaveId: z.string().min(1),
      type: memberLeaveTypeSchema,
      reason: z.string().nullable(),
      rangeStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      rangeEnd: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .nullable(),
});

export const memberProfileTimelineItemSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("review"),
    id: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    createdAt: z.string().datetime(),
    authorUserId: z.string().min(1),
    authorName: z.string().min(1),
    authorAvatar: z.string().nullable(),
    body: z.string().min(1),
  }),
  z.object({
    kind: z.literal("activity"),
    id: z.string().min(1),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    createdAt: z.string().datetime(),
    summary: z.string().min(1),
    projectName: z.string().nullable(),
    durationSeconds: z.number().int().nonnegative(),
    isWaste: z.boolean(),
  }),
]);

export const memberProfileTimelineDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(memberProfileTimelineItemSchema),
});

export const memberProfileSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
  role: z.enum(["owner", "editor", "viewer"]),
  joinedAt: z.string().datetime(),
  isSelf: z.boolean(),
  canAddReview: z.boolean(),
  canManageLeave: z.boolean(),
  periodTotalSeconds: z.number().int().nonnegative(),
  range: z.object({
    from: z.string().datetime(),
    to: z.string().datetime(),
  }),
  heatMap: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    days: z.array(memberProfileHeatDaySchema),
  }),
  leave: z.array(memberLeaveSchema),
  timeline: z.array(memberProfileTimelineDaySchema),
});
