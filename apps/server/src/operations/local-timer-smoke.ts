/**
 * Local smoke: exercise timer start/stop/change-task for a user via better-auth session + oRPC.
 *
 *   bun run --cwd apps/server src/operations/local-timer-smoke.ts omarhosamcodes@gmail.com
 */
import { db } from "@orch/db";
import {
  account,
  agencyOpsProject,
  agencyOpsProjectTask,
  user,
  workspaceTeam,
  workspaceTeamMember,
} from "@orch/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";

const email = process.argv[2] ?? "omarhosamcodes@gmail.com";
const password = Bun.env.LOCAL_PASSWORD ?? "orch1234";
const base = Bun.env.BETTER_AUTH_URL ?? "http://localhost:7001";

function cookieHeader(setCookie: string[] | null): string {
  if (!setCookie?.length) return "";
  return setCookie
    .map((c) => c.split(";")[0]!)
    .filter(Boolean)
    .join("; ");
}

async function rpc<T>(
  cookies: string,
  path: string,
  body: unknown,
): Promise<{ status: number; json: T | null; text: string }> {
  const res = await fetch(`${base}/rpc/${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: cookies,
    },
    body: JSON.stringify({ json: body }),
  });
  const text = await res.text();
  let json: T | null = null;
  try {
    json = JSON.parse(text) as T;
  } catch {
    /* ignore */
  }
  return { status: res.status, json, text };
}

const users = await db.select().from(user).where(eq(user.email, email));
const actor = users[0];
if (!actor) {
  console.error("No user", email);
  process.exit(1);
}

const teams = await db
  .select({ id: workspaceTeam.id, name: workspaceTeam.name })
  .from(workspaceTeamMember)
  .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamMember.teamId))
  .where(eq(workspaceTeamMember.userId, actor.id));
const team = teams.find((t) => /school.*marketing/i.test(t.name)) ?? teams[0];
if (!team) {
  console.error("No team");
  process.exit(1);
}

const projects = await db
  .select()
  .from(agencyOpsProject)
  .where(eq(agencyOpsProject.teamId, team.id))
  .limit(5);
const project = projects[0];
if (!project) {
  console.error("No project");
  process.exit(1);
}

const tasks = await db
  .select()
  .from(agencyOpsProjectTask)
  .where(eq(agencyOpsProjectTask.projectId, project.id))
  .limit(5);
const taskA = tasks[0] ?? null;
const taskB = tasks[1] ?? tasks[0] ?? null;

console.log(`User ${actor.email} team=${team.name} project=${project.name}`);
console.log(`Tasks: ${taskA?.title ?? "(none)"} / ${taskB?.title ?? "(none)"}`);

// Ensure password (idempotent)
{
  const accounts = await db.select().from(account).where(eq(account.userId, actor.id));
  const cred = accounts.find((a) => a.providerId === "credential");
  const hashed = await hashPassword(password);
  if (cred) {
    await db
      .update(account)
      .set({ password: hashed, updatedAt: new Date() })
      .where(eq(account.id, cred.id));
  }
}

const signIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
const cookies = cookieHeader(signIn.headers.getSetCookie?.() ?? null);
if (!signIn.ok || !cookies) {
  console.error("Sign-in failed", signIn.status, await signIn.text(), cookies);
  process.exit(1);
}
console.log("Signed in OK");

// Clear any active timer first
const activeBefore = await rpc<{ json?: { id?: string } } | unknown>(
  cookies,
  "agencyOps/timer/getActive",
  {
    teamId: team.id,
  },
);
console.log("getActive", activeBefore.status, JSON.stringify(activeBefore.json)?.slice(0, 200));

const stopIfNeeded = await rpc(cookies, "agencyOps/timer/stop", {
  teamId: team.id,
  description: "smoke-stop-existing",
});
console.log("stop-existing", stopIfNeeded.status, stopIfNeeded.text.slice(0, 200));

// 1) Start without task, stop without task (project-only save)
const startNoTask = await rpc(cookies, "agencyOps/timer/start", {
  teamId: team.id,
  projectId: project.id,
  description: "",
});
console.log("start-no-task", startNoTask.status, startNoTask.text.slice(0, 200));

const stopNoTask = await rpc(cookies, "agencyOps/timer/stop", {
  teamId: team.id,
  description: "",
});
console.log("stop-no-task", stopNoTask.status, stopNoTask.text.slice(0, 300));

// 2) Start without task, then start again — previous must roll into an entry (not discard)
const startA = await rpc(cookies, "agencyOps/timer/start", {
  teamId: team.id,
  projectId: project.id,
  description: "smoke-rollover-a",
});
console.log("start-rollover-a", startA.status);

await new Promise((r) => setTimeout(r, 200));

const startB = await rpc(cookies, "agencyOps/timer/start", {
  teamId: team.id,
  projectId: project.id,
  taskId: taskA?.id,
  description: "smoke-rollover-b",
});
console.log("start-rollover-b", startB.status, startB.text.slice(0, 350));

const stopFinal = await rpc(cookies, "agencyOps/timer/stop", {
  teamId: team.id,
  description: "smoke-final",
  taskId: taskB?.id ?? taskA?.id,
});
console.log("stop-final", stopFinal.status, stopFinal.text.slice(0, 300));

const ok =
  stopNoTask.status === 200 &&
  startB.status === 200 &&
  Boolean((startB.json as { json?: { createdEntry?: unknown } } | null)?.json?.createdEntry) &&
  stopFinal.status === 200;

console.log(ok ? "SMOKE_OK" : "SMOKE_FAIL");
process.exit(ok ? 0 : 1);
