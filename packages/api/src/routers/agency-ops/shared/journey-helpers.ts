import { db } from "@orch/db";
import {
  agencyOpsProjectJourney,
  agencyOpsProjectJourneyStep,
  agencyOpsProjectTask,
  agencyOpsProject,
  type AgencyOpsJourneyStepKind,
} from "@orch/db/schema";
import { ORPCError } from "@orpc/server";
import { and, eq, inArray, asc } from "drizzle-orm";
import { notifyJourneyMilestone } from "../../notifications/fanout";
import { publishAgencyJourneyStepUpdated } from "../live/live";
import {
  type ProjectTaskRow,
  projectTaskColumns,
  loadTaskAssignees,
  type AgencyProjectTaskAssigneeRecord,
} from "./task-helpers";

export async function getJourneyRowForProject(teamId: string, projectId: string) {
  const [row] = await db
    .select({
      id: agencyOpsProjectJourney.id,
      projectId: agencyOpsProjectJourney.projectId,
      createdAt: agencyOpsProjectJourney.createdAt,
      updatedAt: agencyOpsProjectJourney.updatedAt,
    })
    .from(agencyOpsProjectJourney)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectJourney.projectId))
    .where(
      and(eq(agencyOpsProjectJourney.projectId, projectId), eq(agencyOpsProject.teamId, teamId)),
    )
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", {
      message: "Project journey was not found.",
    });
  }

  return row;
}

export function isJourneyStepComplete(
  step: {
    stepKind: "start" | "milestone" | "checkpoint" | "destination";
    taskId: string | null;
  },
  task: ProjectTaskRow | null,
  assignees: AgencyProjectTaskAssigneeRecord[],
): boolean {
  switch (step.stepKind) {
    case "start":
      return true;
    case "destination":
      return false;
    case "milestone":
    case "checkpoint":
      if (task?.status === "done") return true;
      if (assignees.length > 0 && assignees.every((assignee) => assignee.status === "done")) {
        return true;
      }
      return false;
    default: {
      const _exhaustive: never = step.stepKind;
      return _exhaustive;
    }
  }
}

export function deriveJourneyStepStatuses(
  steps: Array<{
    id: string;
    sortOrder: number;
    stepKind: "start" | "milestone" | "checkpoint" | "destination";
    taskId: string | null;
    status: "planned" | "active" | "done" | "blocked";
  }>,
  tasksById: Map<string, ProjectTaskRow>,
  assigneesByTask: Map<string, AgencyProjectTaskAssigneeRecord[]>,
): Map<string, "planned" | "active" | "done" | "blocked"> {
  const result = new Map<string, "planned" | "active" | "done" | "blocked">();
  const sorted = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);

  const completionById = new Map<string, boolean>();
  for (const step of sorted) {
    if (step.stepKind === "destination") continue;
    const task = step.taskId ? (tasksById.get(step.taskId) ?? null) : null;
    const assignees = step.taskId ? (assigneesByTask.get(step.taskId) ?? []) : [];
    completionById.set(step.id, isJourneyStepComplete(step, task, assignees));
  }

  let foundActive = false;
  for (const step of sorted) {
    if (step.status === "blocked") {
      result.set(step.id, "blocked");
      continue;
    }

    if (step.stepKind === "destination") {
      const priorDone = sorted
        .filter((candidate) => candidate.stepKind !== "destination")
        .every((candidate) => completionById.get(candidate.id));
      result.set(step.id, priorDone ? "done" : "planned");
      continue;
    }

    const complete = completionById.get(step.id) ?? false;
    if (complete) {
      result.set(step.id, "done");
      continue;
    }

    if (!foundActive) {
      result.set(step.id, "active");
      foundActive = true;
    } else {
      result.set(step.id, "planned");
    }
  }

  return result;
}

export async function syncJourneyStepStatuses(teamId: string, projectId: string) {
  const journey = await getJourneyRowForProject(teamId, projectId);
  const steps = await db
    .select({
      id: agencyOpsProjectJourneyStep.id,
      label: agencyOpsProjectJourneyStep.label,
      sortOrder: agencyOpsProjectJourneyStep.sortOrder,
      stepKind: agencyOpsProjectJourneyStep.stepKind,
      status: agencyOpsProjectJourneyStep.status,
      taskId: agencyOpsProjectJourneyStep.taskId,
    })
    .from(agencyOpsProjectJourneyStep)
    .where(eq(agencyOpsProjectJourneyStep.journeyId, journey.id))
    .orderBy(asc(agencyOpsProjectJourneyStep.sortOrder));

  const taskIds = steps
    .map((step) => step.taskId)
    .filter((taskId): taskId is string => Boolean(taskId));
  const tasksById = new Map<string, ProjectTaskRow>();
  if (taskIds.length > 0) {
    const taskRows = await db
      .select(projectTaskColumns)
      .from(agencyOpsProjectTask)
      .where(
        and(eq(agencyOpsProjectTask.teamId, teamId), inArray(agencyOpsProjectTask.id, taskIds)),
      );
    for (const task of taskRows) {
      tasksById.set(task.id, task);
    }
  }

  const assigneesByTask = await loadTaskAssignees(taskIds);
  const derived = deriveJourneyStepStatuses(steps, tasksById, assigneesByTask);
  const now = new Date();
  let changed = false;
  const completedMilestones: Array<{
    journeyStepId: string;
    journeyStepLabel: string;
    stepKind: AgencyOpsJourneyStepKind;
  }> = [];

  for (const step of steps) {
    const nextStatus = derived.get(step.id);
    if (!nextStatus || nextStatus === step.status) continue;
    changed = true;
    if (
      nextStatus === "done" &&
      (step.stepKind === "milestone" ||
        step.stepKind === "checkpoint" ||
        step.stepKind === "destination")
    ) {
      completedMilestones.push({
        journeyStepId: step.id,
        journeyStepLabel: step.label,
        stepKind: step.stepKind,
      });
    }
    await db
      .update(agencyOpsProjectJourneyStep)
      .set({ status: nextStatus, updatedAt: now })
      .where(eq(agencyOpsProjectJourneyStep.id, step.id));
  }

  if (changed) {
    await db
      .update(agencyOpsProjectJourney)
      .set({ updatedAt: now })
      .where(eq(agencyOpsProjectJourney.id, journey.id));
  }

  return { changed, completedMilestones };
}

export async function applyJourneySyncNotifications(
  teamId: string,
  projectId: string,
  actorUserId: string | null,
  syncResult: {
    changed: boolean;
    completedMilestones: Array<{
      journeyStepId: string;
      journeyStepLabel: string;
      stepKind: AgencyOpsJourneyStepKind;
    }>;
  },
) {
  if (!syncResult.changed) return;

  await publishAgencyJourneyStepUpdated(teamId, projectId);
  if (syncResult.completedMilestones.length === 0) return;

  const [project] = await db
    .select({ name: agencyOpsProject.name })
    .from(agencyOpsProject)
    .where(and(eq(agencyOpsProject.teamId, teamId), eq(agencyOpsProject.id, projectId)))
    .limit(1);

  const projectName = project?.name ?? "Project";
  for (const milestone of syncResult.completedMilestones) {
    await notifyJourneyMilestone({
      teamId,
      actorUserId,
      projectId,
      projectName,
      journeyStepId: milestone.journeyStepId,
      journeyStepLabel: milestone.journeyStepLabel,
    });
  }
}
