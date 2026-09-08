import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [
  { db },
  { agencyOpsProjectTask, user },
  teamService,
  clientService,
  projectService,
  service,
] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema"),
  import("../../team/service"),
  import("../clients/service"),
  import("../projects/service"),
  import("./service"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-task-list-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Task List Integration User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

describe("listAgencyProjectTasks pagination", () => {
  test("orders tasks that share createdAt by id and keeps total on every page", async () => {
    const actorUserId = await createFixtureUser();
    const team = await teamService.createTeam(actorUserId, { name: "Task List Tie-break Team" });
    const client = await clientService.createAgencyClient(actorUserId, {
      teamId: team.id,
      name: "Tie-break Client",
    });
    const project = await projectService.createAgencyProject(actorUserId, {
      teamId: team.id,
      clientId: client.id,
      name: "Tie-break Project",
    });

    const createdAt = new Date("2026-04-01T12:00:00.000Z");
    const suffix = crypto.randomUUID();
    const earlierId = `agency-project-task_a_${suffix}`;
    const laterId = `agency-project-task_z_${suffix}`;

    await db.insert(agencyOpsProjectTask).values([
      {
        id: earlierId,
        teamId: team.id,
        projectId: project.id,
        title: "Tie-break earlier id",
        createdByUserId: actorUserId,
        createdAt,
        updatedAt: createdAt,
      },
      {
        id: laterId,
        teamId: team.id,
        projectId: project.id,
        title: "Tie-break later id",
        createdByUserId: actorUserId,
        createdAt,
        updatedAt: createdAt,
      },
    ]);

    const page1 = await service.listAgencyProjectTasks(actorUserId, {
      teamId: team.id,
      page: 1,
      pageSize: 1,
    });
    const page2 = await service.listAgencyProjectTasks(actorUserId, {
      teamId: team.id,
      page: 2,
      pageSize: 1,
    });
    const full = await service.listAgencyProjectTasks(actorUserId, {
      teamId: team.id,
      page: 1,
      pageSize: 50,
    });
    const fullAgain = await service.listAgencyProjectTasks(actorUserId, {
      teamId: team.id,
      page: 1,
      pageSize: 50,
    });

    expect(page1.total).toBe(2);
    expect(page2.total).toBe(2);
    expect(page1.items.map((task) => task.id)).toEqual([laterId]);
    expect(page2.items.map((task) => task.id)).toEqual([earlierId]);
    expect(full.items.map((task) => task.id)).toEqual([laterId, earlierId]);
    expect(fullAgain.items.map((task) => task.id)).toEqual([laterId, earlierId]);
  });
});
