/**
 * Local-only: reset credential passwords for every member of a team.
 *
 *   bun run --cwd apps/server src/operations/local-reset-team-passwords.ts
 */
import { db } from "@orch/db";
import { user, workspaceTeam, workspaceTeamMember } from "@orch/db/schema";
import { eq, ilike } from "drizzle-orm";
import { ensureCredentialAccount } from "../lib/ensure-credential-account";

const TEAM_NAME = Bun.env.TEAM_NAME ?? "School Of Marketing";
const PASSWORD = Bun.env.LOCAL_PASSWORD ?? "orch1234";

const teams = await db.select().from(workspaceTeam).where(ilike(workspaceTeam.name, TEAM_NAME));

if (teams.length === 0) {
  console.error(`No team matching "${TEAM_NAME}"`);
  process.exit(1);
}

const team = teams[0]!;
const members = await db
  .select({
    userId: user.id,
    name: user.name,
    email: user.email,
  })
  .from(workspaceTeamMember)
  .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
  .where(eq(workspaceTeamMember.teamId, team.id));

console.log(`Resetting ${members.length} users on "${team.name}" → password: ${PASSWORD}`);

for (const member of members) {
  const result = await ensureCredentialAccount(member.userId, {
    password: PASSWORD,
    updatePassword: true,
  });
  console.log(`  ${result.padEnd(8)} ${member.email} (${member.name})`);
}

console.log("Done.");
process.exit(0);
