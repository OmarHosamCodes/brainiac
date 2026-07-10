import { db } from "@brainiac/db";
import {
  agencyOpsProjectTask,
  agencyOpsTimeEntry,
  workspaceTeam,
  workspaceTeamMember,
} from "@brainiac/db/schema";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";

import { emitTeamDigestNotification } from "@brainiac/api/routers/notifications/service";

const DIGEST_HOUR_UTC = 8;
const digestSentForTeamDay = new Set<string>();

function teamDayKey(teamId: string, day: string) {
  return `${teamId}:${day}`;
}

function yesterdayUtcRange() {
  const now = new Date();
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 1);
  const day = start.toISOString().slice(0, 10);
  return { start, end, day };
}

async function runTeamDigest(teamId: string, day: string, range: { start: Date; end: Date }) {
  const key = teamDayKey(teamId, day);
  if (digestSentForTeamDay.has(key)) return;
  digestSentForTeamDay.add(key);

  const [hoursRow] = await db
    .select({
      totalSeconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)::int`,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, teamId),
        gte(agencyOpsTimeEntry.endedAt, range.start),
        lt(agencyOpsTimeEntry.endedAt, range.end),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    );

  const [tasksRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(agencyOpsProjectTask)
    .where(
      and(
        eq(agencyOpsProjectTask.teamId, teamId),
        eq(agencyOpsProjectTask.status, "done"),
        gte(agencyOpsProjectTask.updatedAt, range.start),
        lt(agencyOpsProjectTask.updatedAt, range.end),
      ),
    );

  const members = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(eq(workspaceTeamMember.teamId, teamId));

  const digestHoursSeconds = hoursRow?.totalSeconds ?? 0;
  const digestTasksCompleted = tasksRow?.count ?? 0;

  if (digestHoursSeconds === 0 && digestTasksCompleted === 0) {
    return;
  }

  for (const member of members) {
    await emitTeamDigestNotification(null, {
      teamId,
      recipientUserId: member.userId,
      digestDate: day,
      digestHoursSeconds,
      digestTasksCompleted,
    });
  }
}

export async function runNotificationDigestTick() {
  const now = new Date();
  if (now.getUTCHours() !== DIGEST_HOUR_UTC) return;

  const { start, end, day } = yesterdayUtcRange();
  const teams = await db.select({ id: workspaceTeam.id }).from(workspaceTeam);

  for (const team of teams) {
    await runTeamDigest(team.id, day, { start, end });
  }
}

export function startNotificationDigestScheduler() {
  const intervalMs = 60 * 60 * 1000;
  void runNotificationDigestTick();
  setInterval(() => {
    void runNotificationDigestTick();
  }, intervalMs);
}

/** ponytail: test-only reset */
export function resetDigestSentForTest() {
  digestSentForTeamDay.clear();
}
