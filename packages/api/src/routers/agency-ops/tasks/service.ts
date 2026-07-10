import {
  user,
  agencyOpsProjectTaskBlueprint,
  agencyOpsProjectTaskAssignee,
  agencyOpsProjectTask,
  agencyOpsProjectTaskMemberStatus,
  agencyOpsTimeEntry,
  agencyOpsProjectJourney,
  agencyOpsProjectJourneyStep,
  agencyOpsProject,
  agencyOpsTaskThread,
  agencyOpsTaskAttachment,
  agencyOpsTaskMessage,
  workspaceTeamMember,
  agencyOpsClient,
} from "@orch/db/schema";
import { ORPCError } from "@orpc/server";
import {
  getTaskAttachmentReadUrl,
  createTaskAttachmentPresignedUploadUrl,
  createTaskAttachmentUploadToken,
  deleteTaskAttachmentFromStorage,
} from "../../../storage";
import { db } from "@orch/db";
import { createWorkspaceId } from "@orch/workspace";
import { eq, sql, and, inArray, isNull, or, exists, desc, asc } from "drizzle-orm";
import { notifyTaskAssigned, notifyTaskMessage } from "../../notifications/fanout";
import { applyMemberTaskCompletion } from "../../../schemas/agency-ops";
import {
  type AgencyProjectTaskBlueprintRecord,
  type DbTransaction,
  setTaskMemberStatusesForUsers,
  type ProjectTaskRow,
  projectTaskColumns,
  setTaskAssignees,
  loadTaskAssignees,
  loadTaskMemberStatuses,
  loadTaskBlueprintsForViewer,
  buildProjectTaskRecord,
} from "../shared/task-helpers";
import { getProjectByIdForTeam, requireTeamMember } from "../shared/lookup-helpers";
import { syncJourneyStepStatuses, applyJourneySyncNotifications } from "../shared/journey-helpers";
import { parseIsoDateTime } from "../shared/date-helpers";
import { formatAvatarUrl } from "../shared/avatar-helpers";
import { requireTeamMembership } from "../shared/membership";
import { normalizeTaskTitle, planAssigneeMerge } from "./task-title";
import { validateTaskAttachmentUploadReferences } from "./validate-task-attachment-upload-references";
import { liveUpdatedAt, publishAgencyLiveEvent, publishAgencyTaskUpdated } from "../live/live";

type AgencyTaskMessageRecord = {
  id: string;
  teamId: string;
  threadId: string;
  userId: string;
  userName: string;
  userAvatar: string | null;
  content: string;
  type: "text" | "voice" | "attachment";
  senderType: "user" | "agent";
  createdAt: string;
  updatedAt: string;
  attachments: AgencyTaskAttachmentRecord[];
};

type AttachmentMetadata = {
  imageWidth?: number;
  imageHeight?: number;
  videoWidth?: number;
  videoHeight?: number;
  durationSeconds?: number;
  fileExtension?: string;
  lastModified?: string;
  mediaKind?: "image" | "video" | "audio" | "document" | "archive" | "other" | "link";
  sourceUrl?: string;
};

function isTaskLinkStorageKey(storageKey: string) {
  return storageKey.startsWith("task-links/");
}

function normalizeTaskLinkUrl(input: string): string {
  const trimmed = input.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const parsed = new URL(withProtocol);
  if (parsed.protocol !== "https:") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Link attachments must use HTTPS URLs.",
    });
  }
  return parsed.href;
}

function deriveTaskLinkLabel(url: string, label?: string | null): string {
  if (label?.trim()) return label.trim().slice(0, 260);
  const parsed = new URL(url);
  const path =
    parsed.pathname !== "/" && parsed.pathname.length > 1
      ? parsed.pathname.replace(/\/$/, "").slice(0, 48)
      : "";
  return (path ? `${parsed.hostname}${path}` : parsed.hostname).slice(0, 260);
}

async function resolveTaskAttachmentUrl(args: {
  storageKey: string;
  metadata: AttachmentMetadata | null;
}): Promise<string | null> {
  if (isTaskLinkStorageKey(args.storageKey)) {
    return args.metadata?.sourceUrl ?? null;
  }
  return getTaskAttachmentReadUrl(args.storageKey);
}

type AgencyTaskAttachmentRecord = {
  id: string;
  teamId: string;
  messageId: string;
  fileName: string;
  mimeType: string;
  storageKey: string;
  sizeBytes: number;
  durationSeconds: number | null;
  metadata: AttachmentMetadata | null;
  createdAt: string;
  url: string | null;
};

async function createTaskBlueprintForViewer(
  teamId: string,
  taskId: string,
  viewerUserId: string,
  description: string,
): Promise<AgencyProjectTaskBlueprintRecord | null> {
  const trimmed = description.trim();
  if (!trimmed) return null;

  const now = new Date();
  const [row] = await db
    .insert(agencyOpsProjectTaskBlueprint)
    .values({
      id: createWorkspaceId("agency-task-blueprint"),
      teamId,
      taskId,
      userId: viewerUserId,
      description: trimmed,
      createdAt: now,
      updatedAt: now,
    })
    .returning({
      id: agencyOpsProjectTaskBlueprint.id,
      description: agencyOpsProjectTaskBlueprint.description,
    });

  return row ?? null;
}

async function addTaskAssignees(tx: DbTransaction, taskId: string, userIds: string[]) {
  const uniqueUserIds = [...new Set(userIds)];
  if (uniqueUserIds.length === 0) return;

  const existingRows = await tx
    .select({ userId: agencyOpsProjectTaskAssignee.userId })
    .from(agencyOpsProjectTaskAssignee)
    .where(eq(agencyOpsProjectTaskAssignee.taskId, taskId));
  const existingUserIds = new Set(existingRows.map((row) => row.userId));
  const addedUserIds = uniqueUserIds.filter((userId) => !existingUserIds.has(userId));
  if (addedUserIds.length === 0) return;

  await tx.insert(agencyOpsProjectTaskAssignee).values(
    addedUserIds.map((userId) => ({
      taskId,
      userId,
    })),
  );
  await setTaskMemberStatusesForUsers(tx, taskId, addedUserIds, "open");
}

function isUniqueViolation(error: unknown): boolean {
  let current: unknown = error;
  for (let depth = 0; depth < 4 && current && typeof current === "object"; depth += 1) {
    if ("code" in current && current.code === "23505") return true;
    current = "cause" in current ? current.cause : undefined;
  }
  return false;
}

/** SQL expression matching normalizeTaskTitle() / unique index. */
function taskTitleKeySql() {
  return sql`lower(trim(regexp_replace(${agencyOpsProjectTask.title}, '\\s+', ' ', 'g')))`;
}

async function findProjectTaskByTitleKey(
  teamId: string,
  projectId: string,
  titleKey: string,
): Promise<ProjectTaskRow | null> {
  const [task] = await db
    .select(projectTaskColumns)
    .from(agencyOpsProjectTask)
    .where(
      and(
        eq(agencyOpsProjectTask.teamId, teamId),
        eq(agencyOpsProjectTask.projectId, projectId),
        sql`${taskTitleKeySql()} = ${titleKey}`,
      ),
    )
    .limit(1);

  return task ?? null;
}

async function mergeAssigneesIntoExistingTask(
  task: ProjectTaskRow,
  input: {
    assignedToTeam: boolean;
    assigneeUserIds: string[];
  },
): Promise<ProjectTaskRow> {
  const existingAssigneeRows = await db
    .select({ userId: agencyOpsProjectTaskAssignee.userId })
    .from(agencyOpsProjectTaskAssignee)
    .where(eq(agencyOpsProjectTaskAssignee.taskId, task.id));

  const plan = planAssigneeMerge({
    existingAssignedToTeam: task.assignedToTeam,
    existingAssigneeIds: existingAssigneeRows.map((row) => row.userId),
    wantAssignedToTeam: input.assignedToTeam,
    wantAssigneeIds: input.assigneeUserIds,
  });

  if (plan.kind === "noop") return task;

  const now = new Date();
  const [updated] = await db.transaction(async (tx) => {
    if (plan.kind === "team") {
      await setTaskAssignees(tx, task.id, []);
      const [row] = await tx
        .update(agencyOpsProjectTask)
        .set({ assignedToTeam: true, updatedAt: now })
        .where(eq(agencyOpsProjectTask.id, task.id))
        .returning(projectTaskColumns);
      return [row];
    }

    await addTaskAssignees(tx, task.id, plan.userIds);
    const [row] = await tx
      .update(agencyOpsProjectTask)
      .set({ updatedAt: now })
      .where(eq(agencyOpsProjectTask.id, task.id))
      .returning(projectTaskColumns);
    return [row];
  });

  return updated ?? task;
}

async function reopenMemberTaskForActor(taskId: string, actorUserId: string) {
  const now = new Date();
  await db
    .update(agencyOpsProjectTaskMemberStatus)
    .set({ status: "open", updatedAt: now })
    .where(
      and(
        eq(agencyOpsProjectTaskMemberStatus.taskId, taskId),
        eq(agencyOpsProjectTaskMemberStatus.userId, actorUserId),
        eq(agencyOpsProjectTaskMemberStatus.status, "done"),
      ),
    );
}

async function buildTaskRecordForActor(task: ProjectTaskRow, actorUserId: string) {
  await reopenMemberTaskForActor(task.id, actorUserId);
  const assigneesByTask = await loadTaskAssignees([task.id]);
  const memberStatuses = await loadTaskMemberStatuses([task.id]);
  const blueprintsByTask = await loadTaskBlueprintsForViewer([task.id], actorUserId);
  return buildProjectTaskRecord(
    task,
    assigneesByTask.get(task.id) ?? [],
    actorUserId,
    memberStatuses.get(task.id),
    blueprintsByTask.get(task.id),
  );
}

async function loadTaskTrackedSeconds(taskIds: string[], userId: string) {
  const totals = new Map<string, number>();
  if (taskIds.length === 0 || !userId) return totals;

  const rows = await db
    .select({
      taskId: agencyOpsTimeEntry.taskId,
      totalSeconds: sql<number>`coalesce(sum(${agencyOpsTimeEntry.durationSeconds}), 0)`,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        inArray(agencyOpsTimeEntry.taskId, taskIds),
        eq(agencyOpsTimeEntry.userId, userId),
        isNull(agencyOpsTimeEntry.deletedAt),
      ),
    )
    .groupBy(agencyOpsTimeEntry.taskId);

  for (const row of rows) {
    if (row.taskId) {
      totals.set(row.taskId, Number(row.totalSeconds));
    }
  }

  return totals;
}

async function maybeSyncJourneyForTask(teamId: string, taskId: string) {
  const [step] = await db
    .select({ projectId: agencyOpsProjectJourney.projectId })
    .from(agencyOpsProjectJourneyStep)
    .innerJoin(
      agencyOpsProjectJourney,
      eq(agencyOpsProjectJourney.id, agencyOpsProjectJourneyStep.journeyId),
    )
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectJourney.projectId))
    .where(and(eq(agencyOpsProjectJourneyStep.taskId, taskId), eq(agencyOpsProject.teamId, teamId)))
    .limit(1);

  if (!step) return;

  const syncResult = await syncJourneyStepStatuses(teamId, step.projectId);
  await applyJourneySyncNotifications(teamId, step.projectId, null, syncResult);
}

export async function listAgencyProjectTasks(
  actorUserId: string,
  input: {
    teamId: string;
    projectId?: string;
    status?: "open" | "in_progress" | "done" | "archived";
    statuses?: ("open" | "in_progress" | "done" | "archived")[];
    assigneeUserId?: string;
    delegatedByUserId?: string;
    journeyDiscoveryForUserId?: string;
    search?: string;
    page?: number;
    pageSize?: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  if (input.projectId) {
    await getProjectByIdForTeam(input.teamId, input.projectId);
  }

  const searchTerm = input.search?.trim().toLowerCase();
  const filters = [eq(agencyOpsProjectTask.teamId, input.teamId)];

  if (input.projectId) {
    filters.push(eq(agencyOpsProjectTask.projectId, input.projectId));
  }

  const requestedStatuses = input.statuses ?? (input.status ? [input.status] : []);
  const filterByMemberStatus = Boolean(input.assigneeUserId && requestedStatuses.length > 0);
  const memberStatusList = requestedStatuses.filter(
    (status): status is "open" | "in_progress" | "done" =>
      status === "open" || status === "in_progress" || status === "done",
  );
  const activeMemberStatuses = memberStatusList.filter(
    (status): status is "open" | "in_progress" => status === "open" || status === "in_progress",
  );
  const wantsDoneByCompletion =
    filterByMemberStatus && memberStatusList.includes("done") && activeMemberStatuses.length === 0;

  const viewerCompletionCountSql = sql`coalesce(
    (
      select ${agencyOpsProjectTaskMemberStatus.completionCount}
      from ${agencyOpsProjectTaskMemberStatus}
      where ${agencyOpsProjectTaskMemberStatus.taskId} = ${agencyOpsProjectTask.id}
        and ${agencyOpsProjectTaskMemberStatus.userId} = ${input.assigneeUserId!}
      limit 1
    ),
    0
  )`;

  if (filterByMemberStatus) {
    if (!requestedStatuses.includes("archived")) {
      filters.push(sql`${agencyOpsProjectTask.status} <> 'archived'`);
    }
    if (wantsDoneByCompletion) {
      filters.push(sql`${viewerCompletionCountSql} > 0`);
    } else if (activeMemberStatuses.length > 0) {
      filters.push(
        sql`coalesce(
          (
            select ${agencyOpsProjectTaskMemberStatus.status}
            from ${agencyOpsProjectTaskMemberStatus}
            where ${agencyOpsProjectTaskMemberStatus.taskId} = ${agencyOpsProjectTask.id}
              and ${agencyOpsProjectTaskMemberStatus.userId} = ${input.assigneeUserId!}
            limit 1
          ),
          'open'
        ) in (${sql.join(
          activeMemberStatuses.map((status) => sql`${status}`),
          sql`, `,
        )})`,
      );
    } else if (requestedStatuses.includes("archived")) {
      filters.push(eq(agencyOpsProjectTask.status, "archived"));
    }
  } else if (requestedStatuses.length > 0) {
    filters.push(inArray(agencyOpsProjectTask.status, requestedStatuses));
  } else {
    filters.push(sql`${agencyOpsProjectTask.status} <> 'archived'`);
  }

  if (input.assigneeUserId) {
    const assigneeSubquery = db
      .select({ one: sql`1` })
      .from(agencyOpsProjectTaskAssignee)
      .where(
        and(
          eq(agencyOpsProjectTaskAssignee.taskId, agencyOpsProjectTask.id),
          eq(agencyOpsProjectTaskAssignee.userId, input.assigneeUserId),
        ),
      );
    filters.push(or(eq(agencyOpsProjectTask.assignedToTeam, true), exists(assigneeSubquery))!);
  }

  if (input.delegatedByUserId) {
    filters.push(eq(agencyOpsProjectTask.createdByUserId, input.delegatedByUserId));
    const otherAssigneeSubquery = db
      .select({ one: sql`1` })
      .from(agencyOpsProjectTaskAssignee)
      .where(
        and(
          eq(agencyOpsProjectTaskAssignee.taskId, agencyOpsProjectTask.id),
          sql`${agencyOpsProjectTaskAssignee.userId} <> ${input.delegatedByUserId}`,
        ),
      );
    filters.push(or(eq(agencyOpsProjectTask.assignedToTeam, true), exists(otherAssigneeSubquery))!);
  }

  if (input.journeyDiscoveryForUserId) {
    filters.push(inArray(agencyOpsProjectTask.taskKind, ["journey_anchor", "journey_milestone"]));
    // ponytail: correlated subquery on projectId; fine at team journey scale.
    filters.push(
      sql`not exists (
        select 1
        from ${agencyOpsProjectTask} milestone_task
        inner join ${agencyOpsProjectTaskAssignee} milestone_assignee
          on milestone_assignee.task_id = milestone_task.id
        where milestone_task.team_id = ${input.teamId}
          and milestone_task.project_id = ${agencyOpsProjectTask.projectId}
          and milestone_task.task_kind = 'journey_milestone'
          and milestone_assignee.user_id = ${input.journeyDiscoveryForUserId}
      )`,
    );
  }

  if (searchTerm) {
    filters.push(sql`lower(${agencyOpsProjectTask.title}) like ${`%${searchTerm}%`}`);
  }

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 50));
  const offset = (page - 1) * pageSize;
  const whereClause = and(...filters);

  const [countRow] = await db
    .select({
      count: wantsDoneByCompletion
        ? sql<number>`coalesce(sum(${viewerCompletionCountSql}), 0)`
        : sql<number>`count(*)`,
    })
    .from(agencyOpsProjectTask)
    .where(whereClause);

  const parsedTotal = Number(countRow?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  const rows = await db
    .select(projectTaskColumns)
    .from(agencyOpsProjectTask)
    .where(whereClause)
    .orderBy(desc(agencyOpsProjectTask.createdAt))
    .limit(pageSize)
    .offset(offset);

  const assigneesByTask = await loadTaskAssignees(rows.map((row) => row.id));
  const memberStatusesByTask = input.assigneeUserId
    ? await loadTaskMemberStatuses(rows.map((row) => row.id))
    : undefined;
  const blueprintsByTask = input.assigneeUserId
    ? await loadTaskBlueprintsForViewer(
        rows.map((row) => row.id),
        input.assigneeUserId,
      )
    : undefined;
  const trackedSecondsByTask = await loadTaskTrackedSeconds(
    rows.map((row) => row.id),
    actorUserId,
  );

  return {
    items: await Promise.all(
      rows.map((row) =>
        buildProjectTaskRecord(
          row,
          assigneesByTask.get(row.id) ?? [],
          input.assigneeUserId,
          memberStatusesByTask?.get(row.id),
          blueprintsByTask?.get(row.id),
        ).then((task) => ({
          ...task,
          totalTrackedSeconds: trackedSecondsByTask.get(row.id) ?? 0,
        })),
      ),
    ),
    page,
    pageSize,
    total,
  };
}

async function getTaskByIdForTeam(teamId: string, taskId: string) {
  const [task] = await db
    .select(projectTaskColumns)
    .from(agencyOpsProjectTask)
    .where(and(eq(agencyOpsProjectTask.id, taskId), eq(agencyOpsProjectTask.teamId, teamId)))
    .limit(1);

  if (!task) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  return task;
}

async function emitTaskAssignedNotification(
  actorUserId: string,
  teamId: string,
  task: {
    id: string;
    title: string;
    projectId: string;
    assignedToTeam: boolean;
    assignees: Array<{ userId: string }>;
  },
  recipientUserIds?: string[],
) {
  const [project] = await db
    .select({ name: agencyOpsProject.name })
    .from(agencyOpsProject)
    .where(eq(agencyOpsProject.id, task.projectId))
    .limit(1);

  await notifyTaskAssigned({
    teamId,
    actorUserId,
    taskId: task.id,
    taskTitle: task.title,
    projectId: task.projectId,
    projectName: project?.name ?? "Project",
    assigneeUserIds: recipientUserIds ?? task.assignees.map((assignee) => assignee.userId),
    assignedToTeam: task.assignedToTeam,
  });
}

export async function createAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    projectId: string;
    title: string;
    status?: "open" | "in_progress" | "done" | "archived";
    assignedToTeam?: boolean;
    assigneeUserIds?: string[];
    dueDate?: string | null;
    description?: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");
  await getProjectByIdForTeam(input.teamId, input.projectId);

  const title = input.title.trim();
  if (!title) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Task title is required.",
    });
  }

  const titleKey = normalizeTaskTitle(title);
  const assignedToTeam = input.assignedToTeam ?? false;
  const assigneeUserIds = assignedToTeam ? [] : [...new Set(input.assigneeUserIds ?? [])];

  if (!assignedToTeam) {
    for (const userId of assigneeUserIds) {
      await requireTeamMember(input.teamId, userId);
    }
  }

  const existing = await findProjectTaskByTitleKey(input.teamId, input.projectId, titleKey);
  if (existing) {
    const merged = await mergeAssigneesIntoExistingTask(existing, {
      assignedToTeam,
      assigneeUserIds,
    });
    await createTaskBlueprintForViewer(
      input.teamId,
      merged.id,
      actorUserId,
      input.description ?? "",
    );
    return buildTaskRecordForActor(merged, actorUserId);
  }

  const now = new Date();
  const taskId = createWorkspaceId("agency-project-task");
  const dueDate = input.dueDate ? parseIsoDateTime(input.dueDate, "dueDate") : null;

  try {
    const [created] = await db.transaction(async (tx) => {
      const [task] = await tx
        .insert(agencyOpsProjectTask)
        .values({
          id: taskId,
          teamId: input.teamId,
          projectId: input.projectId,
          title,
          status: input.status ?? "open",
          assignedToTeam,
          dueDate,
          createdByUserId: actorUserId,
          createdAt: now,
          updatedAt: now,
        })
        .returning(projectTaskColumns);

      if (task) {
        if (assigneeUserIds.length > 0) {
          await setTaskAssignees(tx, task.id, assigneeUserIds);
        }

        await tx.insert(agencyOpsTaskThread).values({
          id: createWorkspaceId("agency-task-thread"),
          teamId: input.teamId,
          taskId: task.id,
          createdAt: now,
          updatedAt: now,
        });
      }

      return [task];
    });

    if (!created) {
      throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    await createTaskBlueprintForViewer(
      input.teamId,
      created.id,
      actorUserId,
      input.description ?? "",
    );

    const record = await buildTaskRecordForActor(created, actorUserId);
    if (record.assignees.length > 0 || record.assignedToTeam) {
      await emitTaskAssignedNotification(actorUserId, input.teamId, record);
    }
    return record;
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    const raced = await findProjectTaskByTitleKey(input.teamId, input.projectId, titleKey);
    if (!raced) throw error;

    const merged = await mergeAssigneesIntoExistingTask(raced, {
      assignedToTeam,
      assigneeUserIds,
    });
    await createTaskBlueprintForViewer(
      input.teamId,
      merged.id,
      actorUserId,
      input.description ?? "",
    );
    return buildTaskRecordForActor(merged, actorUserId);
  }
}

export async function completeAgencyProjectTaskForMember(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const current = await getTaskByIdForTeam(input.teamId, input.taskId);
  if (current.status === "archived") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Archived tasks cannot be updated.",
    });
  }

  const canWork =
    current.assignedToTeam ||
    (
      await db
        .select({ userId: agencyOpsProjectTaskAssignee.userId })
        .from(agencyOpsProjectTaskAssignee)
        .where(
          and(
            eq(agencyOpsProjectTaskAssignee.taskId, input.taskId),
            eq(agencyOpsProjectTaskAssignee.userId, actorUserId),
          ),
        )
        .limit(1)
    ).length > 0;

  if (!canWork) {
    throw new ORPCError("FORBIDDEN", {
      message: "You are not assigned to this task.",
    });
  }

  const now = new Date();
  const firstCompletion = applyMemberTaskCompletion({ completionCount: 0 });
  await db
    .insert(agencyOpsProjectTaskMemberStatus)
    .values({
      taskId: input.taskId,
      userId: actorUserId,
      status: firstCompletion.status,
      completionCount: firstCompletion.completionCount,
      completedAt: now,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsProjectTaskMemberStatus.taskId, agencyOpsProjectTaskMemberStatus.userId],
      set: {
        status: "done",
        completionCount: sql`${agencyOpsProjectTaskMemberStatus.completionCount} + 1`,
        completedAt: now,
        updatedAt: now,
      },
    });

  const assigneesByTask = await loadTaskAssignees([current.id]);
  const memberStatuses = await loadTaskMemberStatuses([current.id]);
  const blueprintsByTask = await loadTaskBlueprintsForViewer([current.id], actorUserId);

  await maybeSyncJourneyForTask(input.teamId, input.taskId);

  return buildProjectTaskRecord(
    current,
    assigneesByTask.get(current.id) ?? [],
    actorUserId,
    memberStatuses.get(current.id),
    blueprintsByTask.get(current.id),
  );
}

export async function updateAgencyProjectTaskBlueprint(
  actorUserId: string,
  input: {
    teamId: string;
    blueprintId: string;
    description: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [existing] = await db
    .select({
      id: agencyOpsProjectTaskBlueprint.id,
      taskId: agencyOpsProjectTaskBlueprint.taskId,
    })
    .from(agencyOpsProjectTaskBlueprint)
    .where(
      and(
        eq(agencyOpsProjectTaskBlueprint.id, input.blueprintId),
        eq(agencyOpsProjectTaskBlueprint.teamId, input.teamId),
        eq(agencyOpsProjectTaskBlueprint.userId, actorUserId),
      ),
    )
    .limit(1);

  if (!existing) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task blueprint was not found.",
    });
  }

  const now = new Date();
  const [updated] = await db
    .update(agencyOpsProjectTaskBlueprint)
    .set({
      description: input.description,
      updatedAt: now,
    })
    .where(eq(agencyOpsProjectTaskBlueprint.id, input.blueprintId))
    .returning({
      id: agencyOpsProjectTaskBlueprint.id,
      description: agencyOpsProjectTaskBlueprint.description,
    });

  if (!updated) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task blueprint was not found.",
    });
  }

  return updated;
}

export async function updateAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    title?: string;
    status?: "open" | "in_progress" | "done" | "archived";
    assignedToTeam?: boolean;
    assigneeUserIds?: string[];
    dueDate?: string | null;
    isWaste?: boolean;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const current = await getTaskByIdForTeam(input.teamId, input.taskId);
  const previousAssigneeIds = new Set(
    (await loadTaskAssignees([input.taskId]))
      .get(input.taskId)
      ?.map((assignee) => assignee.userId) ?? [],
  );

  const title = input.title?.trim();
  if (title === "") {
    throw new ORPCError("BAD_REQUEST", {
      message: "Task title cannot be empty.",
    });
  }

  if (title && normalizeTaskTitle(title) !== normalizeTaskTitle(current.title)) {
    const collision = await findProjectTaskByTitleKey(
      input.teamId,
      current.projectId,
      normalizeTaskTitle(title),
    );
    if (collision && collision.id !== current.id) {
      throw new ORPCError("BAD_REQUEST", {
        message: "A task with this name already exists on this project.",
      });
    }
  }

  const dueDate =
    input.dueDate !== undefined
      ? input.dueDate
        ? parseIsoDateTime(input.dueDate, "dueDate")
        : null
      : current.dueDate;

  let nextAssignedToTeam = current.assignedToTeam;
  let nextAssigneeUserIds: string[] | null = null;

  if (input.assignedToTeam === true) {
    nextAssignedToTeam = true;
    nextAssigneeUserIds = [];
  } else if (input.assignedToTeam === false || input.assigneeUserIds !== undefined) {
    nextAssignedToTeam = false;
    nextAssigneeUserIds = [...new Set(input.assigneeUserIds ?? [])];
    for (const userId of nextAssigneeUserIds) {
      await requireTeamMember(input.teamId, userId);
    }
  }

  const now = new Date();
  const [updated] = await db.transaction(async (tx) => {
    const [task] = await tx
      .update(agencyOpsProjectTask)
      .set({
        ...(title ? { title } : {}),
        ...(input.status ? { status: input.status } : {}),
        ...(input.isWaste !== undefined ? { isWaste: input.isWaste } : {}),
        ...(input.assignedToTeam !== undefined || input.assigneeUserIds !== undefined
          ? { assignedToTeam: nextAssignedToTeam }
          : {}),
        dueDate,
        updatedAt: now,
      })
      .where(
        and(
          eq(agencyOpsProjectTask.teamId, input.teamId),
          eq(agencyOpsProjectTask.id, input.taskId),
        ),
      )
      .returning(projectTaskColumns);

    if (task && nextAssigneeUserIds !== null) {
      await setTaskAssignees(tx, task.id, nextAssigneeUserIds);
    }

    return [task];
  });

  if (!updated) {
    throw new ORPCError("NOT_FOUND");
  }

  if (input.status === "done") {
    await maybeSyncJourneyForTask(input.teamId, input.taskId);
  }

  const assigneesByTask = await loadTaskAssignees([updated.id]);
  const task = await buildProjectTaskRecord(updated, assigneesByTask.get(updated.id) ?? []);

  if (
    input.status !== undefined ||
    input.assigneeUserIds !== undefined ||
    input.assignedToTeam !== undefined
  ) {
    await publishAgencyTaskUpdated(input.teamId, task);
  }

  if (nextAssigneeUserIds !== null || input.assignedToTeam === true) {
    const newlyAssigned = task.assignedToTeam
      ? []
      : task.assignees
          .map((assignee) => assignee.userId)
          .filter((id) => !previousAssigneeIds.has(id));
    if (task.assignedToTeam || newlyAssigned.length > 0) {
      await emitTaskAssignedNotification(
        actorUserId,
        input.teamId,
        task,
        newlyAssigned.length > 0 ? newlyAssigned : undefined,
      );
    }
  }

  return task;
}

export async function deleteAgencyProjectTask(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [deleted] = await db
    .delete(agencyOpsProjectTask)
    .where(
      and(eq(agencyOpsProjectTask.teamId, input.teamId), eq(agencyOpsProjectTask.id, input.taskId)),
    )
    .returning({ id: agencyOpsProjectTask.id });

  if (!deleted) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  return {
    taskId: deleted.id,
    deleted: true,
  };
}

export async function ensureTaskThreadByTaskId(
  actorUserId: string,
  input: { teamId: string; taskId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);

  const [existingThread] = await db
    .select({
      id: agencyOpsTaskThread.id,
      teamId: agencyOpsTaskThread.teamId,
      taskId: agencyOpsTaskThread.taskId,
    })
    .from(agencyOpsTaskThread)
    .where(
      and(
        eq(agencyOpsTaskThread.teamId, input.teamId),
        eq(agencyOpsTaskThread.taskId, input.taskId),
      ),
    )
    .limit(1);

  if (existingThread) {
    return existingThread;
  }

  const now = new Date();
  const [thread] = await db
    .insert(agencyOpsTaskThread)
    .values({
      id: createWorkspaceId("agency-task-thread"),
      teamId: input.teamId,
      taskId: input.taskId,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [agencyOpsTaskThread.taskId],
      set: { updatedAt: sql`${agencyOpsTaskThread.updatedAt}` },
    })
    .returning({
      id: agencyOpsTaskThread.id,
      teamId: agencyOpsTaskThread.teamId,
      taskId: agencyOpsTaskThread.taskId,
    });

  if (!thread || thread.teamId !== input.teamId) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  return thread;
}

async function mapTaskMessageRow(row: {
  id: string;
  teamId: string;
  threadId: string;
  userId: string;
  userName: string | null;
  userAvatar: string | null;
  content: string;
  type: "text" | "voice" | "attachment";
  senderType: "user" | "agent";
  createdAt: Date;
  updatedAt: Date;
}): Promise<AgencyTaskMessageRecord> {
  const attachments = await db
    .select({
      id: agencyOpsTaskAttachment.id,
      teamId: agencyOpsTaskAttachment.teamId,
      messageId: agencyOpsTaskAttachment.messageId,
      fileName: agencyOpsTaskAttachment.fileName,
      mimeType: agencyOpsTaskAttachment.mimeType,
      storageKey: agencyOpsTaskAttachment.storageKey,
      sizeBytes: agencyOpsTaskAttachment.sizeBytes,
      durationSeconds: agencyOpsTaskAttachment.durationSeconds,
      metadata: agencyOpsTaskAttachment.metadata,
      createdAt: agencyOpsTaskAttachment.createdAt,
      deletedAt: agencyOpsTaskAttachment.deletedAt,
    })
    .from(agencyOpsTaskAttachment)
    .where(
      and(eq(agencyOpsTaskAttachment.messageId, row.id), isNull(agencyOpsTaskAttachment.deletedAt)),
    );

  return {
    id: row.id,
    teamId: row.teamId,
    threadId: row.threadId,
    userId: row.userId,
    userName: row.senderType === "agent" ? "Agent" : (row.userName ?? "Unknown"),
    userAvatar: row.senderType === "agent" ? null : formatAvatarUrl(row.userAvatar),
    content: row.content,
    type: row.type,
    senderType: row.senderType,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    attachments: await Promise.all(
      attachments.map(async (a) => ({
        id: a.id,
        teamId: a.teamId,
        messageId: a.messageId,
        fileName: a.fileName,
        mimeType: a.mimeType,
        storageKey: a.storageKey,
        sizeBytes: a.sizeBytes,
        durationSeconds: a.durationSeconds,
        metadata: a.metadata as AttachmentMetadata | null,
        createdAt: a.createdAt.toISOString(),
        url: await resolveTaskAttachmentUrl({
          storageKey: a.storageKey,
          metadata: a.metadata as AttachmentMetadata | null,
        }),
      })),
    ),
  };
}

export async function listTaskThreadMessages(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    page?: number;
    pageSize?: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);
  const thread = await ensureTaskThreadByTaskId(actorUserId, input);

  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: agencyOpsTaskMessage.id,
      teamId: agencyOpsTaskMessage.teamId,
      threadId: agencyOpsTaskMessage.threadId,
      userId: agencyOpsTaskMessage.userId,
      userName: user.name,
      userAvatar: user.image,
      content: agencyOpsTaskMessage.content,
      type: agencyOpsTaskMessage.type,
      senderType: agencyOpsTaskMessage.senderType,
      createdAt: agencyOpsTaskMessage.createdAt,
      updatedAt: agencyOpsTaskMessage.updatedAt,
    })
    .from(agencyOpsTaskMessage)
    .leftJoin(user, eq(user.id, agencyOpsTaskMessage.userId))
    .where(
      and(eq(agencyOpsTaskMessage.threadId, thread.id), isNull(agencyOpsTaskMessage.deletedAt)),
    )
    .orderBy(desc(agencyOpsTaskMessage.createdAt))
    .limit(pageSize)
    .offset(offset);

  const items = await Promise.all(
    rows.map((row) =>
      mapTaskMessageRow({
        ...row,
        userName: row.userName ?? null,
        userAvatar: row.userAvatar ?? null,
        type: row.type as "text" | "voice" | "attachment",
        senderType: row.senderType as "user" | "agent",
      }),
    ),
  );

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(agencyOpsTaskMessage)
    .where(
      and(eq(agencyOpsTaskMessage.threadId, thread.id), isNull(agencyOpsTaskMessage.deletedAt)),
    );

  const parsedTotal = Number(countRow?.count ?? 0);
  const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

  return {
    items,
    page,
    pageSize,
    total,
  };
}

export async function getTaskThreadMessageById(
  actorUserId: string,
  input: { teamId: string; messageId: string },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [row] = await db
    .select({
      id: agencyOpsTaskMessage.id,
      teamId: agencyOpsTaskMessage.teamId,
      threadId: agencyOpsTaskMessage.threadId,
      userId: agencyOpsTaskMessage.userId,
      userName: user.name,
      userAvatar: user.image,
      content: agencyOpsTaskMessage.content,
      type: agencyOpsTaskMessage.type,
      senderType: agencyOpsTaskMessage.senderType,
      createdAt: agencyOpsTaskMessage.createdAt,
      updatedAt: agencyOpsTaskMessage.updatedAt,
    })
    .from(agencyOpsTaskMessage)
    .leftJoin(user, eq(user.id, agencyOpsTaskMessage.userId))
    .where(
      and(
        eq(agencyOpsTaskMessage.id, input.messageId),
        eq(agencyOpsTaskMessage.teamId, input.teamId),
        isNull(agencyOpsTaskMessage.deletedAt),
      ),
    )
    .limit(1);

  if (!row) {
    throw new ORPCError("NOT_FOUND", { message: "Message was not found." });
  }

  return mapTaskMessageRow({
    ...row,
    userName: row.userName ?? null,
    userAvatar: row.userAvatar ?? null,
    type: row.type as "text" | "voice" | "attachment",
    senderType: row.senderType as "user" | "agent",
  });
}

export async function createTaskThreadMessage(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    content: string;
    type?: "text" | "voice" | "attachment";
    attachments?: Array<{
      fileName: string;
      mimeType: string;
      storageKey: string;
      sizeBytes: number;
      durationSeconds?: number | null;
      uploadToken: string;
      metadata?: AttachmentMetadata | null;
    }>;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);
  const thread = await ensureTaskThreadByTaskId(actorUserId, input);

  const type = input.type ?? "text";
  const content = input.content.trim();

  if (type === "text" && !content) {
    throw new ORPCError("BAD_REQUEST", {
      message: "Message content is required.",
    });
  }

  validateTaskAttachmentUploadReferences(input);

  const now = new Date();
  const messageId = createWorkspaceId("agency-task-message");

  const [created] = await db.transaction(async (tx) => {
    const [message] = await tx
      .insert(agencyOpsTaskMessage)
      .values({
        id: messageId,
        teamId: input.teamId,
        threadId: thread.id,
        userId: actorUserId,
        content,
        type,
        senderType: "user",
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: agencyOpsTaskMessage.id,
        teamId: agencyOpsTaskMessage.teamId,
        threadId: agencyOpsTaskMessage.threadId,
        userId: agencyOpsTaskMessage.userId,
        content: agencyOpsTaskMessage.content,
        type: agencyOpsTaskMessage.type,
        createdAt: agencyOpsTaskMessage.createdAt,
        updatedAt: agencyOpsTaskMessage.updatedAt,
      });

    if (input.attachments && input.attachments.length > 0 && message) {
      await tx.insert(agencyOpsTaskAttachment).values(
        input.attachments.map((attachment) => ({
          id: createWorkspaceId("agency-task-attachment"),
          teamId: input.teamId,
          messageId: message.id,
          fileName: attachment.fileName,
          mimeType: attachment.mimeType,
          storageKey: attachment.storageKey,
          sizeBytes: attachment.sizeBytes,
          durationSeconds: attachment.durationSeconds ?? null,
          metadata: attachment.metadata ?? null,
          createdAt: now,
        })),
      );
    }

    return [message];
  });

  if (!created) {
    throw new ORPCError("INTERNAL_SERVER_ERROR");
  }

  await db
    .update(agencyOpsTaskThread)
    .set({ updatedAt: now })
    .where(eq(agencyOpsTaskThread.id, thread.id));

  const message = await getTaskThreadMessageById(actorUserId, {
    teamId: input.teamId,
    messageId: created.id,
  });

  await publishAgencyLiveEvent(input.teamId, {
    type: "taskMessage.created",
    teamId: input.teamId,
    taskId: input.taskId,
    updatedAt: liveUpdatedAt(message.updatedAt),
    message,
  });

  const task = await getTaskByIdForTeam(input.teamId, input.taskId);
  const assignees = (await loadTaskAssignees([input.taskId])).get(input.taskId) ?? [];
  const [project] = await db
    .select({ name: agencyOpsProject.name })
    .from(agencyOpsProject)
    .where(eq(agencyOpsProject.id, task.projectId))
    .limit(1);
  const preview = message.content.trim().slice(0, 140);

  await notifyTaskMessage({
    teamId: input.teamId,
    actorUserId,
    taskId: input.taskId,
    taskTitle: task.title,
    projectId: task.projectId,
    projectName: project?.name ?? "Project",
    messageId: message.id,
    messagePreview: preview,
    assigneeUserIds: assignees.map((assignee) => assignee.userId),
  });

  return message;
}

export async function createTaskAttachmentPresignedUrl(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);

  const extension = input.fileName.split(".").pop() ?? "";
  const storageKey = `task-attachments/${input.teamId}/${input.taskId}/${createWorkspaceId("upload")}${extension ? `.${extension}` : ""}`;

  const { uploadUrl, publicUrl } = await createTaskAttachmentPresignedUploadUrl({
    storageKey,
    mimeType: input.mimeType,
    sizeBytes: input.sizeBytes,
  });

  return {
    storageKey,
    publicUrl,
    uploadUrl,
    uploadToken: createTaskAttachmentUploadToken({
      teamId: input.teamId,
      taskId: input.taskId,
      fileName: input.fileName,
      mimeType: input.mimeType,
      storageKey,
      sizeBytes: input.sizeBytes,
    }),
  };
}

export async function createTaskLinkAttachment(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    url: string;
    label?: string | null;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);

  const sourceUrl = normalizeTaskLinkUrl(input.url);
  const fileName = deriveTaskLinkLabel(sourceUrl, input.label);
  const storageKey = `task-links/${input.teamId}/${input.taskId}/${createWorkspaceId("link")}`;
  const mimeType = "text/uri-list";

  return {
    storageKey,
    publicUrl: sourceUrl,
    fileName,
    mimeType,
    sizeBytes: 0,
    metadata: {
      mediaKind: "link" as const,
      sourceUrl,
    },
    uploadToken: createTaskAttachmentUploadToken({
      teamId: input.teamId,
      taskId: input.taskId,
      fileName,
      mimeType,
      storageKey,
      sizeBytes: 0,
    }),
  };
}

export async function deleteTaskAttachment(
  actorUserId: string,
  input: {
    teamId: string;
    attachmentId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "owner");

  const [attachment] = await db
    .select({
      id: agencyOpsTaskAttachment.id,
      teamId: agencyOpsTaskAttachment.teamId,
      storageKey: agencyOpsTaskAttachment.storageKey,
      deletedAt: agencyOpsTaskAttachment.deletedAt,
    })
    .from(agencyOpsTaskAttachment)
    .where(
      and(
        eq(agencyOpsTaskAttachment.id, input.attachmentId),
        eq(agencyOpsTaskAttachment.teamId, input.teamId),
      ),
    )
    .limit(1);

  if (!attachment) {
    throw new ORPCError("NOT_FOUND", {
      message: "Attachment was not found.",
    });
  }

  if (attachment.deletedAt) {
    return {
      attachmentId: attachment.id,
      deleted: true,
    };
  }

  const now = new Date();

  if (!isTaskLinkStorageKey(attachment.storageKey)) {
    await deleteTaskAttachmentFromStorage(attachment.storageKey);
  }
  await db
    .update(agencyOpsTaskAttachment)
    .set({ deletedAt: now })
    .where(eq(agencyOpsTaskAttachment.id, attachment.id));

  return {
    attachmentId: attachment.id,
    deleted: true,
  };
}

export async function listTaskThreadMembers(
  actorUserId: string,
  input: {
    teamId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const members = await db
    .select({
      userId: workspaceTeamMember.userId,
      userName: user.name,
      userAvatar: user.image,
    })
    .from(workspaceTeamMember)
    .leftJoin(user, eq(user.id, workspaceTeamMember.userId))
    .where(eq(workspaceTeamMember.teamId, input.teamId))
    .orderBy(asc(user.name));

  return {
    items: members.map((m) => ({
      userId: m.userId,
      userName: m.userName ?? "Unknown",
      userAvatar: formatAvatarUrl(m.userAvatar),
    })),
  };
}

export async function getTaskThreadContext(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");

  const [context] = await db
    .select({
      taskId: agencyOpsProjectTask.id,
      taskTitle: agencyOpsProjectTask.title,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      taskStatus: agencyOpsProjectTask.status,
      projectId: agencyOpsProject.id,
      projectName: agencyOpsProject.name,
      clientId: agencyOpsClient.id,
      clientName: agencyOpsClient.name,
      assignedToTeam: agencyOpsProjectTask.assignedToTeam,
    })
    .from(agencyOpsProjectTask)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsProjectTask.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(
      and(eq(agencyOpsProjectTask.id, input.taskId), eq(agencyOpsProjectTask.teamId, input.teamId)),
    )
    .limit(1);

  if (!context) {
    throw new ORPCError("NOT_FOUND", {
      message: "Task was not found.",
    });
  }

  const assigneesByTask = await loadTaskAssignees([context.taskId]);
  const assignees = assigneesByTask.get(context.taskId) ?? [];

  return {
    ...context,
    assignees: assignees.map((assignee) => ({
      userId: assignee.userId,
      userName: assignee.userName,
      userAvatar: assignee.userAvatar,
    })),
    assigneeName:
      context.assignedToTeam || assignees.length > 0
        ? context.assignedToTeam
          ? "Entire team"
          : assignees.map((assignee) => assignee.userName).join(", ")
        : null,
  };
}

export async function listRecentTaskThreadMessages(
  actorUserId: string,
  input: {
    teamId: string;
    taskId: string;
    limit?: number;
  },
) {
  await requireTeamMembership(actorUserId, input.teamId, "viewer");
  await getTaskByIdForTeam(input.teamId, input.taskId);
  const thread = await ensureTaskThreadByTaskId(actorUserId, input);

  const limit = Math.min(50, Math.max(1, input.limit ?? 20));

  const rows = await db
    .select({
      id: agencyOpsTaskMessage.id,
      teamId: agencyOpsTaskMessage.teamId,
      threadId: agencyOpsTaskMessage.threadId,
      userId: agencyOpsTaskMessage.userId,
      userName: user.name,
      userAvatar: user.image,
      content: agencyOpsTaskMessage.content,
      type: agencyOpsTaskMessage.type,
      senderType: agencyOpsTaskMessage.senderType,
      createdAt: agencyOpsTaskMessage.createdAt,
      updatedAt: agencyOpsTaskMessage.updatedAt,
    })
    .from(agencyOpsTaskMessage)
    .leftJoin(user, eq(user.id, agencyOpsTaskMessage.userId))
    .where(
      and(eq(agencyOpsTaskMessage.threadId, thread.id), isNull(agencyOpsTaskMessage.deletedAt)),
    )
    .orderBy(desc(agencyOpsTaskMessage.createdAt))
    .limit(limit);

  const items = await Promise.all(
    rows.map((row) =>
      mapTaskMessageRow({
        ...row,
        userName: row.userName ?? null,
        userAvatar: row.userAvatar ?? null,
        type: row.type as "text" | "voice" | "attachment",
        senderType: row.senderType as "user" | "agent",
      }),
    ),
  );

  return {
    items: items.reverse(),
  };
}
