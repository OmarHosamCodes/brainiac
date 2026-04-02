import { db } from "@brainiac/db";
import {
    agencyOpsActiveTimer,
    agencyOpsClient,
    agencyOpsProject,
    agencyOpsSprint,
    agencyOpsSprintItem,
    agencyOpsTimeEntry,
    user,
    workspaceTeamMember,
} from "@brainiac/db/schema";
import { createWorkspaceId, type WorkspaceTeamRole } from "@brainiac/workspace";
import { ORPCError } from "@orpc/server";
import { and, asc, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";

const TEAM_ROLE_WEIGHT: Record<WorkspaceTeamRole, number> = {
    viewer: 1,
    editor: 2,
    owner: 3,
};

type AgencyClientStatus = "active" | "archived";
type AgencyProjectStatus = "planning" | "active" | "paused" | "completed";
type AgencySprintStatus = "planned" | "active" | "completed";
type AgencySprintItemStatus = "todo" | "doing" | "done";
type AgencySprintItemType = "task" | "step";
type AgencyTimeEntrySource = "timer" | "manual";

type AgencyClientRecord = {
    id: string;
    teamId: string;
    name: string;
    brandColor: string;
    status: AgencyClientStatus;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type AgencyProjectRecord = {
    id: string;
    teamId: string;
    clientId: string;
    clientName: string;
    name: string;
    description: string;
    status: AgencyProjectStatus;
    budgetMinutes: number;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type AgencySprintRecord = {
    id: string;
    teamId: string;
    projectId: string;
    projectName: string;
    name: string;
    status: AgencySprintStatus;
    startDate: string | null;
    endDate: string | null;
    completedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type AgencySprintItemRecord = {
    id: string;
    teamId: string;
    projectId: string;
    projectName: string;
    sprintId: string;
    sprintName: string;
    type: AgencySprintItemType;
    title: string;
    description: string;
    status: AgencySprintItemStatus;
    assigneeUserId: string | null;
    assigneeName: string | null;
    estimateMinutes: number;
    position: number;
    archivedAt: string | null;
    createdAt: string;
    updatedAt: string;
};

type AgencyTimeEntryRecord = {
    id: string;
    teamId: string;
    userId: string;
    userName: string;
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    sprintId: string | null;
    sprintName: string | null;
    sprintItemId: string;
    sprintItemTitle: string;
    sprintItemType: AgencySprintItemType;
    source: AgencyTimeEntrySource;
    description: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
    createdAt: string;
    updatedAt: string;
};

type AgencyActiveTimerRecord = {
    id: string;
    teamId: string;
    userId: string;
    projectId: string;
    projectName: string;
    sprintId: string | null;
    sprintName: string | null;
    sprintItemId: string;
    sprintItemTitle: string;
    sprintItemType: AgencySprintItemType;
    description: string;
    startedAt: string;
    createdAt: string;
    updatedAt: string;
};

type AgencyReportEntryRecord = {
    entryId: string;
    date: string;
    startedAt: string;
    endedAt: string;
    durationHours: number;
    memberName: string;
    memberEmail: string;
    clientName: string;
    projectName: string;
    sprintName: string;
    sprintItemTitle: string;
    sprintItemType: AgencySprintItemType;
    source: AgencyTimeEntrySource;
    description: string;
};

type AgencyReportSummary = {
    totalHours: number;
    totalEntries: number;
    burnByProject: Array<{
        projectId: string;
        projectName: string;
        clientId: string;
        clientName: string;
        budgetHours: number;
        loggedHours: number;
        burnPercent: number;
    }>;
    timeDistributionByClient: Array<{
        clientId: string;
        clientName: string;
        hours: number;
    }>;
    timeDistributionByProject: Array<{
        projectId: string;
        projectName: string;
        clientId: string;
        clientName: string;
        hours: number;
    }>;
    teamActivity: Array<{
        userId: string;
        userName: string;
        userEmail: string;
        hours: number;
    }>;
};

function hasRoleAtLeast(role: WorkspaceTeamRole, required: WorkspaceTeamRole) {
    return TEAM_ROLE_WEIGHT[role] >= TEAM_ROLE_WEIGHT[required];
}

async function requireTeamMembership(
    actorUserId: string,
    teamId: string,
    requiredRole: WorkspaceTeamRole = "viewer",
) {
    const [membership] = await db
        .select({ role: workspaceTeamMember.role })
        .from(workspaceTeamMember)
        .where(and(eq(workspaceTeamMember.teamId, teamId), eq(workspaceTeamMember.userId, actorUserId)))
        .limit(1);

    if (!membership) {
        throw new ORPCError("UNAUTHORIZED");
    }

    if (!hasRoleAtLeast(membership.role, requiredRole)) {
        throw new ORPCError("UNAUTHORIZED");
    }

    return membership.role;
}

async function requireTeamUserMembership(teamId: string, memberUserId: string) {
    const [membership] = await db
        .select({ id: workspaceTeamMember.id })
        .from(workspaceTeamMember)
        .where(
            and(
                eq(workspaceTeamMember.teamId, teamId),
                eq(workspaceTeamMember.userId, memberUserId),
            ),
        )
        .limit(1);

    if (!membership) {
        throw new ORPCError("BAD_REQUEST", {
            message: "Assignee must be a team member.",
        });
    }
}

function parseIsoDateTime(value: string, fieldName: string) {
    const parsed = new Date(value);

    if (Number.isNaN(parsed.getTime())) {
        throw new ORPCError("BAD_REQUEST", {
            message: `Invalid ${fieldName}.`,
        });
    }

    return parsed;
}

function validateDateRange(startedAt: Date, endedAt: Date) {
    if (startedAt >= endedAt) {
        throw new ORPCError("BAD_REQUEST", {
            message: "startAt must be before endAt.",
        });
    }
}

function getDurationSeconds(startedAt: Date, endedAt: Date) {
    return Math.max(1, Math.floor((endedAt.getTime() - startedAt.getTime()) / 1_000));
}

function toIso(value: Date | null | undefined) {
    return value ? value.toISOString() : null;
}

function normalizeHexColor(value: string) {
    const trimmed = value.trim();
    const normalized = trimmed.startsWith("#") ? trimmed : `#${trimmed}`;

    if (!/^#[0-9A-Fa-f]{6}$/.test(normalized)) {
        throw new ORPCError("BAD_REQUEST", {
            message: "brandColor must be a valid 6-digit hex color.",
        });
    }

    return normalized.toUpperCase();
}

function getWeekStartUtc(anchor: Date) {
    const utcDay = anchor.getUTCDay();
    const diff = utcDay === 0 ? -6 : 1 - utcDay;
    const start = new Date(
        Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), anchor.getUTCDate() + diff, 0, 0, 0, 0),
    );

    return start;
}

function addDaysUtc(date: Date, days: number) {
    return new Date(date.getTime() + days * 24 * 60 * 60 * 1_000);
}

function formatUtcDateKey(value: Date) {
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, "0");
    const day = String(value.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function escapeCsvCell(value: string | number) {
    const stringified = String(value ?? "");

    if (/[",\n]/.test(stringified)) {
        return `"${stringified.replace(/"/g, '""')}"`;
    }

    return stringified;
}

async function getSprintItemWithContext(teamId: string, sprintItemId: string) {
    const [item] = await db
        .select({
            itemId: agencyOpsSprintItem.id,
            itemType: agencyOpsSprintItem.type,
            itemTitle: agencyOpsSprintItem.title,
            sprintId: agencyOpsSprintItem.sprintId,
            sprintName: agencyOpsSprint.name,
            projectId: agencyOpsSprintItem.projectId,
            projectName: agencyOpsProject.name,
        })
        .from(agencyOpsSprintItem)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsSprintItem.projectId))
        .innerJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsSprintItem.sprintId))
        .where(
            and(
                eq(agencyOpsSprintItem.id, sprintItemId),
                eq(agencyOpsSprintItem.teamId, teamId),
                isNull(agencyOpsSprintItem.archivedAt),
            ),
        )
        .limit(1);

    if (!item) {
        throw new ORPCError("NOT_FOUND", {
            message: "Sprint item was not found.",
        });
    }

    return item;
}

function mapClientRow(row: {
    id: string;
    teamId: string;
    name: string;
    brandColor: string;
    status: AgencyClientStatus;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}): AgencyClientRecord {
    return {
        id: row.id,
        teamId: row.teamId,
        name: row.name,
        brandColor: row.brandColor,
        status: row.status,
        archivedAt: toIso(row.archivedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function mapProjectRow(row: {
    id: string;
    teamId: string;
    clientId: string;
    clientName: string;
    name: string;
    description: string;
    status: AgencyProjectStatus;
    budgetMinutes: number;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}): AgencyProjectRecord {
    return {
        id: row.id,
        teamId: row.teamId,
        clientId: row.clientId,
        clientName: row.clientName,
        name: row.name,
        description: row.description,
        status: row.status,
        budgetMinutes: row.budgetMinutes,
        archivedAt: toIso(row.archivedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function mapSprintRow(row: {
    id: string;
    teamId: string;
    projectId: string;
    projectName: string;
    name: string;
    status: AgencySprintStatus;
    startDate: Date | null;
    endDate: Date | null;
    completedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}): AgencySprintRecord {
    return {
        id: row.id,
        teamId: row.teamId,
        projectId: row.projectId,
        projectName: row.projectName,
        name: row.name,
        status: row.status,
        startDate: toIso(row.startDate),
        endDate: toIso(row.endDate),
        completedAt: toIso(row.completedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function mapSprintItemRow(row: {
    id: string;
    teamId: string;
    projectId: string;
    projectName: string;
    sprintId: string;
    sprintName: string;
    type: AgencySprintItemType;
    title: string;
    description: string;
    status: AgencySprintItemStatus;
    assigneeUserId: string | null;
    assigneeName: string | null;
    estimateMinutes: number;
    position: number;
    archivedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
}): AgencySprintItemRecord {
    return {
        id: row.id,
        teamId: row.teamId,
        projectId: row.projectId,
        projectName: row.projectName,
        sprintId: row.sprintId,
        sprintName: row.sprintName,
        type: row.type,
        title: row.title,
        description: row.description,
        status: row.status,
        assigneeUserId: row.assigneeUserId,
        assigneeName: row.assigneeName,
        estimateMinutes: row.estimateMinutes,
        position: row.position,
        archivedAt: toIso(row.archivedAt),
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

function mapTimeEntryRow(row: {
    id: string;
    teamId: string;
    userId: string;
    userName: string | null;
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    sprintId: string | null;
    sprintName: string | null;
    sprintItemId: string;
    sprintItemTitle: string;
    sprintItemType: AgencySprintItemType;
    source: AgencyTimeEntrySource;
    description: string;
    startedAt: Date;
    endedAt: Date;
    durationSeconds: number;
    createdAt: Date;
    updatedAt: Date;
}): AgencyTimeEntryRecord {
    return {
        id: row.id,
        teamId: row.teamId,
        userId: row.userId,
        userName: row.userName ?? "Unknown",
        projectId: row.projectId,
        projectName: row.projectName,
        clientId: row.clientId,
        clientName: row.clientName,
        sprintId: row.sprintId,
        sprintName: row.sprintName,
        sprintItemId: row.sprintItemId,
        sprintItemTitle: row.sprintItemTitle,
        sprintItemType: row.sprintItemType,
        source: row.source,
        description: row.description,
        startedAt: row.startedAt.toISOString(),
        endedAt: row.endedAt.toISOString(),
        durationSeconds: row.durationSeconds,
        createdAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
    };
}

async function getActiveTimerByUser(userId: string) {
    const [timer] = await db
        .select({
            id: agencyOpsActiveTimer.id,
            teamId: agencyOpsActiveTimer.teamId,
            userId: agencyOpsActiveTimer.userId,
            projectId: agencyOpsActiveTimer.projectId,
            projectName: agencyOpsProject.name,
            sprintId: agencyOpsActiveTimer.sprintId,
            sprintName: agencyOpsSprint.name,
            sprintItemId: agencyOpsActiveTimer.sprintItemId,
            sprintItemTitle: agencyOpsSprintItem.title,
            sprintItemType: agencyOpsSprintItem.type,
            description: agencyOpsActiveTimer.description,
            startedAt: agencyOpsActiveTimer.startedAt,
            createdAt: agencyOpsActiveTimer.createdAt,
            updatedAt: agencyOpsActiveTimer.updatedAt,
        })
        .from(agencyOpsActiveTimer)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
        .leftJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsActiveTimer.sprintId))
        .innerJoin(agencyOpsSprintItem, eq(agencyOpsSprintItem.id, agencyOpsActiveTimer.sprintItemId))
        .where(eq(agencyOpsActiveTimer.userId, userId))
        .limit(1);

    if (!timer) {
        return null;
    }

    return {
        id: timer.id,
        teamId: timer.teamId,
        userId: timer.userId,
        projectId: timer.projectId,
        projectName: timer.projectName,
        sprintId: timer.sprintId,
        sprintName: timer.sprintName,
        sprintItemId: timer.sprintItemId,
        sprintItemTitle: timer.sprintItemTitle,
        sprintItemType: timer.sprintItemType,
        description: timer.description,
        startedAt: timer.startedAt.toISOString(),
        createdAt: timer.createdAt.toISOString(),
        updatedAt: timer.updatedAt.toISOString(),
    } satisfies AgencyActiveTimerRecord;
}

async function getProjectByIdForTeam(teamId: string, projectId: string) {
    const [project] = await db
        .select({
            id: agencyOpsProject.id,
            clientId: agencyOpsProject.clientId,
        })
        .from(agencyOpsProject)
        .where(
            and(
                eq(agencyOpsProject.id, projectId),
                eq(agencyOpsProject.teamId, teamId),
                isNull(agencyOpsProject.archivedAt),
            ),
        )
        .limit(1);

    if (!project) {
        throw new ORPCError("NOT_FOUND", {
            message: "Project was not found.",
        });
    }

    return project;
}

async function getClientByIdForTeam(teamId: string, clientId: string) {
    const [client] = await db
        .select({
            id: agencyOpsClient.id,
        })
        .from(agencyOpsClient)
        .where(and(eq(agencyOpsClient.id, clientId), eq(agencyOpsClient.teamId, teamId)))
        .limit(1);

    if (!client) {
        throw new ORPCError("NOT_FOUND", {
            message: "Client was not found.",
        });
    }
}

async function getSprintByIdForTeam(teamId: string, sprintId: string) {
    const [sprint] = await db
        .select({
            id: agencyOpsSprint.id,
            projectId: agencyOpsSprint.projectId,
        })
        .from(agencyOpsSprint)
        .where(and(eq(agencyOpsSprint.id, sprintId), eq(agencyOpsSprint.teamId, teamId)))
        .limit(1);

    if (!sprint) {
        throw new ORPCError("NOT_FOUND", {
            message: "Sprint was not found.",
        });
    }

    return sprint;
}

async function getReportRows(
    actorUserId: string,
    input: {
        teamId: string;
        from: string;
        to: string;
        clientId?: string;
        projectId?: string;
        memberUserId?: string;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "owner");

    const from = parseIsoDateTime(input.from, "from");
    const to = parseIsoDateTime(input.to, "to");

    if (from > to) {
        throw new ORPCError("BAD_REQUEST", {
            message: "from must be before or equal to to.",
        });
    }

    const filters = [
        eq(agencyOpsTimeEntry.teamId, input.teamId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, from),
        lte(agencyOpsTimeEntry.startedAt, to),
    ];

    if (input.clientId) {
        filters.push(eq(agencyOpsProject.clientId, input.clientId));
    }

    if (input.projectId) {
        filters.push(eq(agencyOpsProject.id, input.projectId));
    }

    if (input.memberUserId) {
        filters.push(eq(agencyOpsTimeEntry.userId, input.memberUserId));
    }

    const rows = await db
        .select({
            entryId: agencyOpsTimeEntry.id,
            startedAt: agencyOpsTimeEntry.startedAt,
            endedAt: agencyOpsTimeEntry.endedAt,
            durationSeconds: agencyOpsTimeEntry.durationSeconds,
            memberName: user.name,
            memberEmail: user.email,
            clientId: agencyOpsClient.id,
            clientName: agencyOpsClient.name,
            projectId: agencyOpsProject.id,
            projectName: agencyOpsProject.name,
            projectBudgetMinutes: agencyOpsProject.budgetMinutes,
            sprintName: agencyOpsSprint.name,
            sprintItemTitle: agencyOpsSprintItem.title,
            sprintItemType: agencyOpsSprintItem.type,
            source: agencyOpsTimeEntry.source,
            description: agencyOpsTimeEntry.description,
        })
        .from(agencyOpsTimeEntry)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
        .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
        .leftJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsTimeEntry.sprintId))
        .innerJoin(agencyOpsSprintItem, eq(agencyOpsSprintItem.id, agencyOpsTimeEntry.sprintItemId))
        .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
        .where(and(...filters))
        .orderBy(desc(agencyOpsTimeEntry.startedAt));

    const scopedProjects = await db
        .select({
            id: agencyOpsProject.id,
            name: agencyOpsProject.name,
            clientId: agencyOpsClient.id,
            clientName: agencyOpsClient.name,
            budgetMinutes: agencyOpsProject.budgetMinutes,
        })
        .from(agencyOpsProject)
        .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
        .where(
            and(
                eq(agencyOpsProject.teamId, input.teamId),
                isNull(agencyOpsProject.archivedAt),
                input.clientId ? eq(agencyOpsProject.clientId, input.clientId) : undefined,
                input.projectId ? eq(agencyOpsProject.id, input.projectId) : undefined,
            ),
        )
        .orderBy(asc(agencyOpsProject.name));

    return {
        rows,
        scopedProjects,
    };
}

export async function listAgencyClients(
    actorUserId: string,
    input: { teamId: string; includeArchived?: boolean },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const rows = await db
        .select({
            id: agencyOpsClient.id,
            teamId: agencyOpsClient.teamId,
            name: agencyOpsClient.name,
            brandColor: agencyOpsClient.brandColor,
            status: agencyOpsClient.status,
            archivedAt: agencyOpsClient.archivedAt,
            createdAt: agencyOpsClient.createdAt,
            updatedAt: agencyOpsClient.updatedAt,
        })
        .from(agencyOpsClient)
        .where(
            and(
                eq(agencyOpsClient.teamId, input.teamId),
                input.includeArchived ? undefined : isNull(agencyOpsClient.archivedAt),
            ),
        )
        .orderBy(asc(agencyOpsClient.name));

    return {
        items: rows.map(mapClientRow),
    };
}

export async function createAgencyClient(
    actorUserId: string,
    input: { teamId: string; name: string; brandColor?: string },
) {
    await requireTeamMembership(actorUserId, input.teamId, "owner");

    const now = new Date();
    const [created] = await db
        .insert(agencyOpsClient)
        .values({
            id: createWorkspaceId("agency-client"),
            teamId: input.teamId,
            name: input.name.trim(),
            brandColor: normalizeHexColor(input.brandColor ?? "#2563EB"),
            status: "active",
            createdByUserId: actorUserId,
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: agencyOpsClient.id,
            teamId: agencyOpsClient.teamId,
            name: agencyOpsClient.name,
            brandColor: agencyOpsClient.brandColor,
            status: agencyOpsClient.status,
            archivedAt: agencyOpsClient.archivedAt,
            createdAt: agencyOpsClient.createdAt,
            updatedAt: agencyOpsClient.updatedAt,
        });

    if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    return mapClientRow(created);
}

export async function updateAgencyClient(
    actorUserId: string,
    input: {
        teamId: string;
        clientId: string;
        name?: string;
        brandColor?: string;
        status?: AgencyClientStatus;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "owner");

    const [current] = await db
        .select({
            archivedAt: agencyOpsClient.archivedAt,
            status: agencyOpsClient.status,
        })
        .from(agencyOpsClient)
        .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
        .limit(1);

    if (!current) {
        throw new ORPCError("NOT_FOUND");
    }

    const now = new Date();
    const nextStatus = input.status ?? current.status;
    const nextArchivedAt =
        nextStatus === "archived"
            ? current.archivedAt ?? now
            : null;

    const [updated] = await db
        .update(agencyOpsClient)
        .set({
            name: input.name?.trim(),
            brandColor: input.brandColor ? normalizeHexColor(input.brandColor) : undefined,
            status: nextStatus,
            archivedAt: nextArchivedAt,
            updatedAt: now,
        })
        .where(and(eq(agencyOpsClient.teamId, input.teamId), eq(agencyOpsClient.id, input.clientId)))
        .returning({
            id: agencyOpsClient.id,
            teamId: agencyOpsClient.teamId,
            name: agencyOpsClient.name,
            brandColor: agencyOpsClient.brandColor,
            status: agencyOpsClient.status,
            archivedAt: agencyOpsClient.archivedAt,
            createdAt: agencyOpsClient.createdAt,
            updatedAt: agencyOpsClient.updatedAt,
        });

    if (!updated) {
        throw new ORPCError("NOT_FOUND");
    }

    return mapClientRow(updated);
}

export async function listAgencyProjects(
    actorUserId: string,
    input: {
        teamId: string;
        clientId?: string;
        includeArchived?: boolean;
        statuses?: AgencyProjectStatus[];
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const rows = await db
        .select({
            id: agencyOpsProject.id,
            teamId: agencyOpsProject.teamId,
            clientId: agencyOpsProject.clientId,
            clientName: agencyOpsClient.name,
            name: agencyOpsProject.name,
            description: agencyOpsProject.description,
            status: agencyOpsProject.status,
            budgetMinutes: agencyOpsProject.budgetMinutes,
            archivedAt: agencyOpsProject.archivedAt,
            createdAt: agencyOpsProject.createdAt,
            updatedAt: agencyOpsProject.updatedAt,
        })
        .from(agencyOpsProject)
        .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
        .where(
            and(
                eq(agencyOpsProject.teamId, input.teamId),
                input.clientId ? eq(agencyOpsProject.clientId, input.clientId) : undefined,
                input.includeArchived ? undefined : isNull(agencyOpsProject.archivedAt),
                input.statuses && input.statuses.length > 0
                    ? inArray(agencyOpsProject.status, input.statuses)
                    : undefined,
            ),
        )
        .orderBy(asc(agencyOpsProject.name));

    return {
        items: rows.map(mapProjectRow),
    };
}

export async function createAgencyProject(
    actorUserId: string,
    input: {
        teamId: string;
        clientId: string;
        name: string;
        description?: string;
        status?: AgencyProjectStatus;
        budgetMinutes?: number;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "owner");
    await getClientByIdForTeam(input.teamId, input.clientId);

    const now = new Date();
    const [created] = await db
        .insert(agencyOpsProject)
        .values({
            id: createWorkspaceId("agency-project"),
            teamId: input.teamId,
            clientId: input.clientId,
            name: input.name.trim(),
            description: input.description?.trim() ?? "",
            status: input.status ?? "planning",
            budgetMinutes: input.budgetMinutes ?? 0,
            createdByUserId: actorUserId,
            createdAt: now,
            updatedAt: now,
        })
        .returning({
            id: agencyOpsProject.id,
            teamId: agencyOpsProject.teamId,
            clientId: agencyOpsProject.clientId,
            name: agencyOpsProject.name,
            description: agencyOpsProject.description,
            status: agencyOpsProject.status,
            budgetMinutes: agencyOpsProject.budgetMinutes,
            archivedAt: agencyOpsProject.archivedAt,
            createdAt: agencyOpsProject.createdAt,
            updatedAt: agencyOpsProject.updatedAt,
        });

    if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    const [client] = await db
        .select({ name: agencyOpsClient.name })
        .from(agencyOpsClient)
        .where(eq(agencyOpsClient.id, created.clientId))
        .limit(1);

    return mapProjectRow({
        ...created,
        clientName: client?.name ?? "Unknown",
    });
}

export async function updateAgencyProject(
    actorUserId: string,
    input: {
        teamId: string;
        projectId: string;
        clientId?: string;
        name?: string;
        description?: string;
        status?: AgencyProjectStatus;
        budgetMinutes?: number;
        archived?: boolean;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "owner");

    if (input.clientId) {
        await getClientByIdForTeam(input.teamId, input.clientId);
    }

    const now = new Date();
    const [updated] = await db
        .update(agencyOpsProject)
        .set({
            clientId: input.clientId,
            name: input.name?.trim(),
            description: input.description?.trim(),
            status: input.status,
            budgetMinutes: input.budgetMinutes,
            archivedAt: input.archived === undefined ? undefined : input.archived ? now : null,
            updatedAt: now,
        })
        .where(and(eq(agencyOpsProject.teamId, input.teamId), eq(agencyOpsProject.id, input.projectId)))
        .returning({
            id: agencyOpsProject.id,
            teamId: agencyOpsProject.teamId,
            clientId: agencyOpsProject.clientId,
            name: agencyOpsProject.name,
            description: agencyOpsProject.description,
            status: agencyOpsProject.status,
            budgetMinutes: agencyOpsProject.budgetMinutes,
            archivedAt: agencyOpsProject.archivedAt,
            createdAt: agencyOpsProject.createdAt,
            updatedAt: agencyOpsProject.updatedAt,
        });

    if (!updated) {
        throw new ORPCError("NOT_FOUND");
    }

    const [client] = await db
        .select({ name: agencyOpsClient.name })
        .from(agencyOpsClient)
        .where(eq(agencyOpsClient.id, updated.clientId))
        .limit(1);

    return mapProjectRow({
        ...updated,
        clientName: client?.name ?? "Unknown",
    });
}

export async function listAgencySprints(
    actorUserId: string,
    input: {
        teamId: string;
        projectId?: string;
        statuses?: AgencySprintStatus[];
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const rows = await db
        .select({
            id: agencyOpsSprint.id,
            teamId: agencyOpsSprint.teamId,
            projectId: agencyOpsSprint.projectId,
            projectName: agencyOpsProject.name,
            name: agencyOpsSprint.name,
            status: agencyOpsSprint.status,
            startDate: agencyOpsSprint.startDate,
            endDate: agencyOpsSprint.endDate,
            completedAt: agencyOpsSprint.completedAt,
            createdAt: agencyOpsSprint.createdAt,
            updatedAt: agencyOpsSprint.updatedAt,
        })
        .from(agencyOpsSprint)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsSprint.projectId))
        .where(
            and(
                eq(agencyOpsSprint.teamId, input.teamId),
                input.projectId ? eq(agencyOpsSprint.projectId, input.projectId) : undefined,
                input.statuses && input.statuses.length > 0
                    ? inArray(agencyOpsSprint.status, input.statuses)
                    : undefined,
            ),
        )
        .orderBy(desc(agencyOpsSprint.createdAt));

    return {
        items: rows.map(mapSprintRow),
    };
}

export async function createAgencySprint(
    actorUserId: string,
    input: {
        teamId: string;
        projectId: string;
        name: string;
        status?: AgencySprintStatus;
        startDate?: string | null;
        endDate?: string | null;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "owner");
    await getProjectByIdForTeam(input.teamId, input.projectId);

    const parsedStartDate = input.startDate ? parseIsoDateTime(input.startDate, "startDate") : null;
    const parsedEndDate = input.endDate ? parseIsoDateTime(input.endDate, "endDate") : null;

    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
        throw new ORPCError("BAD_REQUEST", {
            message: "startDate must be before endDate.",
        });
    }

    const now = new Date();
    const [created] = await db
        .insert(agencyOpsSprint)
        .values({
            id: createWorkspaceId("agency-sprint"),
            teamId: input.teamId,
            projectId: input.projectId,
            name: input.name.trim(),
            status: input.status ?? "planned",
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            createdByUserId: actorUserId,
            createdAt: now,
            updatedAt: now,
            completedAt: input.status === "completed" ? now : null,
        })
        .returning({
            id: agencyOpsSprint.id,
            teamId: agencyOpsSprint.teamId,
            projectId: agencyOpsSprint.projectId,
            name: agencyOpsSprint.name,
            status: agencyOpsSprint.status,
            startDate: agencyOpsSprint.startDate,
            endDate: agencyOpsSprint.endDate,
            completedAt: agencyOpsSprint.completedAt,
            createdAt: agencyOpsSprint.createdAt,
            updatedAt: agencyOpsSprint.updatedAt,
        });

    if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    const [project] = await db
        .select({ name: agencyOpsProject.name })
        .from(agencyOpsProject)
        .where(eq(agencyOpsProject.id, created.projectId))
        .limit(1);

    return mapSprintRow({
        ...created,
        projectName: project?.name ?? "Unknown",
    });
}

export async function updateAgencySprint(
    actorUserId: string,
    input: {
        teamId: string;
        sprintId: string;
        name?: string;
        status?: AgencySprintStatus;
        startDate?: string | null;
        endDate?: string | null;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "owner");

    const parsedStartDate =
        input.startDate === undefined
            ? undefined
            : input.startDate
                ? parseIsoDateTime(input.startDate, "startDate")
                : null;
    const parsedEndDate =
        input.endDate === undefined
            ? undefined
            : input.endDate
                ? parseIsoDateTime(input.endDate, "endDate")
                : null;

    if (parsedStartDate && parsedEndDate && parsedStartDate > parsedEndDate) {
        throw new ORPCError("BAD_REQUEST", {
            message: "startDate must be before endDate.",
        });
    }

    const now = new Date();
    const [updated] = await db
        .update(agencyOpsSprint)
        .set({
            name: input.name?.trim(),
            status: input.status,
            startDate: parsedStartDate,
            endDate: parsedEndDate,
            completedAt: input.status === undefined ? undefined : input.status === "completed" ? now : null,
            updatedAt: now,
        })
        .where(and(eq(agencyOpsSprint.teamId, input.teamId), eq(agencyOpsSprint.id, input.sprintId)))
        .returning({
            id: agencyOpsSprint.id,
            teamId: agencyOpsSprint.teamId,
            projectId: agencyOpsSprint.projectId,
            name: agencyOpsSprint.name,
            status: agencyOpsSprint.status,
            startDate: agencyOpsSprint.startDate,
            endDate: agencyOpsSprint.endDate,
            completedAt: agencyOpsSprint.completedAt,
            createdAt: agencyOpsSprint.createdAt,
            updatedAt: agencyOpsSprint.updatedAt,
        });

    if (!updated) {
        throw new ORPCError("NOT_FOUND");
    }

    const [project] = await db
        .select({ name: agencyOpsProject.name })
        .from(agencyOpsProject)
        .where(eq(agencyOpsProject.id, updated.projectId))
        .limit(1);

    return mapSprintRow({
        ...updated,
        projectName: project?.name ?? "Unknown",
    });
}

export async function listAgencySprintItems(
    actorUserId: string,
    input: {
        teamId: string;
        sprintId: string;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const rows = await db
        .select({
            id: agencyOpsSprintItem.id,
            teamId: agencyOpsSprintItem.teamId,
            projectId: agencyOpsSprintItem.projectId,
            projectName: agencyOpsProject.name,
            sprintId: agencyOpsSprintItem.sprintId,
            sprintName: agencyOpsSprint.name,
            type: agencyOpsSprintItem.type,
            title: agencyOpsSprintItem.title,
            description: agencyOpsSprintItem.description,
            status: agencyOpsSprintItem.status,
            assigneeUserId: agencyOpsSprintItem.assigneeUserId,
            assigneeName: user.name,
            estimateMinutes: agencyOpsSprintItem.estimateMinutes,
            position: agencyOpsSprintItem.position,
            archivedAt: agencyOpsSprintItem.archivedAt,
            createdAt: agencyOpsSprintItem.createdAt,
            updatedAt: agencyOpsSprintItem.updatedAt,
        })
        .from(agencyOpsSprintItem)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsSprintItem.projectId))
        .innerJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsSprintItem.sprintId))
        .leftJoin(user, eq(user.id, agencyOpsSprintItem.assigneeUserId))
        .where(
            and(
                eq(agencyOpsSprintItem.teamId, input.teamId),
                eq(agencyOpsSprintItem.sprintId, input.sprintId),
                isNull(agencyOpsSprintItem.archivedAt),
            ),
        )
        .orderBy(asc(agencyOpsSprintItem.position), asc(agencyOpsSprintItem.createdAt));

    return {
        items: rows.map(mapSprintItemRow),
    };
}

export async function createAgencySprintItem(
    actorUserId: string,
    input: {
        teamId: string;
        sprintId: string;
        projectId: string;
        type?: AgencySprintItemType;
        title: string;
        description?: string;
        status?: AgencySprintItemStatus;
        assigneeUserId?: string | null;
        estimateMinutes?: number;
        position?: number;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const sprint = await getSprintByIdForTeam(input.teamId, input.sprintId);

    if (sprint.projectId !== input.projectId) {
        throw new ORPCError("BAD_REQUEST", {
            message: "Sprint and project must belong to the same scope.",
        });
    }

    if (input.assigneeUserId) {
        await requireTeamUserMembership(input.teamId, input.assigneeUserId);
    }

    const [maxPositionRow] = await db
        .select({ value: sql<number>`coalesce(max(${agencyOpsSprintItem.position}), -1)` })
        .from(agencyOpsSprintItem)
        .where(
            and(
                eq(agencyOpsSprintItem.teamId, input.teamId),
                eq(agencyOpsSprintItem.sprintId, input.sprintId),
                isNull(agencyOpsSprintItem.archivedAt),
            ),
        )
        .limit(1);

    const nextPosition = (maxPositionRow?.value ?? -1) + 1;
    const position = input.position ?? nextPosition;

    const now = new Date();
    const [created] = await db
        .insert(agencyOpsSprintItem)
        .values({
            id: createWorkspaceId("agency-item"),
            teamId: input.teamId,
            projectId: input.projectId,
            sprintId: input.sprintId,
            type: input.type ?? "task",
            title: input.title.trim(),
            description: input.description?.trim() ?? "",
            status: input.status ?? "todo",
            assigneeUserId: input.assigneeUserId ?? null,
            estimateMinutes: input.estimateMinutes ?? 30,
            position,
            createdByUserId: actorUserId,
            createdAt: now,
            updatedAt: now,
        })
        .returning({ id: agencyOpsSprintItem.id });

    if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    const [row] = await db
        .select({
            id: agencyOpsSprintItem.id,
            teamId: agencyOpsSprintItem.teamId,
            projectId: agencyOpsSprintItem.projectId,
            projectName: agencyOpsProject.name,
            sprintId: agencyOpsSprintItem.sprintId,
            sprintName: agencyOpsSprint.name,
            type: agencyOpsSprintItem.type,
            title: agencyOpsSprintItem.title,
            description: agencyOpsSprintItem.description,
            status: agencyOpsSprintItem.status,
            assigneeUserId: agencyOpsSprintItem.assigneeUserId,
            assigneeName: user.name,
            estimateMinutes: agencyOpsSprintItem.estimateMinutes,
            position: agencyOpsSprintItem.position,
            archivedAt: agencyOpsSprintItem.archivedAt,
            createdAt: agencyOpsSprintItem.createdAt,
            updatedAt: agencyOpsSprintItem.updatedAt,
        })
        .from(agencyOpsSprintItem)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsSprintItem.projectId))
        .innerJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsSprintItem.sprintId))
        .leftJoin(user, eq(user.id, agencyOpsSprintItem.assigneeUserId))
        .where(eq(agencyOpsSprintItem.id, created.id))
        .limit(1);

    if (!row) {
        throw new ORPCError("NOT_FOUND");
    }

    return mapSprintItemRow(row);
}

export async function updateAgencySprintItem(
    actorUserId: string,
    input: {
        teamId: string;
        sprintItemId: string;
        sprintId?: string;
        status?: AgencySprintItemStatus;
        title?: string;
        description?: string;
        assigneeUserId?: string | null;
        estimateMinutes?: number;
        position?: number;
        archived?: boolean;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    if (input.assigneeUserId) {
        await requireTeamUserMembership(input.teamId, input.assigneeUserId);
    }

    if (input.sprintId) {
        await getSprintByIdForTeam(input.teamId, input.sprintId);
    }

    const now = new Date();
    const [updated] = await db
        .update(agencyOpsSprintItem)
        .set({
            sprintId: input.sprintId,
            status: input.status,
            title: input.title?.trim(),
            description: input.description?.trim(),
            assigneeUserId: input.assigneeUserId,
            estimateMinutes: input.estimateMinutes,
            position: input.position,
            archivedAt: input.archived === undefined ? undefined : input.archived ? now : null,
            updatedAt: now,
        })
        .where(
            and(
                eq(agencyOpsSprintItem.teamId, input.teamId),
                eq(agencyOpsSprintItem.id, input.sprintItemId),
            ),
        )
        .returning({ id: agencyOpsSprintItem.id });

    if (!updated) {
        throw new ORPCError("NOT_FOUND");
    }

    const [row] = await db
        .select({
            id: agencyOpsSprintItem.id,
            teamId: agencyOpsSprintItem.teamId,
            projectId: agencyOpsSprintItem.projectId,
            projectName: agencyOpsProject.name,
            sprintId: agencyOpsSprintItem.sprintId,
            sprintName: agencyOpsSprint.name,
            type: agencyOpsSprintItem.type,
            title: agencyOpsSprintItem.title,
            description: agencyOpsSprintItem.description,
            status: agencyOpsSprintItem.status,
            assigneeUserId: agencyOpsSprintItem.assigneeUserId,
            assigneeName: user.name,
            estimateMinutes: agencyOpsSprintItem.estimateMinutes,
            position: agencyOpsSprintItem.position,
            archivedAt: agencyOpsSprintItem.archivedAt,
            createdAt: agencyOpsSprintItem.createdAt,
            updatedAt: agencyOpsSprintItem.updatedAt,
        })
        .from(agencyOpsSprintItem)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsSprintItem.projectId))
        .innerJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsSprintItem.sprintId))
        .leftJoin(user, eq(user.id, agencyOpsSprintItem.assigneeUserId))
        .where(eq(agencyOpsSprintItem.id, updated.id))
        .limit(1);

    if (!row) {
        throw new ORPCError("NOT_FOUND");
    }

    return mapSprintItemRow(row);
}

export async function getAgencyActiveTimer(
    actorUserId: string,
    input: { teamId?: string },
) {
    const timer = await getActiveTimerByUser(actorUserId);

    if (!timer) {
        return {
            timer: null,
        };
    }

    await requireTeamMembership(actorUserId, timer.teamId, "viewer");

    if (input.teamId && timer.teamId !== input.teamId) {
        return {
            timer: null,
        };
    }

    return {
        timer,
    };
}

export async function startAgencyTimer(
    actorUserId: string,
    input: {
        teamId: string;
        sprintItemId: string;
        description?: string;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const sprintItem = await getSprintItemWithContext(input.teamId, input.sprintItemId);
    const now = new Date();

    const [existing] = await db
        .select({
            id: agencyOpsActiveTimer.id,
            teamId: agencyOpsActiveTimer.teamId,
            projectId: agencyOpsActiveTimer.projectId,
            sprintId: agencyOpsActiveTimer.sprintId,
            sprintItemId: agencyOpsActiveTimer.sprintItemId,
            description: agencyOpsActiveTimer.description,
            startedAt: agencyOpsActiveTimer.startedAt,
        })
        .from(agencyOpsActiveTimer)
        .where(eq(agencyOpsActiveTimer.userId, actorUserId))
        .limit(1);

    await db.transaction(async (tx) => {
        if (existing) {
            const durationSeconds = getDurationSeconds(existing.startedAt, now);

            await tx.insert(agencyOpsTimeEntry).values({
                id: createWorkspaceId("agency-time"),
                teamId: existing.teamId,
                projectId: existing.projectId,
                sprintId: existing.sprintId,
                sprintItemId: existing.sprintItemId,
                userId: actorUserId,
                source: "timer",
                description: existing.description,
                startedAt: existing.startedAt,
                endedAt: now,
                durationSeconds,
                createdAt: now,
                updatedAt: now,
            });

            await tx
                .delete(agencyOpsActiveTimer)
                .where(eq(agencyOpsActiveTimer.id, existing.id));
        }

        await tx.insert(agencyOpsActiveTimer).values({
            id: createWorkspaceId("agency-active-timer"),
            teamId: input.teamId,
            projectId: sprintItem.projectId,
            sprintId: sprintItem.sprintId,
            sprintItemId: sprintItem.itemId,
            userId: actorUserId,
            description: input.description?.trim() ?? "",
            startedAt: now,
            createdAt: now,
            updatedAt: now,
        });
    });

    const timer = await getActiveTimerByUser(actorUserId);

    return {
        timer,
    };
}

export async function stopAgencyTimer(
    actorUserId: string,
    input: {
        teamId?: string;
        description?: string;
    },
) {
    const [active] = await db
        .select({
            id: agencyOpsActiveTimer.id,
            teamId: agencyOpsActiveTimer.teamId,
            projectId: agencyOpsActiveTimer.projectId,
            sprintId: agencyOpsActiveTimer.sprintId,
            sprintItemId: agencyOpsActiveTimer.sprintItemId,
            description: agencyOpsActiveTimer.description,
            startedAt: agencyOpsActiveTimer.startedAt,
        })
        .from(agencyOpsActiveTimer)
        .where(eq(agencyOpsActiveTimer.userId, actorUserId))
        .limit(1);

    if (!active) {
        return {
            timer: null,
            createdEntry: null,
        };
    }

    await requireTeamMembership(actorUserId, active.teamId, "viewer");

    if (input.teamId && active.teamId !== input.teamId) {
        throw new ORPCError("BAD_REQUEST", {
            message: "Active timer belongs to a different team.",
        });
    }

    const now = new Date();
    const description = input.description?.trim() ?? active.description;
    const durationSeconds = getDurationSeconds(active.startedAt, now);

    const [entry] = await db.transaction(async (tx) => {
        const [created] = await tx
            .insert(agencyOpsTimeEntry)
            .values({
                id: createWorkspaceId("agency-time"),
                teamId: active.teamId,
                projectId: active.projectId,
                sprintId: active.sprintId,
                sprintItemId: active.sprintItemId,
                userId: actorUserId,
                source: "timer",
                description,
                startedAt: active.startedAt,
                endedAt: now,
                durationSeconds,
                createdAt: now,
                updatedAt: now,
            })
            .returning({ id: agencyOpsTimeEntry.id });

        await tx.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, active.id));

        return [created];
    });

    if (!entry) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    const [row] = await db
        .select({
            id: agencyOpsTimeEntry.id,
            teamId: agencyOpsTimeEntry.teamId,
            userId: agencyOpsTimeEntry.userId,
            userName: user.name,
            projectId: agencyOpsTimeEntry.projectId,
            projectName: agencyOpsProject.name,
            clientId: agencyOpsClient.id,
            clientName: agencyOpsClient.name,
            sprintId: agencyOpsTimeEntry.sprintId,
            sprintName: agencyOpsSprint.name,
            sprintItemId: agencyOpsTimeEntry.sprintItemId,
            sprintItemTitle: agencyOpsSprintItem.title,
            sprintItemType: agencyOpsSprintItem.type,
            source: agencyOpsTimeEntry.source,
            description: agencyOpsTimeEntry.description,
            startedAt: agencyOpsTimeEntry.startedAt,
            endedAt: agencyOpsTimeEntry.endedAt,
            durationSeconds: agencyOpsTimeEntry.durationSeconds,
            createdAt: agencyOpsTimeEntry.createdAt,
            updatedAt: agencyOpsTimeEntry.updatedAt,
        })
        .from(agencyOpsTimeEntry)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
        .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
        .leftJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsTimeEntry.sprintId))
        .innerJoin(agencyOpsSprintItem, eq(agencyOpsSprintItem.id, agencyOpsTimeEntry.sprintItemId))
        .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
        .where(eq(agencyOpsTimeEntry.id, entry.id))
        .limit(1);

    return {
        timer: null,
        createdEntry: row ? mapTimeEntryRow(row) : null,
    };
}

export async function listMyAgencyTimeEntries(
    actorUserId: string,
    input: {
        teamId: string;
        page?: number;
        pageSize?: number;
        anchorDate?: string;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const page = Math.max(1, input.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
    const offset = (page - 1) * pageSize;

    const rows = await db
        .select({
            id: agencyOpsTimeEntry.id,
            teamId: agencyOpsTimeEntry.teamId,
            userId: agencyOpsTimeEntry.userId,
            userName: user.name,
            projectId: agencyOpsTimeEntry.projectId,
            projectName: agencyOpsProject.name,
            clientId: agencyOpsClient.id,
            clientName: agencyOpsClient.name,
            sprintId: agencyOpsTimeEntry.sprintId,
            sprintName: agencyOpsSprint.name,
            sprintItemId: agencyOpsTimeEntry.sprintItemId,
            sprintItemTitle: agencyOpsSprintItem.title,
            sprintItemType: agencyOpsSprintItem.type,
            source: agencyOpsTimeEntry.source,
            description: agencyOpsTimeEntry.description,
            startedAt: agencyOpsTimeEntry.startedAt,
            endedAt: agencyOpsTimeEntry.endedAt,
            durationSeconds: agencyOpsTimeEntry.durationSeconds,
            createdAt: agencyOpsTimeEntry.createdAt,
            updatedAt: agencyOpsTimeEntry.updatedAt,
        })
        .from(agencyOpsTimeEntry)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
        .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
        .leftJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsTimeEntry.sprintId))
        .innerJoin(agencyOpsSprintItem, eq(agencyOpsSprintItem.id, agencyOpsTimeEntry.sprintItemId))
        .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
        .where(
            and(
                eq(agencyOpsTimeEntry.teamId, input.teamId),
                eq(agencyOpsTimeEntry.userId, actorUserId),
                isNull(agencyOpsTimeEntry.deletedAt),
            ),
        )
        .orderBy(desc(agencyOpsTimeEntry.startedAt))
        .limit(pageSize)
        .offset(offset);

    const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(agencyOpsTimeEntry)
        .where(
            and(
                eq(agencyOpsTimeEntry.teamId, input.teamId),
                eq(agencyOpsTimeEntry.userId, actorUserId),
                isNull(agencyOpsTimeEntry.deletedAt),
            ),
        );

    const anchor = input.anchorDate ? parseIsoDateTime(input.anchorDate, "anchorDate") : new Date();
    const weekStart = getWeekStartUtc(anchor);
    const weekEnd = addDaysUtc(weekStart, 7);

    const weekEntries = await db
        .select({
            startedAt: agencyOpsTimeEntry.startedAt,
            durationSeconds: agencyOpsTimeEntry.durationSeconds,
        })
        .from(agencyOpsTimeEntry)
        .where(
            and(
                eq(agencyOpsTimeEntry.teamId, input.teamId),
                eq(agencyOpsTimeEntry.userId, actorUserId),
                isNull(agencyOpsTimeEntry.deletedAt),
                gte(agencyOpsTimeEntry.startedAt, weekStart),
                lte(agencyOpsTimeEntry.startedAt, weekEnd),
            ),
        );

    const dailyTotals = new Map<string, number>();

    for (const entry of weekEntries) {
        const key = formatUtcDateKey(entry.startedAt);
        dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + entry.durationSeconds);
    }

    const weekTotalSeconds = weekEntries.reduce(
        (sum, entry) => sum + Number(entry.durationSeconds),
        0,
    );
    const parsedTotal = Number(countRow?.count ?? 0);
    const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

    return {
        items: rows.map(mapTimeEntryRow),
        page,
        pageSize,
        total,
        weekSummary: {
            startDate: weekStart.toISOString(),
            endDate: weekEnd.toISOString(),
            totalSeconds: weekTotalSeconds,
            daily: [...dailyTotals.entries()]
                .sort(([left], [right]) => left.localeCompare(right))
                .map(([date, totalSeconds]) => ({ date, totalSeconds })),
        },
    };
}

export async function createManualAgencyTimeEntry(
    actorUserId: string,
    input: {
        teamId: string;
        sprintItemId: string;
        startAt: string;
        endAt: string;
        description?: string;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const sprintItem = await getSprintItemWithContext(input.teamId, input.sprintItemId);
    const startAt = parseIsoDateTime(input.startAt, "startAt");
    const endAt = parseIsoDateTime(input.endAt, "endAt");
    validateDateRange(startAt, endAt);

    const now = new Date();
    const durationSeconds = getDurationSeconds(startAt, endAt);

    const [created] = await db
        .insert(agencyOpsTimeEntry)
        .values({
            id: createWorkspaceId("agency-time"),
            teamId: input.teamId,
            projectId: sprintItem.projectId,
            sprintId: sprintItem.sprintId,
            sprintItemId: sprintItem.itemId,
            userId: actorUserId,
            source: "manual",
            description: input.description?.trim() ?? "",
            startedAt: startAt,
            endedAt: endAt,
            durationSeconds,
            createdAt: now,
            updatedAt: now,
        })
        .returning({ id: agencyOpsTimeEntry.id });

    if (!created) {
        throw new ORPCError("INTERNAL_SERVER_ERROR");
    }

    const [row] = await db
        .select({
            id: agencyOpsTimeEntry.id,
            teamId: agencyOpsTimeEntry.teamId,
            userId: agencyOpsTimeEntry.userId,
            userName: user.name,
            projectId: agencyOpsTimeEntry.projectId,
            projectName: agencyOpsProject.name,
            clientId: agencyOpsClient.id,
            clientName: agencyOpsClient.name,
            sprintId: agencyOpsTimeEntry.sprintId,
            sprintName: agencyOpsSprint.name,
            sprintItemId: agencyOpsTimeEntry.sprintItemId,
            sprintItemTitle: agencyOpsSprintItem.title,
            sprintItemType: agencyOpsSprintItem.type,
            source: agencyOpsTimeEntry.source,
            description: agencyOpsTimeEntry.description,
            startedAt: agencyOpsTimeEntry.startedAt,
            endedAt: agencyOpsTimeEntry.endedAt,
            durationSeconds: agencyOpsTimeEntry.durationSeconds,
            createdAt: agencyOpsTimeEntry.createdAt,
            updatedAt: agencyOpsTimeEntry.updatedAt,
        })
        .from(agencyOpsTimeEntry)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
        .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
        .leftJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsTimeEntry.sprintId))
        .innerJoin(agencyOpsSprintItem, eq(agencyOpsSprintItem.id, agencyOpsTimeEntry.sprintItemId))
        .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
        .where(eq(agencyOpsTimeEntry.id, created.id))
        .limit(1);

    if (!row) {
        throw new ORPCError("NOT_FOUND");
    }

    return mapTimeEntryRow(row);
}

export async function updateMyAgencyTimeEntry(
    actorUserId: string,
    input: {
        teamId: string;
        entryId: string;
        startAt?: string;
        endAt?: string;
        description?: string;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const [current] = await db
        .select({
            startedAt: agencyOpsTimeEntry.startedAt,
            endedAt: agencyOpsTimeEntry.endedAt,
        })
        .from(agencyOpsTimeEntry)
        .where(
            and(
                eq(agencyOpsTimeEntry.id, input.entryId),
                eq(agencyOpsTimeEntry.teamId, input.teamId),
                eq(agencyOpsTimeEntry.userId, actorUserId),
                isNull(agencyOpsTimeEntry.deletedAt),
            ),
        )
        .limit(1);

    if (!current) {
        throw new ORPCError("NOT_FOUND");
    }

    const nextStartedAt = input.startAt ? parseIsoDateTime(input.startAt, "startAt") : current.startedAt;
    const nextEndedAt = input.endAt ? parseIsoDateTime(input.endAt, "endAt") : current.endedAt;
    validateDateRange(nextStartedAt, nextEndedAt);

    const now = new Date();
    const durationSeconds = getDurationSeconds(nextStartedAt, nextEndedAt);

    const [updated] = await db
        .update(agencyOpsTimeEntry)
        .set({
            startedAt: nextStartedAt,
            endedAt: nextEndedAt,
            durationSeconds,
            description: input.description?.trim(),
            updatedAt: now,
        })
        .where(
            and(
                eq(agencyOpsTimeEntry.id, input.entryId),
                eq(agencyOpsTimeEntry.teamId, input.teamId),
                eq(agencyOpsTimeEntry.userId, actorUserId),
                isNull(agencyOpsTimeEntry.deletedAt),
            ),
        )
        .returning({ id: agencyOpsTimeEntry.id });

    if (!updated) {
        throw new ORPCError("NOT_FOUND");
    }

    const [row] = await db
        .select({
            id: agencyOpsTimeEntry.id,
            teamId: agencyOpsTimeEntry.teamId,
            userId: agencyOpsTimeEntry.userId,
            userName: user.name,
            projectId: agencyOpsTimeEntry.projectId,
            projectName: agencyOpsProject.name,
            clientId: agencyOpsClient.id,
            clientName: agencyOpsClient.name,
            sprintId: agencyOpsTimeEntry.sprintId,
            sprintName: agencyOpsSprint.name,
            sprintItemId: agencyOpsTimeEntry.sprintItemId,
            sprintItemTitle: agencyOpsSprintItem.title,
            sprintItemType: agencyOpsSprintItem.type,
            source: agencyOpsTimeEntry.source,
            description: agencyOpsTimeEntry.description,
            startedAt: agencyOpsTimeEntry.startedAt,
            endedAt: agencyOpsTimeEntry.endedAt,
            durationSeconds: agencyOpsTimeEntry.durationSeconds,
            createdAt: agencyOpsTimeEntry.createdAt,
            updatedAt: agencyOpsTimeEntry.updatedAt,
        })
        .from(agencyOpsTimeEntry)
        .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
        .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
        .leftJoin(agencyOpsSprint, eq(agencyOpsSprint.id, agencyOpsTimeEntry.sprintId))
        .innerJoin(agencyOpsSprintItem, eq(agencyOpsSprintItem.id, agencyOpsTimeEntry.sprintItemId))
        .leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
        .where(eq(agencyOpsTimeEntry.id, updated.id))
        .limit(1);

    if (!row) {
        throw new ORPCError("NOT_FOUND");
    }

    return mapTimeEntryRow(row);
}

export async function deleteMyAgencyTimeEntry(
    actorUserId: string,
    input: {
        teamId: string;
        entryId: string;
    },
) {
    await requireTeamMembership(actorUserId, input.teamId, "viewer");

    const now = new Date();
    const [deleted] = await db
        .update(agencyOpsTimeEntry)
        .set({
            deletedAt: now,
            updatedAt: now,
        })
        .where(
            and(
                eq(agencyOpsTimeEntry.id, input.entryId),
                eq(agencyOpsTimeEntry.teamId, input.teamId),
                eq(agencyOpsTimeEntry.userId, actorUserId),
                isNull(agencyOpsTimeEntry.deletedAt),
            ),
        )
        .returning({ id: agencyOpsTimeEntry.id });

    return {
        entryId: deleted?.id ?? input.entryId,
        deleted: Boolean(deleted),
    };
}

export async function getAgencyReportsSummary(
    actorUserId: string,
    input: {
        teamId: string;
        from: string;
        to: string;
        clientId?: string;
        projectId?: string;
        memberUserId?: string;
    },
) {
    const { rows, scopedProjects } = await getReportRows(actorUserId, input);

    const burnByProjectMap = new Map<
        string,
        {
            projectId: string;
            projectName: string;
            clientId: string;
            clientName: string;
            budgetMinutes: number;
            loggedSeconds: number;
        }
    >();
    const distributionByClient = new Map<string, { clientId: string; clientName: string; seconds: number }>();
    const distributionByProject = new Map<
        string,
        { projectId: string; projectName: string; clientId: string; clientName: string; seconds: number }
    >();
    const teamActivity = new Map<
        string,
        { userId: string; userName: string; userEmail: string; seconds: number }
    >();

    for (const project of scopedProjects) {
        burnByProjectMap.set(project.id, {
            projectId: project.id,
            projectName: project.name,
            clientId: project.clientId,
            clientName: project.clientName,
            budgetMinutes: project.budgetMinutes,
            loggedSeconds: 0,
        });
    }

    let totalSeconds = 0;

    for (const row of rows) {
        totalSeconds += row.durationSeconds;

        const burnEntry = burnByProjectMap.get(row.projectId);

        if (burnEntry) {
            burnEntry.loggedSeconds += row.durationSeconds;
        } else {
            burnByProjectMap.set(row.projectId, {
                projectId: row.projectId,
                projectName: row.projectName,
                clientId: row.clientId,
                clientName: row.clientName,
                budgetMinutes: row.projectBudgetMinutes,
                loggedSeconds: row.durationSeconds,
            });
        }

        const clientEntry = distributionByClient.get(row.clientId) ?? {
            clientId: row.clientId,
            clientName: row.clientName,
            seconds: 0,
        };
        clientEntry.seconds += row.durationSeconds;
        distributionByClient.set(row.clientId, clientEntry);

        const projectEntry = distributionByProject.get(row.projectId) ?? {
            projectId: row.projectId,
            projectName: row.projectName,
            clientId: row.clientId,
            clientName: row.clientName,
            seconds: 0,
        };
        projectEntry.seconds += row.durationSeconds;
        distributionByProject.set(row.projectId, projectEntry);

        const memberEntry = teamActivity.get(row.memberEmail) ?? {
            userId: row.memberEmail,
            userName: row.memberName,
            userEmail: row.memberEmail,
            seconds: 0,
        };
        memberEntry.seconds += row.durationSeconds;
        teamActivity.set(row.memberEmail, memberEntry);
    }

    const summary: AgencyReportSummary = {
        totalHours: Number((totalSeconds / 3_600).toFixed(2)),
        totalEntries: rows.length,
        burnByProject: [...burnByProjectMap.values()]
            .map((entry) => {
                const budgetHours = Number((entry.budgetMinutes / 60).toFixed(2));
                const loggedHours = Number((entry.loggedSeconds / 3_600).toFixed(2));
                const burnPercent =
                    entry.budgetMinutes > 0
                        ? Number(((entry.loggedSeconds / (entry.budgetMinutes * 60)) * 100).toFixed(2))
                        : 0;

                return {
                    projectId: entry.projectId,
                    projectName: entry.projectName,
                    clientId: entry.clientId,
                    clientName: entry.clientName,
                    budgetHours,
                    loggedHours,
                    burnPercent,
                };
            })
            .sort((left, right) => right.loggedHours - left.loggedHours),
        timeDistributionByClient: [...distributionByClient.values()]
            .map((entry) => ({
                clientId: entry.clientId,
                clientName: entry.clientName,
                hours: Number((entry.seconds / 3_600).toFixed(2)),
            }))
            .sort((left, right) => right.hours - left.hours),
        timeDistributionByProject: [...distributionByProject.values()]
            .map((entry) => ({
                projectId: entry.projectId,
                projectName: entry.projectName,
                clientId: entry.clientId,
                clientName: entry.clientName,
                hours: Number((entry.seconds / 3_600).toFixed(2)),
            }))
            .sort((left, right) => right.hours - left.hours),
        teamActivity: [...teamActivity.values()]
            .map((entry) => ({
                userId: entry.userId,
                userName: entry.userName,
                userEmail: entry.userEmail,
                hours: Number((entry.seconds / 3_600).toFixed(2)),
            }))
            .sort((left, right) => right.hours - left.hours),
    };

    return {
        summary,
    };
}

export async function exportAgencyReportsCsv(
    actorUserId: string,
    input: {
        teamId: string;
        from: string;
        to: string;
        clientId?: string;
        projectId?: string;
        memberUserId?: string;
    },
) {
    const { rows } = await getReportRows(actorUserId, input);

    const records: AgencyReportEntryRecord[] = rows.map((row) => ({
        entryId: row.entryId,
        date: formatUtcDateKey(row.startedAt),
        startedAt: row.startedAt.toISOString(),
        endedAt: row.endedAt.toISOString(),
        durationHours: Number((row.durationSeconds / 3_600).toFixed(2)),
        memberName: row.memberName,
        memberEmail: row.memberEmail,
        clientName: row.clientName,
        projectName: row.projectName,
        sprintName: row.sprintName ?? "",
        sprintItemTitle: row.sprintItemTitle,
        sprintItemType: row.sprintItemType,
        source: row.source,
        description: row.description,
    }));

    const header = [
        "entry_id",
        "date",
        "started_at",
        "ended_at",
        "duration_hours",
        "member_name",
        "member_email",
        "client_name",
        "project_name",
        "sprint_name",
        "sprint_item_title",
        "sprint_item_type",
        "source",
        "description",
    ];

    const lines = [
        header.join(","),
        ...records.map((record) =>
            [
                record.entryId,
                record.date,
                record.startedAt,
                record.endedAt,
                record.durationHours,
                record.memberName,
                record.memberEmail,
                record.clientName,
                record.projectName,
                record.sprintName,
                record.sprintItemTitle,
                record.sprintItemType,
                record.source,
                record.description,
            ]
                .map(escapeCsvCell)
                .join(","),
        ),
    ];

    return {
        contentType: "text/csv",
        fileName: `agency-report-${input.teamId}-${Date.now()}.csv`,
        csv: `${lines.join("\n")}\n`,
        totalRows: records.length,
    };
}
