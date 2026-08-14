import { db } from "@orch/db";
import { agencyOpsTimeEntry } from "@orch/db/schema";
import {
  knowledgeObjectViewSchema,
  isAgencyObjectType,
  type KnowledgeObjectType,
  type KnowledgeObjectView,
} from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq, isNull } from "drizzle-orm";

import { listAgencyClients, getAgencyClient } from "../agency-ops/clients/service";
import { listAgencyProjects } from "../agency-ops/projects/service";
import {
  getProjectByIdForTeam,
  getProjectTaskByIdForTeam,
} from "../agency-ops/shared/lookup-helpers";
import { listAgencyProjectTasks } from "../agency-ops/tasks/service";
import { listMyAgencyTimeEntries } from "../agency-ops/time-tracking/service";
import { listTeamMembers } from "../team/service";

export function mapAgencyProjectView(item: {
  id: string;
  name: string;
  teamId: string;
  clientId: string;
}): KnowledgeObjectView {
  return knowledgeObjectViewSchema.parse({
    origin: "agency",
    objectType: "agency.project",
    id: item.id,
    title: item.name,
    teamId: item.teamId,
    href: `/agency/projects/${item.id}`,
    properties: { clientId: item.clientId },
  });
}

export function mapAgencyTaskView(item: {
  id: string;
  title: string;
  teamId: string;
  projectId: string;
  status?: string;
}): KnowledgeObjectView {
  return knowledgeObjectViewSchema.parse({
    origin: "agency",
    objectType: "agency.task",
    id: item.id,
    title: item.title,
    teamId: item.teamId,
    href: `/agency/projects/${item.projectId}?taskId=${encodeURIComponent(item.id)}`,
    properties: { projectId: item.projectId, status: item.status ?? null },
  });
}

export function mapAgencyClientView(item: {
  id: string;
  name: string;
  teamId: string;
  category?: string;
}): KnowledgeObjectView {
  return knowledgeObjectViewSchema.parse({
    origin: "agency",
    objectType: "agency.client",
    id: item.id,
    title: item.name,
    teamId: item.teamId,
    href: null,
    properties: { category: item.category ?? null },
  });
}

export function mapAgencyMemberView(item: {
  userId: string;
  userName: string;
  teamId: string;
}): KnowledgeObjectView {
  return knowledgeObjectViewSchema.parse({
    origin: "agency",
    objectType: "agency.member",
    id: item.userId,
    title: item.userName,
    teamId: item.teamId,
    href: `/agency/members/${item.userId}`,
    properties: {},
  });
}

export function mapAgencyTimeEntryView(item: {
  id: string;
  teamId: string;
  description: string;
  startedAt: string;
  durationSeconds: number;
  projectId: string;
  taskId: string | null;
  userId: string;
  isWaste: boolean;
}): KnowledgeObjectView {
  return knowledgeObjectViewSchema.parse({
    origin: "agency",
    objectType: "agency.timeEntry",
    id: item.id,
    title: item.description.trim() || "Time entry",
    teamId: item.teamId,
    href: null,
    properties: {
      startedAt: item.startedAt,
      durationSeconds: item.durationSeconds,
      projectId: item.projectId,
      taskId: item.taskId,
      userId: item.userId,
      isWaste: item.isWaste,
    },
  });
}

export async function listAgencyKnowledgeViews(
  actorUserId: string,
  input: { teamId: string; objectType: KnowledgeObjectType; query?: string; limit: number },
): Promise<KnowledgeObjectView[]> {
  const query = input.query?.trim().toLowerCase() ?? "";
  const matches = (title: string) => !query || title.toLowerCase().includes(query);
  if (!isAgencyObjectType(input.objectType)) return [];
  const objectType = input.objectType;

  switch (objectType) {
    case "agency.project": {
      const { items } = await listAgencyProjects(actorUserId, { teamId: input.teamId });
      return items
        .filter((item) => matches(item.name))
        .slice(0, input.limit)
        .map((item) => mapAgencyProjectView({ ...item, teamId: input.teamId }));
    }
    case "agency.task": {
      const { items } = await listAgencyProjectTasks(actorUserId, {
        teamId: input.teamId,
        page: 1,
        pageSize: Math.min(100, Math.max(input.limit, 20)),
        search: input.query,
      });
      return items.slice(0, input.limit).map((item) =>
        mapAgencyTaskView({
          id: item.id,
          title: item.title,
          teamId: input.teamId,
          projectId: item.projectId,
          status: item.status,
        }),
      );
    }
    case "agency.client": {
      const { items } = await listAgencyClients(actorUserId, { teamId: input.teamId });
      return items
        .filter((item) => matches(item.name))
        .slice(0, input.limit)
        .map((item) => mapAgencyClientView({ ...item, teamId: input.teamId }));
    }
    case "agency.member": {
      const members = await listTeamMembers(actorUserId, { teamId: input.teamId });
      return members
        .filter((item) => matches(item.userName))
        .slice(0, input.limit)
        .map((item) => mapAgencyMemberView(item));
    }
    case "agency.timeEntry": {
      // ponytail: actor's recent entries only (listAll requires editor + date range). Upgrade to team-wide range query in Plan 2.
      const result = await listMyAgencyTimeEntries(actorUserId, {
        teamId: input.teamId,
        page: 1,
        pageSize: 50,
      });
      return result.items
        .filter((item) => matches(item.description) || matches(item.projectName ?? ""))
        .slice(0, input.limit)
        .map((item) =>
          mapAgencyTimeEntryView({
            id: item.id,
            teamId: item.teamId,
            description: item.description,
            startedAt: String(item.startedAt),
            durationSeconds: item.durationSeconds,
            projectId: item.projectId,
            taskId: item.taskId,
            userId: item.userId,
            isWaste: item.isWaste,
          }),
        );
    }
    default: {
      const _exhaustive: never = objectType;
      return _exhaustive;
    }
  }
}

export async function getAgencyKnowledgeView(
  actorUserId: string,
  input: { teamId: string; objectType: KnowledgeObjectType; id: string },
): Promise<KnowledgeObjectView> {
  const missing = (objectType: KnowledgeObjectType): KnowledgeObjectView =>
    knowledgeObjectViewSchema.parse({
      origin: "agency",
      objectType,
      id: input.id,
      title: "Missing",
      teamId: input.teamId,
      missing: true,
      properties: {},
    });

  try {
    switch (input.objectType) {
      case "agency.project": {
        const project = await getProjectByIdForTeam(input.teamId, input.id);
        return mapAgencyProjectView({
          id: project.id,
          name: project.name,
          teamId: input.teamId,
          clientId: project.clientId,
        });
      }
      case "agency.task": {
        const item = await getProjectTaskByIdForTeam(input.teamId, input.id);
        return mapAgencyTaskView({
          id: item.id,
          title: item.title,
          teamId: input.teamId,
          projectId: item.projectId,
          status: item.status,
        });
      }
      case "agency.client": {
        const client = await getAgencyClient(actorUserId, {
          teamId: input.teamId,
          clientId: input.id,
        });
        return mapAgencyClientView({ ...client, teamId: input.teamId });
      }
      case "agency.member": {
        const members = await listTeamMembers(actorUserId, { teamId: input.teamId });
        const member = members.find((row) => row.userId === input.id);
        if (!member) return missing("agency.member");
        return mapAgencyMemberView(member);
      }
      case "agency.timeEntry": {
        const [item] = await db
          .select()
          .from(agencyOpsTimeEntry)
          .where(
            and(
              eq(agencyOpsTimeEntry.id, input.id),
              eq(agencyOpsTimeEntry.teamId, input.teamId),
              eq(agencyOpsTimeEntry.userId, actorUserId),
              isNull(agencyOpsTimeEntry.deletedAt),
            ),
          )
          .limit(1);
        if (!item) return missing("agency.timeEntry");
        return mapAgencyTimeEntryView({
          id: item.id,
          teamId: item.teamId,
          description: item.description,
          startedAt: item.startedAt.toISOString(),
          durationSeconds: item.durationSeconds,
          projectId: item.projectId,
          taskId: item.taskId,
          userId: item.userId,
          isWaste: item.isWaste,
        });
      }
      default:
        return missing(input.objectType);
    }
  } catch (error) {
    if (
      error instanceof ORPCError &&
      (error.code === "NOT_FOUND" || error.code === "BAD_REQUEST")
    ) {
      return missing(input.objectType);
    }
    throw error;
  }
}

export async function assertAgencyTargetExists(
  actorUserId: string,
  input: { teamId: string; objectType: KnowledgeObjectType; id: string },
) {
  const view = await getAgencyKnowledgeView(actorUserId, input);
  if (view.missing) {
    throw new ORPCError("NOT_FOUND", { message: "Agency target was not found." });
  }
}
