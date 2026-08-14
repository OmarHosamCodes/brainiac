import { afterEach, describe, expect, test } from "bun:test";
import { eq } from "drizzle-orm";

Bun.env.DATABASE_URL ??= "postgresql://postgres:password@localhost:5440/orch";

const [
  { db },
  { user, workspaceObject, workspaceRelation, workspacePlacement },
  { createWorkspaceNode },
  teamService,
  workspaceService,
  knowledgeService,
  { createAgencyClient },
  { createAgencyProject },
] = await Promise.all([
  import("@orch/db"),
  import("@orch/db/schema"),
  import("@orch/workspace"),
  import("../team/service"),
  import("./service"),
  import("./knowledge-service"),
  import("../agency-ops/clients/service"),
  import("../agency-ops/projects/service"),
]);

const fixtureUsers: string[] = [];

afterEach(async () => {
  for (const userId of fixtureUsers.splice(0)) {
    await db.delete(user).where(eq(user.id, userId));
  }
});

async function createFixtureUser() {
  const id = `integration-knowledge-${crypto.randomUUID()}`;
  await db.insert(user).values({
    id,
    name: "Knowledge Integration User",
    email: `${id}@example.test`,
  });
  fixtureUsers.push(id);
  return id;
}

describe("workspace knowledge dual-write", () => {
  test("saves orchestrator connections and agencyRef as relations", async () => {
    const ownerUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Knowledge Team" });
    const target = createWorkspaceNode({
      title: "Target",
      ownerUserId,
    });
    const orch = createWorkspaceNode({
      title: "Orch",
      ownerUserId,
      nodeType: "orchestrator",
      connections: [{ targetNodeId: target.id }],
    });
    const linked = createWorkspaceNode({
      title: "Launch",
      ownerUserId,
      visibility: "team",
      teamId: team.id,
      agencyRef: { teamId: team.id, projectId: "proj-missing" },
    });

    await workspaceService.saveWorkspaceNodes(ownerUserId, {
      nodes: [target, orch, linked],
    });

    const objects = await db
      .select()
      .from(workspaceObject)
      .where(eq(workspaceObject.ownerUserId, ownerUserId));
    expect(objects).toHaveLength(3);

    const placements = await db
      .select()
      .from(workspacePlacement)
      .where(eq(workspacePlacement.ownerUserId, ownerUserId));
    expect(placements).toHaveLength(3);

    const related = await db
      .select()
      .from(workspaceRelation)
      .where(eq(workspaceRelation.fromObjectId, orch.id));
    expect(
      related.some((row) => row.relationType === "related" && row.toObjectId === target.id),
    ).toBe(true);

    const about = await db
      .select()
      .from(workspaceRelation)
      .where(eq(workspaceRelation.fromObjectId, linked.id));
    expect(about.some((row) => row.toObjectType === "agency.project")).toBe(true);

    const unplacedNote = await knowledgeService.applyKnowledgeAction(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "note",
        title: "Private thought",
        properties: { body: "keep me" },
      },
    });
    await workspaceService.saveWorkspaceNodes(ownerUserId, {
      nodes: [target, orch, linked],
    });
    const stillThere = await knowledgeService.getKnowledgeObject(ownerUserId, {
      id: unplacedNote.objectId,
    });
    expect(stillThere.object?.title).toBe("Private thought");
    expect(stillThere.object?.teamId).toBeNull();
  });

  test("capture decision about a live project then query about it", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    const team = await teamService.createTeam(ownerUserId, { name: "Brain Team" });
    const client = await createAgencyClient(ownerUserId, {
      teamId: team.id,
      name: "Acme",
    });
    const project = await createAgencyProject(ownerUserId, {
      teamId: team.id,
      clientId: client.id,
      name: "Launch",
    });

    await expect(
      knowledgeService.applyKnowledgeAction(ownerUserId, {
        action: {
          type: "object.create",
          objectType: "decision",
          title: "Cut scope",
          visibility: "team",
          teamId: team.id,
          about: { objectType: "agency.project", id: "proj-missing" },
        },
      }),
    ).rejects.toThrow();

    const created = await knowledgeService.applyKnowledgeAction(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "decision",
        title: "Cut scope",
        visibility: "team",
        teamId: team.id,
        about: { objectType: "agency.project", id: project.id },
        placement: { x: 12, y: 24 },
      },
    });

    const aboutQuery = await knowledgeService.queryKnowledgeObjects(ownerUserId, {
      teamId: team.id,
      about: { objectType: "agency.project", id: project.id },
    });
    expect(
      aboutQuery.items.some((item) => item.id === created.objectId && item.title === "Cut scope"),
    ).toBe(true);

    const projects = await knowledgeService.queryKnowledgeObjects(ownerUserId, {
      teamId: team.id,
      objectType: "agency.project",
    });
    expect(projects.items.some((item) => item.id === project.id && item.origin === "agency")).toBe(
      true,
    );

    await expect(
      knowledgeService.queryKnowledgeObjects(outsiderUserId, {
        teamId: team.id,
        objectType: "agency.project",
      }),
    ).rejects.toThrow();

    const detail = await knowledgeService.getKnowledgeObject(ownerUserId, { id: created.objectId });
    expect(detail.revisions.length).toBeGreaterThan(0);

    const snapshot = await workspaceService.getWorkspaceSnapshot(ownerUserId, {});
    const card = snapshot.nodes.find((node) => node.id === created.objectId);
    expect(card?.agencyRef?.projectId).toBe(project.id);
    expect(card?.connections).toEqual([]);
  });

  test("query hides private objects from outsiders", async () => {
    const ownerUserId = await createFixtureUser();
    const outsiderUserId = await createFixtureUser();
    await knowledgeService.applyKnowledgeAction(ownerUserId, {
      action: {
        type: "object.create",
        objectType: "note",
        title: "Secret",
      },
    });
    const outsiderQuery = await knowledgeService.queryKnowledgeObjects(outsiderUserId, {
      query: "Secret",
    });
    expect(outsiderQuery.items).toHaveLength(0);
  });
});
