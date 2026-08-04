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
    eventType: z.enum(["time_logged", "waste_marked", "leave"]),
    title: z.string().min(1),
    body: z.string().nullable(),
    meta: z.string().nullable(),
    durationSeconds: z.number().int().nonnegative().nullable(),
    projectId: z.string().nullable(),
    projectName: z.string().nullable(),
    taskId: z.string().nullable(),
    taskTitle: z.string().nullable(),
    clientId: z.string().nullable(),
    clientName: z.string().nullable(),
    description: z.string().nullable(),
    isWaste: z.boolean(),
    taskIsWaste: z.boolean().nullable(),
    startedAt: z.string().datetime().nullable(),
    endedAt: z.string().datetime().nullable(),
    teamId: z.string().nullable(),
    userId: z.string().nullable(),
    userName: z.string().nullable(),
    source: z.enum(["timer", "manual"]).nullable(),
    isBillable: z.boolean().nullable(),
  }),
]);

export const memberProfileTimelineDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  items: z.array(memberProfileTimelineItemSchema),
});

export const memberEmploymentTypeSchema = z.enum([
  "full_time",
  "part_time",
  "contractor",
  "intern",
]);
export const memberWorkModelSchema = z.enum(["onsite", "hybrid", "remote"]);
export const memberEmploymentStatusSchema = z.enum(["active", "inactive"]);
export const leaveAllowancePeriodSchema = z.enum(["year", "quarter", "month"]);

/** Persist only http(s) social links — blocks javascript: and other schemes. */
export function normalizeHttpUrl(value: string | null | undefined): string | null {
  const trimmed = value?.trim() || null;
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

export const optionalHttpUrlSchema = z
  .string()
  .max(500)
  .nullable()
  .optional()
  .superRefine((value, ctx) => {
    if (value == null || value.trim() === "") return;
    if (normalizeHttpUrl(value) == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "URL must use http or https",
      });
    }
  });

export const memberHrProfileSchema = z.object({
  status: memberEmploymentStatusSchema,
  departmentId: z.string().nullable(),
  departmentName: z.string().nullable(),
  employmentType: memberEmploymentTypeSchema.nullable(),
  workModel: memberWorkModelSchema.nullable(),
  gender: z.string().nullable(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  phone: z.string().nullable(),
  address: z.string().nullable(),
  linkedinUrl: z.string().nullable(),
  xUrl: z.string().nullable(),
  instagramUrl: z.string().nullable(),
  offAllowanceDays: z.number().int().nonnegative(),
  leaveAllowancePeriod: leaveAllowancePeriodSchema,
});

export const leaveBalanceBucketSchema = z.object({
  usedDays: z.number().int().nonnegative(),
  allowanceDays: z.number().int().nonnegative(),
});

export const leaveBalancesSchema = z.object({
  year: z.number().int(),
  period: z.object({
    kind: leaveAllowancePeriodSchema,
    start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    label: z.string().min(1),
  }),
  all: leaveBalanceBucketSchema,
});

export const weekHourDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  weekdayLabel: z.string().min(1),
  totalSeconds: z.number().int().nonnegative(),
});

export const calendarMonthDaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  dayOfMonth: z.number().int().min(1).max(31),
  inMonth: z.boolean(),
  status: z.enum(["present", "leave", "empty"]),
});

export const calendarMonthSchema = z.object({
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  label: z.string().min(1),
  days: z.array(calendarMonthDaySchema),
});

export const memberProfileSchema = z.object({
  teamId: z.string().min(1),
  userId: z.string().min(1),
  userName: z.string().min(1),
  userAvatar: z.string().nullable(),
  email: z.string().email(),
  role: z.enum(["owner", "editor", "viewer"]),
  joinedAt: z.string().datetime(),
  isSelf: z.boolean(),
  canAddReview: z.boolean(),
  canManageLeave: z.boolean(),
  canEditHr: z.boolean(),
  periodTotalSeconds: z.number().int().nonnegative(),
  periodWasteSeconds: z.number().int().nonnegative(),
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
  hrProfile: memberHrProfileSchema,
  leaveBalances: leaveBalancesSchema,
  weekHours: z.array(weekHourDaySchema),
  calendarMonth: calendarMonthSchema,
});
