/**
 * Seed Needs-action (+ one Updates) notifications for visual QA of the rail card / inbox.
 *
 *   bun run --cwd apps/server src/operations/local-seed-visual-notifications.ts omarhosamcodes@gmail.com
 */
import { db } from "@orch/db";
import {
  agencyOpsProject,
  agencyOpsProjectTask,
  notification,
  user,
  workspaceTeam,
  workspaceTeamMember,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { and, desc, eq, ne } from "drizzle-orm";

const email = process.argv[2] ?? "omarhosamcodes@gmail.com";

const users = await db.select().from(user).where(eq(user.email, email)).limit(1);
const recipient = users[0];
if (!recipient) {
  console.error("No user", email);
  process.exit(1);
}

const teams = await db
  .select({ id: workspaceTeam.id, name: workspaceTeam.name })
  .from(workspaceTeamMember)
  .innerJoin(workspaceTeam, eq(workspaceTeam.id, workspaceTeamMember.teamId))
  .where(eq(workspaceTeamMember.userId, recipient.id));
const team = teams.find((t) => /school.*marketing/i.test(t.name)) ?? teams[0];
if (!team) {
  console.error("No team for", email);
  process.exit(1);
}

const actorRows = await db
  .select({ id: user.id, name: user.name, email: user.email })
  .from(workspaceTeamMember)
  .innerJoin(user, eq(user.id, workspaceTeamMember.userId))
  .where(and(eq(workspaceTeamMember.teamId, team.id), ne(workspaceTeamMember.userId, recipient.id)))
  .limit(1);
const actor = actorRows[0];
const actorUserId = actor?.id ?? null;

const [project] = await db
  .select()
  .from(agencyOpsProject)
  .where(eq(agencyOpsProject.teamId, team.id))
  .orderBy(desc(agencyOpsProject.createdAt))
  .limit(1);
if (!project) {
  console.error("No project on team", team.name);
  process.exit(1);
}

const [task] = await db
  .select()
  .from(agencyOpsProjectTask)
  .where(eq(agencyOpsProjectTask.projectId, project.id))
  .orderBy(desc(agencyOpsProjectTask.createdAt))
  .limit(1);

const now = Date.now();
const rows = [
  {
    type: "task.assigned" as const,
    deliveryClass: "interrupt" as const,
    createdAt: new Date(now - 60_000),
    payload: {
      taskId: task?.id,
      taskTitle: task?.title ?? "Visual QA task",
      projectId: project.id,
      projectName: project.name,
    },
  },
  {
    type: "task.message" as const,
    deliveryClass: "interrupt" as const,
    createdAt: new Date(now - 30_000),
    payload: {
      taskId: task?.id,
      taskTitle: task?.title ?? "Visual QA task",
      projectId: project.id,
      projectName: project.name,
      messageId: createWorkspaceId("msg"),
      messagePreview: "Can you take a look when free?",
      messageCount: 1,
    },
  },
  {
    type: "member.alert" as const,
    deliveryClass: "interrupt" as const,
    createdAt: new Date(now),
    payload: {
      subjectUserId: recipient.id,
      alertId: createWorkspaceId("alert"),
      alertTitle: "Capacity check",
      notePreview: "Please confirm next week’s availability.",
    },
  },
  {
    type: "journey.milestone" as const,
    deliveryClass: "center" as const,
    createdAt: new Date(now - 120_000),
    payload: {
      projectId: project.id,
      projectName: project.name,
      journeyStepId: createWorkspaceId("step"),
      journeyStepLabel: "Discovery complete",
    },
  },
];

const inserted = await db
  .insert(notification)
  .values(
    rows.map((row) => ({
      id: createWorkspaceId("notification"),
      teamId: team.id,
      recipientUserId: recipient.id,
      actorUserId,
      type: row.type,
      deliveryClass: row.deliveryClass,
      payload: row.payload,
      readAt: null,
      seenAt: null,
      createdAt: row.createdAt,
      updatedAt: row.createdAt,
    })),
  )
  .returning({ id: notification.id, type: notification.type });

console.log(
  JSON.stringify(
    {
      email: recipient.email,
      team: team.name,
      actor: actor?.email ?? null,
      project: project.name,
      task: task?.title ?? null,
      inserted,
    },
    null,
    2,
  ),
);
console.log("VISUAL_NOTIFICATIONS_OK");
