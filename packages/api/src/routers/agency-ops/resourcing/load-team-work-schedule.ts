import { db } from "@orch/db";
import { agencyOpsTenurePolicy } from "@orch/db/schema";
import { eq } from "drizzle-orm";

import { resolveWorkSchedule, type WorkSchedule } from "./work-schedule";

type CacheEntry = { value: WorkSchedule; expiresAt: number };

// ponytail: process-memory TTL; upgrade to Redis when multi-instance cache is required.
const CACHE_TTL_MS = 60_000;
const scheduleCache = new Map<string, CacheEntry>();

export async function loadTeamWorkSchedule(teamId: string): Promise<WorkSchedule> {
  const cached = scheduleCache.get(teamId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const [row] = await db
    .select({
      requiredDailyHours: agencyOpsTenurePolicy.requiredDailyHours,
      weekStartsOn: agencyOpsTenurePolicy.weekStartsOn,
      weekendDurationDays: agencyOpsTenurePolicy.weekendDurationDays,
    })
    .from(agencyOpsTenurePolicy)
    .where(eq(agencyOpsTenurePolicy.teamId, teamId))
    .limit(1);
  const value = resolveWorkSchedule(row ?? null);
  scheduleCache.set(teamId, { value, expiresAt: Date.now() + CACHE_TTL_MS });
  return value;
}

export function invalidateTeamWorkScheduleCache(teamId: string) {
  scheduleCache.delete(teamId);
}
