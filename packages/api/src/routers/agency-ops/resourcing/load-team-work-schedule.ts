import { db } from "@orch/db";
import { agencyOpsTenurePolicy } from "@orch/db/schema";
import { eq } from "drizzle-orm";

import { resolveWorkSchedule, type WorkSchedule } from "./work-schedule";

export async function loadTeamWorkSchedule(teamId: string): Promise<WorkSchedule> {
  const [row] = await db
    .select({
      requiredDailyHours: agencyOpsTenurePolicy.requiredDailyHours,
      weekStartsOn: agencyOpsTenurePolicy.weekStartsOn,
      weekendDurationDays: agencyOpsTenurePolicy.weekendDurationDays,
    })
    .from(agencyOpsTenurePolicy)
    .where(eq(agencyOpsTenurePolicy.teamId, teamId))
    .limit(1);
  return resolveWorkSchedule(row ?? null);
}
