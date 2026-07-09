import { db } from "@brainiac/db";
import { workspaceTeamMember, user, agencyOpsMemberCapacity, agencyOpsTimeEntry } from "@brainiac/db/schema";
import { eq, asc, and, inArray, gte, lte, sql, sum, isNull, lt } from "drizzle-orm";
import { ORPCError } from "@orpc/server";
import { createWorkspaceId } from "@brainiac/workspace";
import { parseIsoDateTime } from "../shared/utils";
import { requireTeamMembership } from "../shared/membership";

type AgencyCapacityWeek = {
  weekStart: string;
  members: Array<{
    userId: string;
    userName: string;
    capacitySeconds: number;
    bookedSeconds: number;
    loggedSeconds: number;
  }>;
};

export async function listMemberCapacity(
  actorUserId: string,
  input: { teamId: string; weekStart: string; weeks: number },
): Promise<{ weeks: AgencyCapacityWeek[] }> {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const weekStartRaw = parseIsoDateTime(input.weekStart, "weekStart");
  // Normalize to exact UTC midnight so map keys are consistent with date_trunc output.
  const weekStartDate = new Date(
    Date.UTC(weekStartRaw.getUTCFullYear(), weekStartRaw.getUTCMonth(), weekStartRaw.getUTCDate()),
  );

  const weekStarts: Date[] = Array.from({ length: input.weeks }, (_, i) => {
    const d = new Date(weekStartDate);
    d.setUTCDate(d.getUTCDate() + i * 7);
    return d;
  });

  const weekStartStrings = weekStarts.map((d) => d.toISOString());

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
    })
    .from(workspaceTeamMember)
    .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  if (members.length === 0) return { weeks: [] };

  const userIds = members.map((m) => m.userId);

  const capacityRows = await db
    .select()
    .from(agencyOpsMemberCapacity)
    .where(
      and(
        eq(agencyOpsMemberCapacity.teamId, input.teamId),
        inArray(agencyOpsMemberCapacity.userId, userIds),
        gte(agencyOpsMemberCapacity.weekStart, weekStarts[0]!),
        lte(agencyOpsMemberCapacity.weekStart, weekStarts[weekStarts.length - 1]!),
      ),
    );

  const lastWeekEnd = new Date(weekStarts[weekStarts.length - 1]!);
  lastWeekEnd.setUTCDate(lastWeekEnd.getUTCDate() + 7);

  const loggedRows = await db
    .select({
      userId: agencyOpsTimeEntry.userId,
      weekStart:
        sql<Date>`date_trunc('week', ${agencyOpsTimeEntry.startedAt} AT TIME ZONE 'UTC')`.as(
          "week_start",
        ),
      loggedSeconds: sum(agencyOpsTimeEntry.durationSeconds).as("logged_seconds"),
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
        inArray(agencyOpsTimeEntry.userId, userIds),
        gte(agencyOpsTimeEntry.startedAt, weekStarts[0]!),
        lt(agencyOpsTimeEntry.startedAt, lastWeekEnd),
      ),
    )
    .groupBy(
      agencyOpsTimeEntry.userId,
      sql`date_trunc('week', ${agencyOpsTimeEntry.startedAt} AT TIME ZONE 'UTC')`,
    );

  const capacityKey = (userId: string, weekIso: string) => `${userId}:${weekIso}`;
  const capacityMap = new Map<string, number>();
  for (const row of capacityRows) {
    capacityMap.set(capacityKey(row.userId, row.weekStart.toISOString()), row.capacitySeconds);
  }

  const loggedMap = new Map<string, number>();
  for (const row of loggedRows) {
    const weekIso = new Date(row.weekStart).toISOString();
    loggedMap.set(capacityKey(row.userId, weekIso), Number(row.loggedSeconds ?? 0));
  }

  const weeks: AgencyCapacityWeek[] = weekStartStrings.map((weekIso) => ({
    weekStart: weekIso,
    members: members.map((m) => ({
      userId: m.userId,
      userName: m.userName ?? "Unknown",
      capacitySeconds: capacityMap.get(capacityKey(m.userId, weekIso)) ?? 0,
      bookedSeconds: 0,
      loggedSeconds: loggedMap.get(capacityKey(m.userId, weekIso)) ?? 0,
    })),
  }));

  return { weeks };
}

export async function setMemberCapacity(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    weekStart: string;
    capacitySeconds: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const weekStartDate = parseIsoDateTime(input.weekStart, "weekStart");

  if (weekStartDate.getUTCDay() !== 1) {
    throw new ORPCError("BAD_REQUEST", { message: "weekStart must be a Monday (UTC)." });
  }

  // Require exact midnight so keys join correctly with listing functions.
  if (
    weekStartDate.getUTCHours() !== 0 ||
    weekStartDate.getUTCMinutes() !== 0 ||
    weekStartDate.getUTCSeconds() !== 0 ||
    weekStartDate.getUTCMilliseconds() !== 0
  ) {
    throw new ORPCError("BAD_REQUEST", {
      message: "weekStart must be at exactly midnight UTC (e.g. 2025-05-12T00:00:00.000Z).",
    });
  }

  const now = new Date();
  const [upserted] = await db
    .insert(agencyOpsMemberCapacity)
    .values({
      id: createWorkspaceId("agency-cap"),
      teamId: input.teamId,
      userId: input.userId,
      weekStart: weekStartDate,
      capacitySeconds: input.capacitySeconds,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        agencyOpsMemberCapacity.teamId,
        agencyOpsMemberCapacity.userId,
        agencyOpsMemberCapacity.weekStart,
      ],
      set: { capacitySeconds: input.capacitySeconds, updatedAt: now },
    })
    .returning();

  if (!upserted) throw new ORPCError("INTERNAL_SERVER_ERROR");

  return {
    userId: upserted.userId,
    weekStart: upserted.weekStart.toISOString(),
    capacitySeconds: upserted.capacitySeconds,
  };
}
