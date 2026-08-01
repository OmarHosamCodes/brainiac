import { db } from "@orch/db";
import {
  agencyOpsMemberLeave,
  agencyOpsMemberReview,
  agencyOpsProject,
  agencyOpsTimeEntry,
  user,
  workspaceTeamMember,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, gte, isNull, lte, or } from "drizzle-orm";

import { requireTeamMembership } from "../shared/membership";
import { localDateKeyFromInstant } from "../time-tracking/local-week-bounds";
import { buildHeatDays, expandLeaveDays } from "./member-profile-heat";
import type { memberLeaveSchema, memberProfileSchema, memberReviewSchema } from "./schemas";
import type { z } from "zod";

type MemberLeave = z.infer<typeof memberLeaveSchema>;
type MemberReview = z.infer<typeof memberReviewSchema>;
type MemberProfile = z.infer<typeof memberProfileSchema>;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function assertDateKey(value: string, label: string) {
  if (!DATE_RE.test(value)) {
    throw new ORPCError("BAD_REQUEST", { message: `Invalid ${label}` });
  }
}

function mapLeave(row: typeof agencyOpsMemberLeave.$inferSelect): MemberLeave {
  return {
    id: row.id,
    teamId: row.teamId,
    userId: row.userId,
    startDate: row.startDate,
    endDate: row.endDate,
    type: row.type,
    reason: row.reason,
    createdByUserId: row.createdByUserId,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function requireSubjectMembership(teamId: string, userId: string) {
  const [membership] = await db
    .select({
      role: workspaceTeamMember.role,
      joinedAt: workspaceTeamMember.createdAt,
      userName: user.name,
      userAvatar: user.image,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, userId)))
    .limit(1);

  if (!membership) {
    throw new ORPCError("NOT_FOUND", { message: "Member not found on this team" });
  }
  return membership;
}

export async function getMemberProfile(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    utcOffsetMinutes: number;
    from: string;
    to: string;
  },
): Promise<MemberProfile> {
  const actorRole = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const subject = await requireSubjectMembership(input.teamId, input.userId);

  const rangeStart = new Date(input.from);
  const rangeEnd = new Date(input.to);
  if (Number.isNaN(rangeStart.getTime()) || Number.isNaN(rangeEnd.getTime())) {
    throw new ORPCError("BAD_REQUEST", { message: "Invalid range" });
  }
  if (rangeEnd.getTime() < rangeStart.getTime()) {
    throw new ORPCError("BAD_REQUEST", { message: "to must be on or after from" });
  }

  const startDate = localDateKeyFromInstant(rangeStart, input.utcOffsetMinutes);
  const endDate = localDateKeyFromInstant(rangeEnd, input.utcOffsetMinutes);

  const [entries, leaveRows, reviewRows] = await Promise.all([
    db
      .select({
        id: agencyOpsTimeEntry.id,
        startedAt: agencyOpsTimeEntry.startedAt,
        endedAt: agencyOpsTimeEntry.endedAt,
        durationSeconds: agencyOpsTimeEntry.durationSeconds,
        description: agencyOpsTimeEntry.description,
        isWaste: agencyOpsTimeEntry.isWaste,
        projectName: agencyOpsProject.name,
        createdAt: agencyOpsTimeEntry.createdAt,
        updatedAt: agencyOpsTimeEntry.updatedAt,
      })
      .from(agencyOpsTimeEntry)
      .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
      .where(
        and(
          eq(agencyOpsTimeEntry.teamId, input.teamId),
          eq(agencyOpsTimeEntry.userId, input.userId),
          isNull(agencyOpsTimeEntry.deletedAt),
          gte(agencyOpsTimeEntry.startedAt, rangeStart),
          lte(agencyOpsTimeEntry.startedAt, rangeEnd),
        ),
      )
      .orderBy(desc(agencyOpsTimeEntry.startedAt))
      .limit(2_000),
    db
      .select()
      .from(agencyOpsMemberLeave)
      .where(
        and(
          eq(agencyOpsMemberLeave.teamId, input.teamId),
          or(isNull(agencyOpsMemberLeave.userId), eq(agencyOpsMemberLeave.userId, input.userId)),
          lte(agencyOpsMemberLeave.startDate, endDate),
          gte(agencyOpsMemberLeave.endDate, startDate),
        ),
      )
      .orderBy(asc(agencyOpsMemberLeave.startDate)),
    db
      .select({
        id: agencyOpsMemberReview.id,
        teamId: agencyOpsMemberReview.teamId,
        subjectUserId: agencyOpsMemberReview.subjectUserId,
        authorUserId: agencyOpsMemberReview.authorUserId,
        authorName: user.name,
        authorAvatar: user.image,
        reviewDate: agencyOpsMemberReview.reviewDate,
        body: agencyOpsMemberReview.body,
        createdAt: agencyOpsMemberReview.createdAt,
        updatedAt: agencyOpsMemberReview.updatedAt,
      })
      .from(agencyOpsMemberReview)
      .innerJoin(user, eq(user.id, agencyOpsMemberReview.authorUserId))
      .where(
        and(
          eq(agencyOpsMemberReview.teamId, input.teamId),
          eq(agencyOpsMemberReview.subjectUserId, input.userId),
          gte(agencyOpsMemberReview.reviewDate, startDate),
          lte(agencyOpsMemberReview.reviewDate, endDate),
        ),
      )
      .orderBy(desc(agencyOpsMemberReview.reviewDate), desc(agencyOpsMemberReview.createdAt)),
  ]);

  const secondsByDate = new Map<string, number>();
  let periodTotalSeconds = 0;
  for (const entry of entries) {
    const date = localDateKeyFromInstant(entry.startedAt, input.utcOffsetMinutes);
    const next = (secondsByDate.get(date) ?? 0) + entry.durationSeconds;
    secondsByDate.set(date, next);
    periodTotalSeconds += entry.durationSeconds;
  }

  const leave = leaveRows.map(mapLeave);
  const leaveByDate = expandLeaveDays(
    leave.map((row) => ({
      id: row.id,
      startDate: row.startDate,
      endDate: row.endDate,
      type: row.type,
      reason: row.reason,
    })),
    startDate,
    endDate,
  );

  const heatDays = buildHeatDays({
    windowStart: startDate,
    windowEnd: endDate,
    secondsByDate,
    leaveByDate,
  });

  type TimelineItem =
    | {
        kind: "review";
        id: string;
        date: string;
        createdAt: string;
        authorUserId: string;
        authorName: string;
        authorAvatar: string | null;
        body: string;
      }
    | {
        kind: "activity";
        id: string;
        date: string;
        createdAt: string;
        summary: string;
        projectName: string | null;
        durationSeconds: number;
        isWaste: boolean;
      };

  const itemsByDate = new Map<string, TimelineItem[]>();

  for (const review of reviewRows) {
    const item: TimelineItem = {
      kind: "review",
      id: review.id,
      date: review.reviewDate,
      createdAt: review.createdAt.toISOString(),
      authorUserId: review.authorUserId,
      authorName: review.authorName,
      authorAvatar: review.authorAvatar,
      body: review.body,
    };
    const list = itemsByDate.get(review.reviewDate) ?? [];
    list.push(item);
    itemsByDate.set(review.reviewDate, list);
  }

  for (const entry of entries.slice(0, 400)) {
    const date = localDateKeyFromInstant(entry.startedAt, input.utcOffsetMinutes);
    const hours = Math.floor(entry.durationSeconds / 3600);
    const minutes = Math.floor((entry.durationSeconds % 3600) / 60);
    const durationLabel = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    const description = entry.description.trim();
    const summary = description
      ? `Logged ${durationLabel}: ${description}`
      : `Logged ${durationLabel}`;
    const item: TimelineItem = {
      kind: "activity",
      id: entry.id,
      date,
      createdAt: entry.updatedAt.toISOString(),
      summary,
      projectName: entry.projectName,
      durationSeconds: entry.durationSeconds,
      isWaste: entry.isWaste,
    };
    const list = itemsByDate.get(date) ?? [];
    list.push(item);
    itemsByDate.set(date, list);
  }

  const timeline = [...itemsByDate.entries()]
    .sort(([a], [b]) => (a < b ? 1 : a > b ? -1 : 0))
    .map(([date, items]) => ({
      date,
      items: items.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1)),
    }));

  const isSelf = actorUserId === input.userId;
  const canAddReview = actorRole === "owner" || actorRole === "editor";
  const canManageLeave = isSelf || canAddReview;

  return {
    teamId: input.teamId,
    userId: input.userId,
    userName: subject.userName,
    userAvatar: subject.userAvatar,
    role: subject.role,
    joinedAt: subject.joinedAt.toISOString(),
    isSelf,
    canAddReview,
    canManageLeave,
    periodTotalSeconds,
    range: {
      from: rangeStart.toISOString(),
      to: rangeEnd.toISOString(),
    },
    heatMap: {
      startDate,
      endDate,
      days: heatDays,
    },
    leave,
    timeline,
  };
}

export async function createMemberLeave(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string | null;
    startDate: string;
    endDate: string;
    type: MemberLeave["type"];
    reason?: string | null;
  },
): Promise<MemberLeave> {
  assertDateKey(input.startDate, "startDate");
  assertDateKey(input.endDate, "endDate");
  if (input.endDate < input.startDate) {
    throw new ORPCError("BAD_REQUEST", { message: "endDate must be on or after startDate" });
  }

  const role = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const isManager = role === "owner" || role === "editor";
  if (input.userId === null || input.type === "team_holiday") {
    if (!isManager) {
      throw new ORPCError("UNAUTHORIZED", { message: "Managers can add team holidays" });
    }
  } else if (input.userId !== actorUserId && !isManager) {
    throw new ORPCError("UNAUTHORIZED");
  }

  if (input.userId) {
    await requireSubjectMembership(input.teamId, input.userId);
  }

  const [row] = await db
    .insert(agencyOpsMemberLeave)
    .values({
      id: createWorkspaceId("agency-leave"),
      teamId: input.teamId,
      userId: input.type === "team_holiday" ? null : input.userId,
      startDate: input.startDate,
      endDate: input.endDate,
      type: input.type === "team_holiday" ? "team_holiday" : input.type,
      reason: input.reason?.trim() || null,
      createdByUserId: actorUserId,
    })
    .returning();

  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return mapLeave(row);
}

export async function deleteMemberLeave(
  actorUserId: string,
  input: { teamId: string; leaveId: string },
): Promise<{ id: string }> {
  const role = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const [existing] = await db
    .select()
    .from(agencyOpsMemberLeave)
    .where(
      and(
        eq(agencyOpsMemberLeave.teamId, input.teamId),
        eq(agencyOpsMemberLeave.id, input.leaveId),
      ),
    )
    .limit(1);

  if (!existing) throw new ORPCError("NOT_FOUND");

  const isManager = role === "owner" || role === "editor";
  const canDelete =
    isManager ||
    existing.createdByUserId === actorUserId ||
    (existing.userId !== null && existing.userId === actorUserId);
  if (!canDelete) throw new ORPCError("UNAUTHORIZED");

  await db.delete(agencyOpsMemberLeave).where(eq(agencyOpsMemberLeave.id, input.leaveId));
  return { id: input.leaveId };
}

export async function createMemberReview(
  actorUserId: string,
  input: { teamId: string; subjectUserId: string; reviewDate: string; body: string },
): Promise<MemberReview> {
  assertDateKey(input.reviewDate, "reviewDate");
  const body = input.body.trim();
  if (!body) throw new ORPCError("BAD_REQUEST", { message: "Review body is required" });

  await requireTeamMembership(actorUserId, input.teamId, "editor");
  await requireSubjectMembership(input.teamId, input.subjectUserId);

  const [row] = await db
    .insert(agencyOpsMemberReview)
    .values({
      id: createWorkspaceId("agency-review"),
      teamId: input.teamId,
      subjectUserId: input.subjectUserId,
      authorUserId: actorUserId,
      reviewDate: input.reviewDate,
      body,
    })
    .returning();

  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");

  const [author] = await db
    .select({ name: user.name, image: user.image })
    .from(user)
    .where(eq(user.id, actorUserId))
    .limit(1);

  return {
    id: row.id,
    teamId: row.teamId,
    subjectUserId: row.subjectUserId,
    authorUserId: row.authorUserId,
    authorName: author?.name ?? "Member",
    authorAvatar: author?.image ?? null,
    reviewDate: row.reviewDate,
    body: row.body,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function deleteMemberReview(
  actorUserId: string,
  input: { teamId: string; reviewId: string },
): Promise<{ id: string }> {
  const role = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const [existing] = await db
    .select()
    .from(agencyOpsMemberReview)
    .where(
      and(
        eq(agencyOpsMemberReview.teamId, input.teamId),
        eq(agencyOpsMemberReview.id, input.reviewId),
      ),
    )
    .limit(1);

  if (!existing) throw new ORPCError("NOT_FOUND");

  const isManager = role === "owner" || role === "editor";
  if (!isManager && existing.authorUserId !== actorUserId) {
    throw new ORPCError("UNAUTHORIZED");
  }

  await db.delete(agencyOpsMemberReview).where(eq(agencyOpsMemberReview.id, input.reviewId));
  return { id: input.reviewId };
}
