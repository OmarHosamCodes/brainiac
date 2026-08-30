/** ponytail: one-off debug script — delete after investigating USD column zeros */
import { eq } from "drizzle-orm";

import { db } from "@orch/db";
import { workspaceTeamMember } from "@orch/db/schema";

import { listPeriodMoneyObligations } from "./money-export-service";

const teamId = "team-aabe75dc-1a60-4330-a92f-2ff3e0258455";
const periodStart = "2026-07-26T21:00:00.000Z";
const periodEnd = "2026-08-25T20:59:59.999Z";

const [member] = await db
  .select({ userId: workspaceTeamMember.userId })
  .from(workspaceTeamMember)
  .where(eq(workspaceTeamMember.teamId, teamId))
  .limit(1);

if (!member) throw new Error("no team member");

const result = await listPeriodMoneyObligations(member.userId, {
  teamId,
  periodStart,
  periodEnd,
});

const names = ["Lucent Lap", "Not School (Mesh Madrasa)", "Strive", "Consultation", "DR El Nazzer"];
for (const name of names) {
  const rows = result.clients.filter((c) => c.clientName === name);
  for (const row of rows) {
    console.log(row.clientName, row.kind, {
      amount: row.amount,
      sourceAmount: row.sourceAmount,
      rateCurrency: row.rateCurrency,
      durationSeconds: row.durationSeconds,
      isCarry: row.isCarry,
    });
  }
}
