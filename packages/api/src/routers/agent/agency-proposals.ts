import {
  agencyActionLabel,
  agencyActionSchema,
  agencyDraftPlanSchema,
  type AgencyAction,
  type AgencyDraftPlan,
} from "@orch/agent/agency-actions";
import { db } from "@orch/db";
import { agentAgencyProposal } from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq } from "drizzle-orm";

import {
  archiveAgencyClient,
  createAgencyClient,
  listAgencyClients,
  updateAgencyClient,
} from "../agency-ops/clients/service";
import {
  createAgencyProject,
  deleteAgencyProject,
  listAgencyProjects,
  restoreAgencyProject,
  updateAgencyProject,
} from "../agency-ops/projects/service";
import { requireTeamMembership } from "../agency-ops/shared/membership";
import { createAgencyTag, deleteAgencyTag, listAgencyTags } from "../agency-ops/tags/service";
import {
  createAgencyProjectTask,
  deleteAgencyProjectTask,
  listAgencyProjectTasks,
  updateAgencyProjectTask,
} from "../agency-ops/tasks/service";
import {
  createManualAgencyTimeEntry,
  deleteMyAgencyTimeEntry,
  getAgencyActiveTimer,
  listMyAgencyTimeEntries,
  startAgencyTimer,
  stopAgencyTimer,
  updateAgencyActiveTimerDescription,
  updateAgencyActiveTimerStart,
  updateAgencyActiveTimerTask,
  updateMyAgencyTimeEntry,
} from "../agency-ops/time-tracking/service";

const PROPOSAL_TTL_MS = 24 * 60 * 60 * 1000;

function stableJson(value: unknown) {
  return JSON.stringify(value ?? null);
}

export async function loadAgencyActionBefore(
  actorUserId: string,
  teamId: string,
  action: AgencyAction,
): Promise<unknown> {
  switch (action.type) {
    case "time_entry.create":
      return null;
    case "time_entry.update":
    case "time_entry.delete": {
      const listed = await listMyAgencyTimeEntries(actorUserId, {
        teamId,
        page: 1,
        pageSize: 100,
      });
      return listed.items.find((entry) => entry.id === action.entryId) ?? null;
    }
    case "timer.start":
    case "timer.stop":
    case "timer.update": {
      const timer = await getAgencyActiveTimer(actorUserId, { teamId });
      return timer.timer ?? null;
    }
    case "project.create":
      return null;
    case "project.update":
    case "project.archive":
    case "project.restore": {
      const projects = await listAgencyProjects(actorUserId, { teamId });
      return projects.items.find((project) => project.id === action.projectId) ?? null;
    }
    case "task.create":
      return null;
    case "task.update":
    case "task.delete": {
      const tasks = await listAgencyProjectTasks(actorUserId, {
        teamId,
        page: 1,
        pageSize: 100,
      });
      return tasks.items.find((task) => task.id === action.taskId) ?? null;
    }
    case "tag.create":
      return null;
    case "tag.delete": {
      const tags = await listAgencyTags(actorUserId, { teamId });
      return tags.items.find((tag) => tag.id === action.tagId) ?? null;
    }
    case "client.create":
      return null;
    case "client.update":
    case "client.archive": {
      const clients = await listAgencyClients(actorUserId, { teamId });
      return clients.items.find((client) => client.id === action.clientId) ?? null;
    }
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export function buildAgencyActionAfter(before: unknown, action: AgencyAction): unknown {
  switch (action.type) {
    case "time_entry.create":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
        id: "(new)",
      };
    case "time_entry.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "time_entry.delete":
      return null;
    case "timer.start":
      return { ...action, id: "(new-timer)" };
    case "timer.stop":
      return null;
    case "timer.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "project.create":
      return { id: "(new)", name: action.name, clientId: action.clientId };
    case "project.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "project.archive":
      return {
        ...(typeof before === "object" && before ? before : {}),
        archived: true,
      };
    case "project.restore":
      return {
        ...(typeof before === "object" && before ? before : {}),
        archived: false,
      };
    case "task.create":
      return { id: "(new)", title: action.title, projectId: action.projectId };
    case "task.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "task.delete":
      return null;
    case "tag.create":
      return { id: "(new)", name: action.name };
    case "tag.delete":
      return null;
    case "client.create":
      return { id: "(new)", name: action.name, category: action.category ?? "external" };
    case "client.update":
      return {
        ...(typeof before === "object" && before ? before : {}),
        ...action,
      };
    case "client.archive":
      return {
        ...(typeof before === "object" && before ? before : {}),
        archived: true,
      };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export async function executeAgencyAction(
  actorUserId: string,
  teamId: string,
  action: AgencyAction,
) {
  switch (action.type) {
    case "time_entry.create":
      return createManualAgencyTimeEntry(actorUserId, {
        teamId,
        projectId: action.projectId,
        taskId: action.taskId,
        startAt: action.startAt,
        endAt: action.endAt,
        description: action.description,
        tagIds: action.tagIds,
        isBillable: action.isBillable,
      });
    case "time_entry.update":
      return updateMyAgencyTimeEntry(actorUserId, {
        teamId,
        entryId: action.entryId,
        projectId: action.projectId,
        taskId: action.taskId,
        startAt: action.startAt,
        endAt: action.endAt,
        description: action.description,
        tagIds: action.tagIds,
        isBillable: action.isBillable,
        isWaste: action.isWaste,
      });
    case "time_entry.delete":
      return deleteMyAgencyTimeEntry(actorUserId, { teamId, entryId: action.entryId });
    case "timer.start":
      return startAgencyTimer(actorUserId, {
        teamId,
        projectId: action.projectId,
        taskId: action.taskId,
        description: action.description,
        tagIds: action.tagIds,
        isBillable: action.isBillable,
      });
    case "timer.stop":
      return stopAgencyTimer(actorUserId, { teamId });
    case "timer.update": {
      if (action.description !== undefined) {
        await updateAgencyActiveTimerDescription(actorUserId, {
          teamId,
          description: action.description,
        });
      }
      if (action.taskId !== undefined) {
        await updateAgencyActiveTimerTask(actorUserId, {
          teamId,
          taskId: action.taskId,
        });
      }
      if (action.startAt !== undefined) {
        await updateAgencyActiveTimerStart(actorUserId, {
          teamId,
          startedAt: action.startAt,
        });
      }
      return getAgencyActiveTimer(actorUserId, { teamId });
    }
    case "project.create":
      return createAgencyProject(actorUserId, {
        teamId,
        clientId: action.clientId,
        name: action.name,
      });
    case "project.update":
      return updateAgencyProject(actorUserId, {
        teamId,
        projectId: action.projectId,
        name: action.name,
        clientId: action.clientId,
      });
    case "project.archive":
      return deleteAgencyProject(actorUserId, { teamId, projectId: action.projectId });
    case "project.restore":
      return restoreAgencyProject(actorUserId, { teamId, projectId: action.projectId });
    case "task.create":
      return createAgencyProjectTask(actorUserId, {
        teamId,
        projectId: action.projectId,
        title: action.title,
        description: action.description,
      });
    case "task.update":
      return updateAgencyProjectTask(actorUserId, {
        teamId,
        taskId: action.taskId,
        title: action.title,
        status: action.status,
      });
    case "task.delete":
      return deleteAgencyProjectTask(actorUserId, { teamId, taskId: action.taskId });
    case "tag.create":
      return createAgencyTag(actorUserId, { teamId, name: action.name });
    case "tag.delete":
      return deleteAgencyTag(actorUserId, { teamId, tagId: action.tagId });
    case "client.create":
      return createAgencyClient(actorUserId, {
        teamId,
        name: action.name,
        category: action.category,
      });
    case "client.update":
      return updateAgencyClient(actorUserId, {
        teamId,
        clientId: action.clientId,
        name: action.name,
      });
    case "client.archive":
      return archiveAgencyClient(actorUserId, { teamId, clientId: action.clientId });
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}

export async function createAgencyProposalRecord(
  actorUserId: string,
  input: {
    teamId: string;
    action: unknown;
    label?: string;
    conversationId?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const action = agencyActionSchema.parse(input.action);
  const before = await loadAgencyActionBefore(actorUserId, input.teamId, action);
  const after = buildAgencyActionAfter(before, action);
  const now = new Date();
  const id = createWorkspaceId("aap");
  const label = input.label?.trim() || agencyActionLabel(action);

  await db.insert(agentAgencyProposal).values({
    id,
    teamId: input.teamId,
    actorUserId,
    conversationId: input.conversationId ?? null,
    messageId: null,
    action,
    beforeState: before,
    afterState: after,
    label,
    status: "pending",
    illustrationArtifactId: null,
    error: null,
    expiresAt: new Date(now.getTime() + PROPOSAL_TTL_MS),
    createdAt: now,
    updatedAt: now,
  });

  return {
    proposalId: id,
    status: "pending" as const,
    action,
    before,
    after,
    label,
  };
}

export async function confirmAgencyPlan(
  actorUserId: string,
  input: { teamId: string; conversationId?: string | null; plan: unknown },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const plan = agencyDraftPlanSchema.parse(input.plan);
  const proposals = [];
  for (const step of plan.steps) {
    proposals.push(
      await createAgencyProposalRecord(actorUserId, {
        teamId: input.teamId,
        action: step.action,
        label: step.label,
        conversationId: input.conversationId,
      }),
    );
  }
  return { planId: plan.planId, proposals };
}

export async function approveAgencyProposal(
  actorUserId: string,
  input: { proposalId: string; teamId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const [row] = await db
    .select()
    .from(agentAgencyProposal)
    .where(
      and(
        eq(agentAgencyProposal.id, input.proposalId),
        eq(agentAgencyProposal.teamId, input.teamId),
        eq(agentAgencyProposal.actorUserId, actorUserId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Proposal not found." });
  }
  if (row.status !== "pending") {
    throw new ORPCError("BAD_REQUEST", { message: `Proposal is ${row.status}.` });
  }
  if (row.expiresAt.getTime() < Date.now()) {
    await db
      .update(agentAgencyProposal)
      .set({ status: "expired", updatedAt: new Date() })
      .where(eq(agentAgencyProposal.id, row.id));
    throw new ORPCError("BAD_REQUEST", { message: "Proposal expired." });
  }

  const action = agencyActionSchema.parse(row.action);
  const currentBefore = await loadAgencyActionBefore(actorUserId, input.teamId, action);
  if (stableJson(currentBefore) !== stableJson(row.beforeState)) {
    await db
      .update(agentAgencyProposal)
      .set({
        status: "failed",
        error: "State changed since proposal; reject and re-propose.",
        updatedAt: new Date(),
      })
      .where(eq(agentAgencyProposal.id, row.id));
    throw new ORPCError("BAD_REQUEST", {
      message: "Underlying data changed. Reject this proposal and ask Orch to propose again.",
    });
  }

  try {
    const result = await executeAgencyAction(actorUserId, input.teamId, action);
    await db
      .update(agentAgencyProposal)
      .set({ status: "executed", updatedAt: new Date(), error: null })
      .where(eq(agentAgencyProposal.id, row.id));
    return {
      proposalId: row.id,
      status: "executed" as const,
      result,
      label: row.label,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Execute failed";
    await db
      .update(agentAgencyProposal)
      .set({ status: "failed", error: message, updatedAt: new Date() })
      .where(eq(agentAgencyProposal.id, row.id));
    throw error;
  }
}

export async function rejectAgencyProposal(
  actorUserId: string,
  input: { proposalId: string; teamId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const [row] = await db
    .select()
    .from(agentAgencyProposal)
    .where(
      and(
        eq(agentAgencyProposal.id, input.proposalId),
        eq(agentAgencyProposal.teamId, input.teamId),
        eq(agentAgencyProposal.actorUserId, actorUserId),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Proposal not found." });
  }
  if (row.status !== "pending") {
    throw new ORPCError("BAD_REQUEST", { message: `Proposal is ${row.status}.` });
  }

  await db
    .update(agentAgencyProposal)
    .set({ status: "rejected", updatedAt: new Date() })
    .where(eq(agentAgencyProposal.id, row.id));

  return { proposalId: row.id, status: "rejected" as const };
}

export function parseAgencyDraftPlan(plan: unknown): AgencyDraftPlan {
  return agencyDraftPlanSchema.parse(plan);
}
