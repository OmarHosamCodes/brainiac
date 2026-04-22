import { db } from "@brainiac/db";
import {
	agencyOpsActiveTimer,
	agencyOpsActiveTimerTag,
	agencyOpsClient,
	agencyOpsProject,
	agencyOpsTag,
	agencyOpsTimeEntry,
	agencyOpsTimeEntryTag,
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

type AgencyTimeEntrySource = "timer" | "manual";

type AgencyClientRecord = {
	id: string;
	teamId: string;
	name: string;
	createdAt: string;
	updatedAt: string;
};

type AgencyProjectRecord = {
	id: string;
	teamId: string;
	clientId: string;
	clientName: string;
	name: string;
	createdAt: string;
	updatedAt: string;
};

type AgencyTagRecord = {
	id: string;
	teamId: string;
	name: string;
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
	tags: AgencyTagRecord[];
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
	tags: AgencyTagRecord[];
	description: string;
	startedAt: string;
	createdAt: string;
	updatedAt: string;
};

type AgencyReportSummary = {
	totalHours: number;
	totalEntries: number;
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
		.where(
			and(
				eq(workspaceTeamMember.teamId, teamId),
				eq(workspaceTeamMember.userId, actorUserId),
			),
		)
		.limit(1);

	if (!membership) {
		throw new ORPCError("UNAUTHORIZED");
	}

	if (!hasRoleAtLeast(membership.role, requiredRole)) {
		throw new ORPCError("UNAUTHORIZED");
	}

	return membership.role;
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

function getWeekStartUtc(anchor: Date) {
	const utcDay = anchor.getUTCDay();
	const diff = utcDay === 0 ? -6 : 1 - utcDay;
	const start = new Date(
		Date.UTC(
			anchor.getUTCFullYear(),
			anchor.getUTCMonth(),
			anchor.getUTCDate() + diff,
			0,
			0,
			0,
			0,
		),
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

function mapClientRow(row: {
	id: string;
	teamId: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}): AgencyClientRecord {
	return {
		id: row.id,
		teamId: row.teamId,
		name: row.name,
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
	createdAt: Date;
	updatedAt: Date;
}): AgencyProjectRecord {
	return {
		id: row.id,
		teamId: row.teamId,
		clientId: row.clientId,
		clientName: row.clientName,
		name: row.name,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	};
}

function mapTagRow(row: {
	id: string;
	teamId: string;
	name: string;
	createdAt: Date;
	updatedAt: Date;
}): AgencyTagRecord {
	return {
		id: row.id,
		teamId: row.teamId,
		name: row.name,
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
			description: agencyOpsActiveTimer.description,
			startedAt: agencyOpsActiveTimer.startedAt,
			createdAt: agencyOpsActiveTimer.createdAt,
			updatedAt: agencyOpsActiveTimer.updatedAt,
		})
		.from(agencyOpsActiveTimer)
		.innerJoin(
			agencyOpsProject,
			eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId),
		)
		.where(eq(agencyOpsActiveTimer.userId, userId))
		.limit(1);

	if (!timer) {
		return null;
	}

	const tags = await db
		.select({
			id: agencyOpsTag.id,
			teamId: agencyOpsTag.teamId,
			name: agencyOpsTag.name,
			createdAt: agencyOpsTag.createdAt,
			updatedAt: agencyOpsTag.updatedAt,
		})
		.from(agencyOpsActiveTimerTag)
		.innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsActiveTimerTag.tagId))
		.where(eq(agencyOpsActiveTimerTag.activeTimerId, timer.id));

	return {
		id: timer.id,
		teamId: timer.teamId,
		userId: timer.userId,
		projectId: timer.projectId,
		projectName: timer.projectName,
		tags: tags.map(mapTagRow),
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
			source: agencyOpsTimeEntry.source,
			description: agencyOpsTimeEntry.description,
		})
		.from(agencyOpsTimeEntry)
		.innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
		.innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
		.innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
		.where(and(...filters))
		.orderBy(desc(agencyOpsTimeEntry.startedAt));

	const scopedProjects = await db
		.select({
			id: agencyOpsProject.id,
			name: agencyOpsProject.name,
			clientId: agencyOpsClient.id,
			clientName: agencyOpsClient.name,
		})
		.from(agencyOpsProject)
		.innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
		.where(
			and(
				eq(agencyOpsProject.teamId, input.teamId),
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
	input: { teamId: string },
) {
	await requireTeamMembership(actorUserId, input.teamId, "viewer");

	const rows = await db
		.select({
			id: agencyOpsClient.id,
			teamId: agencyOpsClient.teamId,
			name: agencyOpsClient.name,
			createdAt: agencyOpsClient.createdAt,
			updatedAt: agencyOpsClient.updatedAt,
		})
		.from(agencyOpsClient)
		.where(eq(agencyOpsClient.teamId, input.teamId))
		.orderBy(asc(agencyOpsClient.name));

	return {
		items: rows.map(mapClientRow),
	};
}

export async function createAgencyClient(
	actorUserId: string,
	input: { teamId: string; name: string },
) {
	await requireTeamMembership(actorUserId, input.teamId, "owner");

	const now = new Date();
	const [created] = await db
		.insert(agencyOpsClient)
		.values({
			id: createWorkspaceId("agency-client"),
			teamId: input.teamId,
			name: input.name.trim(),
			createdByUserId: actorUserId,
			createdAt: now,
			updatedAt: now,
		})
		.returning({
			id: agencyOpsClient.id,
			teamId: agencyOpsClient.teamId,
			name: agencyOpsClient.name,
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
	},
) {
	await requireTeamMembership(actorUserId, input.teamId, "owner");

	const [current] = await db
		.select({
			id: agencyOpsClient.id,
		})
		.from(agencyOpsClient)
		.where(
			and(
				eq(agencyOpsClient.teamId, input.teamId),
				eq(agencyOpsClient.id, input.clientId),
			),
		)
		.limit(1);

	if (!current) {
		throw new ORPCError("NOT_FOUND");
	}

	const now = new Date();

	const [updated] = await db
		.update(agencyOpsClient)
		.set({
			name: input.name?.trim(),
			updatedAt: now,
		})
		.where(
			and(
				eq(agencyOpsClient.teamId, input.teamId),
				eq(agencyOpsClient.id, input.clientId),
			),
		)
		.returning({
			id: agencyOpsClient.id,
			teamId: agencyOpsClient.teamId,
			name: agencyOpsClient.name,
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
			createdAt: agencyOpsProject.createdAt,
			updatedAt: agencyOpsProject.updatedAt,
		})
		.from(agencyOpsProject)
		.innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
		.where(
			and(
				eq(agencyOpsProject.teamId, input.teamId),
				input.clientId ? eq(agencyOpsProject.clientId, input.clientId) : undefined,
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
			createdByUserId: actorUserId,
			createdAt: now,
			updatedAt: now,
		})
		.returning({
			id: agencyOpsProject.id,
			teamId: agencyOpsProject.teamId,
			clientId: agencyOpsProject.clientId,
			name: agencyOpsProject.name,
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
			updatedAt: now,
		})
		.where(
			and(
				eq(agencyOpsProject.teamId, input.teamId),
				eq(agencyOpsProject.id, input.projectId),
			),
		)
		.returning({
			id: agencyOpsProject.id,
			teamId: agencyOpsProject.teamId,
			clientId: agencyOpsProject.clientId,
			name: agencyOpsProject.name,
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

export async function listTags(
	actorUserId: string,
	input: { teamId: string },
) {
	await requireTeamMembership(actorUserId, input.teamId, "viewer");

	const rows = await db
		.select({
			id: agencyOpsTag.id,
			teamId: agencyOpsTag.teamId,
			name: agencyOpsTag.name,
			createdAt: agencyOpsTag.createdAt,
			updatedAt: agencyOpsTag.updatedAt,
		})
		.from(agencyOpsTag)
		.where(eq(agencyOpsTag.teamId, input.teamId))
		.orderBy(asc(agencyOpsTag.name));

	return {
		items: rows.map(mapTagRow),
	};
}

export async function createTag(
	actorUserId: string,
	input: { teamId: string; name: string },
) {
	await requireTeamMembership(actorUserId, input.teamId, "owner");

	const now = new Date();
	const [created] = await db
		.insert(agencyOpsTag)
		.values({
			id: createWorkspaceId("agency-tag"),
			teamId: input.teamId,
			name: input.name.trim(),
			createdByUserId: actorUserId,
			createdAt: now,
			updatedAt: now,
		})
		.returning({
			id: agencyOpsTag.id,
			teamId: agencyOpsTag.teamId,
			name: agencyOpsTag.name,
			createdAt: agencyOpsTag.createdAt,
			updatedAt: agencyOpsTag.updatedAt,
		});

	if (!created) {
		throw new ORPCError("INTERNAL_SERVER_ERROR");
	}

	return mapTagRow(created);
}

export async function deleteTag(
	actorUserId: string,
	input: { teamId: string; tagId: string },
) {
	await requireTeamMembership(actorUserId, input.teamId, "owner");

	const [tag] = await db
		.select({ id: agencyOpsTag.id })
		.from(agencyOpsTag)
		.where(
			and(
				eq(agencyOpsTag.id, input.tagId),
				eq(agencyOpsTag.teamId, input.teamId),
			),
		)
		.limit(1);

	if (!tag) {
		throw new ORPCError("NOT_FOUND", {
			message: "Tag was not found.",
		});
	}

	await db.delete(agencyOpsTag).where(eq(agencyOpsTag.id, input.tagId));

	return {
		tagId: input.tagId,
		deleted: true,
	};
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
		projectId: string;
		tagIds?: string[];
		description?: string;
	},
) {
	await requireTeamMembership(actorUserId, input.teamId, "viewer");

	await getProjectByIdForTeam(input.teamId, input.projectId);

	const now = new Date();

	const [existing] = await db
		.select({
			id: agencyOpsActiveTimer.id,
			teamId: agencyOpsActiveTimer.teamId,
			projectId: agencyOpsActiveTimer.projectId,
			description: agencyOpsActiveTimer.description,
			startedAt: agencyOpsActiveTimer.startedAt,
		})
		.from(agencyOpsActiveTimer)
		.where(eq(agencyOpsActiveTimer.userId, actorUserId))
		.limit(1);

	await db.transaction(async (tx) => {
		if (existing) {
			const durationSeconds = getDurationSeconds(existing.startedAt, now);

			const [timeEntry] = await tx
				.insert(agencyOpsTimeEntry)
				.values({
					id: createWorkspaceId("agency-time"),
					teamId: existing.teamId,
					projectId: existing.projectId,
					userId: actorUserId,
					source: "timer",
					description: existing.description,
					startedAt: existing.startedAt,
					endedAt: now,
					durationSeconds,
					createdAt: now,
					updatedAt: now,
				})
				.returning({ id: agencyOpsTimeEntry.id });

			// Copy tags from active timer to time entry
			if (timeEntry) {
				const existingTags = await tx
					.select({ tagId: agencyOpsActiveTimerTag.tagId })
					.from(agencyOpsActiveTimerTag)
					.where(eq(agencyOpsActiveTimerTag.activeTimerId, existing.id));

				if (existingTags.length > 0) {
					await tx.insert(agencyOpsTimeEntryTag).values(
						existingTags.map((tag) => ({
							timeEntryId: timeEntry.id,
							tagId: tag.tagId,
						})),
					);
				}
			}

			await tx
				.delete(agencyOpsActiveTimer)
				.where(eq(agencyOpsActiveTimer.id, existing.id));
		}

		const [newTimer] = await tx
			.insert(agencyOpsActiveTimer)
			.values({
				id: createWorkspaceId("agency-active-timer"),
				teamId: input.teamId,
				projectId: input.projectId,
				userId: actorUserId,
				description: input.description?.trim() ?? "",
				startedAt: now,
				createdAt: now,
				updatedAt: now,
			})
			.returning({ id: agencyOpsActiveTimer.id });

		if (newTimer && input.tagIds && input.tagIds.length > 0) {
			await tx.insert(agencyOpsActiveTimerTag).values(
				input.tagIds.map((tagId) => ({
					activeTimerId: newTimer.id,
					tagId,
				})),
			);
		}
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
		tagIds?: string[];
		discard?: boolean;
	},
) {
	const [active] = await db
		.select({
			id: agencyOpsActiveTimer.id,
			teamId: agencyOpsActiveTimer.teamId,
			projectId: agencyOpsActiveTimer.projectId,
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

	if (input.discard) {
		await db.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, active.id));

		return {
			timer: null,
			createdEntry: null,
		};
	}

	const [entry] = await db.transaction(async (tx) => {
		const [created] = await tx
			.insert(agencyOpsTimeEntry)
			.values({
				id: createWorkspaceId("agency-time"),
				teamId: active.teamId,
				projectId: active.projectId,
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

		// Copy tags from active timer to time entry or use provided tags
		if (created) {
			let tagsToInsert: Array<{ tagId: string }> = [];

			if (input.tagIds && input.tagIds.length > 0) {
				tagsToInsert = input.tagIds.map((tagId) => ({ tagId }));
			} else {
				const existingTags = await tx
					.select({ tagId: agencyOpsActiveTimerTag.tagId })
					.from(agencyOpsActiveTimerTag)
					.where(eq(agencyOpsActiveTimerTag.activeTimerId, active.id));

				tagsToInsert = existingTags;
			}

			if (tagsToInsert.length > 0) {
				await tx.insert(agencyOpsTimeEntryTag).values(
					tagsToInsert.map((tag) => ({
						timeEntryId: created.id,
						tagId: tag.tagId,
					})),
				);
			}
		}

		await tx.delete(agencyOpsActiveTimer).where(eq(agencyOpsActiveTimer.id, active.id));

		return [created];
	});

	if (!entry) {
		throw new ORPCError("INTERNAL_SERVER_ERROR");
	}

	// Fetch the complete time entry with tags
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
		.leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
		.where(eq(agencyOpsTimeEntry.id, entry.id))
		.limit(1);

	const tags = await db
		.select({
			id: agencyOpsTag.id,
			teamId: agencyOpsTag.teamId,
			name: agencyOpsTag.name,
			createdAt: agencyOpsTag.createdAt,
			updatedAt: agencyOpsTag.updatedAt,
		})
		.from(agencyOpsTimeEntryTag)
		.innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsTimeEntryTag.tagId))
		.where(eq(agencyOpsTimeEntryTag.timeEntryId, entry.id));

	const createdEntry = row
		? {
				id: row.id,
				teamId: row.teamId,
				userId: row.userId,
				userName: row.userName ?? "Unknown",
				projectId: row.projectId,
				projectName: row.projectName,
				clientId: row.clientId,
				clientName: row.clientName,
				tags: tags.map(mapTagRow),
				source: row.source,
				description: row.description,
				startedAt: row.startedAt.toISOString(),
				endedAt: row.endedAt.toISOString(),
				durationSeconds: row.durationSeconds,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
		  } satisfies AgencyTimeEntryRecord
		: null;

	return {
		timer: null,
		createdEntry,
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

	// Fetch tags for each entry
	const entriesWithTags = await Promise.all(
		rows.map(async (row) => {
			const tags = await db
				.select({
					id: agencyOpsTag.id,
					teamId: agencyOpsTag.teamId,
					name: agencyOpsTag.name,
					createdAt: agencyOpsTag.createdAt,
					updatedAt: agencyOpsTag.updatedAt,
				})
				.from(agencyOpsTimeEntryTag)
				.innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsTimeEntryTag.tagId))
				.where(eq(agencyOpsTimeEntryTag.timeEntryId, row.id));

			return {
				id: row.id,
				teamId: row.teamId,
				userId: row.userId,
				userName: row.userName ?? "Unknown",
				projectId: row.projectId,
				projectName: row.projectName,
				clientId: row.clientId,
				clientName: row.clientName,
				tags: tags.map(mapTagRow),
				source: row.source,
				description: row.description,
				startedAt: row.startedAt.toISOString(),
				endedAt: row.endedAt.toISOString(),
				durationSeconds: row.durationSeconds,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			} satisfies AgencyTimeEntryRecord;
		}),
	);

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

	const anchor = input.anchorDate
		? parseIsoDateTime(input.anchorDate, "anchorDate")
		: new Date();
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
		items: entriesWithTags,
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
		projectId: string;
		startAt: string;
		endAt: string;
		description?: string;
		tagIds?: string[];
	},
) {
	await requireTeamMembership(actorUserId, input.teamId, "viewer");

	await getProjectByIdForTeam(input.teamId, input.projectId);

	const startAt = parseIsoDateTime(input.startAt, "startAt");
	const endAt = parseIsoDateTime(input.endAt, "endAt");
	validateDateRange(startAt, endAt);

	const now = new Date();
	const durationSeconds = getDurationSeconds(startAt, endAt);

	const [created] = await db.transaction(async (tx) => {
		const [timeEntry] = await tx
			.insert(agencyOpsTimeEntry)
			.values({
				id: createWorkspaceId("agency-time"),
				teamId: input.teamId,
				projectId: input.projectId,
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

		if (timeEntry && input.tagIds && input.tagIds.length > 0) {
			await tx.insert(agencyOpsTimeEntryTag).values(
				input.tagIds.map((tagId) => ({
					timeEntryId: timeEntry.id,
					tagId,
				})),
			);
		}

		return [timeEntry];
	});

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
		.leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
		.where(eq(agencyOpsTimeEntry.id, created.id))
		.limit(1);

	if (!row) {
		throw new ORPCError("NOT_FOUND");
	}

	const tags = await db
		.select({
			id: agencyOpsTag.id,
			teamId: agencyOpsTag.teamId,
			name: agencyOpsTag.name,
			createdAt: agencyOpsTag.createdAt,
			updatedAt: agencyOpsTag.updatedAt,
		})
		.from(agencyOpsTimeEntryTag)
		.innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsTimeEntryTag.tagId))
		.where(eq(agencyOpsTimeEntryTag.timeEntryId, created.id));

	return {
		id: row.id,
		teamId: row.teamId,
		userId: row.userId,
		userName: row.userName ?? "Unknown",
		projectId: row.projectId,
		projectName: row.projectName,
		clientId: row.clientId,
		clientName: row.clientName,
		tags: tags.map(mapTagRow),
		source: row.source,
		description: row.description,
		startedAt: row.startedAt.toISOString(),
		endedAt: row.endedAt.toISOString(),
		durationSeconds: row.durationSeconds,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	} satisfies AgencyTimeEntryRecord;
}

export async function updateMyAgencyTimeEntry(
	actorUserId: string,
	input: {
		teamId: string;
		entryId: string;
		startAt?: string;
		endAt?: string;
		description?: string;
		tagIds?: string[];
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

	const nextStartedAt = input.startAt
		? parseIsoDateTime(input.startAt, "startAt")
		: current.startedAt;
	const nextEndedAt = input.endAt
		? parseIsoDateTime(input.endAt, "endAt")
		: current.endedAt;
	validateDateRange(nextStartedAt, nextEndedAt);

	const now = new Date();
	const durationSeconds = getDurationSeconds(nextStartedAt, nextEndedAt);

	const [updated] = await db.transaction(async (tx) => {
		const [timeEntry] = await tx
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

		if (input.tagIds !== undefined && timeEntry) {
			await tx
				.delete(agencyOpsTimeEntryTag)
				.where(eq(agencyOpsTimeEntryTag.timeEntryId, timeEntry.id));

			if (input.tagIds.length > 0) {
				await tx.insert(agencyOpsTimeEntryTag).values(
					input.tagIds.map((tagId) => ({
						timeEntryId: timeEntry.id,
						tagId,
					})),
				);
			}
		}

		return [timeEntry];
	});

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
		.leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
		.where(eq(agencyOpsTimeEntry.id, updated.id))
		.limit(1);

	if (!row) {
		throw new ORPCError("NOT_FOUND");
	}

	const tags = await db
		.select({
			id: agencyOpsTag.id,
			teamId: agencyOpsTag.teamId,
			name: agencyOpsTag.name,
			createdAt: agencyOpsTag.createdAt,
			updatedAt: agencyOpsTag.updatedAt,
		})
		.from(agencyOpsTimeEntryTag)
		.innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsTimeEntryTag.tagId))
		.where(eq(agencyOpsTimeEntryTag.timeEntryId, updated.id));

	return {
		id: row.id,
		teamId: row.teamId,
		userId: row.userId,
		userName: row.userName ?? "Unknown",
		projectId: row.projectId,
		projectName: row.projectName,
		clientId: row.clientId,
		clientName: row.clientName,
		tags: tags.map(mapTagRow),
		source: row.source,
		description: row.description,
		startedAt: row.startedAt.toISOString(),
		endedAt: row.endedAt.toISOString(),
		durationSeconds: row.durationSeconds,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	} satisfies AgencyTimeEntryRecord;
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
	const { rows } = await getReportRows(actorUserId, input);

	const distributionByClient = new Map<
		string,
		{ clientId: string; clientName: string; seconds: number }
	>();
	const distributionByProject = new Map<
		string,
		{
			projectId: string;
			projectName: string;
			clientId: string;
			clientName: string;
			seconds: number;
		}
	>();
	const teamActivity = new Map<
		string,
		{ userId: string; userName: string; userEmail: string; seconds: number }
	>();

	let totalSeconds = 0;

	for (const row of rows) {
		totalSeconds += row.durationSeconds;

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

export async function getAgencyTimeSummary(
	actorUserId: string,
	input: {
		teamId: string;
		from: string;
		to: string;
		clientId?: string;
		projectId?: string;
		memberUserId?: string;
		tagIds?: string[];
	},
) {
	await requireTeamMembership(actorUserId, input.teamId, "viewer");

	const from = parseIsoDateTime(input.from, "from");
	const to = parseIsoDateTime(input.to, "to");

	// Team members
	const members = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			image: user.image,
		})
		.from(workspaceTeamMember)
		.innerJoin(user, eq(user.id, workspaceTeamMember.userId))
		.where(eq(workspaceTeamMember.teamId, input.teamId))
		.orderBy(asc(user.name));

	// Active timers for the whole team
	const activeTimers = await db
		.select({
			userId: agencyOpsActiveTimer.userId,
			projectName: agencyOpsProject.name,
			description: agencyOpsActiveTimer.description,
		})
		.from(agencyOpsActiveTimer)
		.innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
		.where(eq(agencyOpsActiveTimer.teamId, input.teamId));

	const activeTimerByUser = new Map(activeTimers.map((t) => [t.userId, t]));

	// Time entry filters
	const entryFilters = [
		eq(agencyOpsTimeEntry.teamId, input.teamId),
		isNull(agencyOpsTimeEntry.deletedAt),
		gte(agencyOpsTimeEntry.startedAt, from),
		lte(agencyOpsTimeEntry.startedAt, to),
	];

	if (input.clientId) {
		entryFilters.push(eq(agencyOpsProject.clientId, input.clientId));
	}
	if (input.projectId) {
		entryFilters.push(eq(agencyOpsProject.id, input.projectId));
	}
	if (input.memberUserId) {
		entryFilters.push(eq(agencyOpsTimeEntry.userId, input.memberUserId));
	}
	if (input.tagIds && input.tagIds.length > 0) {
		entryFilters.push(
			inArray(
				agencyOpsTimeEntry.id,
				db
					.select({ timeEntryId: agencyOpsTimeEntryTag.timeEntryId })
					.from(agencyOpsTimeEntryTag)
					.where(inArray(agencyOpsTimeEntryTag.tagId, input.tagIds)),
			),
		);
	}

	const entries = await db
		.select({
			userId: agencyOpsTimeEntry.userId,
			projectName: agencyOpsProject.name,
			description: agencyOpsTimeEntry.description,
			durationSeconds: agencyOpsTimeEntry.durationSeconds,
		})
		.from(agencyOpsTimeEntry)
		.innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
		.where(and(...entryFilters))
		.orderBy(desc(agencyOpsTimeEntry.startedAt));

	const totalSecondsPerMember = new Map<string, number>();
	const latestEntryPerMember = new Map<string, { projectName: string; description: string }>();

	for (const entry of entries) {
		totalSecondsPerMember.set(
			entry.userId,
			(totalSecondsPerMember.get(entry.userId) ?? 0) + Number(entry.durationSeconds),
		);
		if (!latestEntryPerMember.has(entry.userId)) {
			latestEntryPerMember.set(entry.userId, {
				projectName: entry.projectName,
				description: entry.description,
			});
		}
	}

	const totalSeconds = [...totalSecondsPerMember.values()].reduce((a, b) => a + b, 0);

	return {
		summary: {
			totalSeconds,
			activeCount: activeTimers.length,
			teamMembers: members.map((member) => {
				const activeTimer = activeTimerByUser.get(member.id);
				return {
					id: member.id,
					avatar: member.image ?? null,
					name: member.name ?? "Unknown",
					email: member.email,
					isActive: activeTimerByUser.has(member.id),
					totalSeconds: totalSecondsPerMember.get(member.id) ?? 0,
					latestEntry:
						latestEntryPerMember.get(member.id) ??
						(activeTimer
							? { projectName: activeTimer.projectName, description: activeTimer.description }
							: null),
				};
			}),
		},
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

	const records = rows.map((row) => ({
		entryId: row.entryId,
		date: formatUtcDateKey(row.startedAt),
		startedAt: row.startedAt.toISOString(),
		endedAt: row.endedAt.toISOString(),
		durationHours: Number((row.durationSeconds / 3_600).toFixed(2)),
		memberName: row.memberName,
		memberEmail: row.memberEmail,
		clientName: row.clientName,
		projectName: row.projectName,
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

export async function listAllAgencyTimeEntries(
	actorUserId: string,
	input: {
		teamId: string;
		from: string;
		to: string;
		page?: number;
		pageSize?: number;
		clientId?: string;
		projectId?: string;
		memberUserId?: string;
		tagIds?: string[];
	},
) {
	await requireTeamMembership(actorUserId, input.teamId, "editor");

	const from = parseIsoDateTime(input.from, "from");
	const to = parseIsoDateTime(input.to, "to");

	if (from > to) {
		throw new ORPCError("BAD_REQUEST", {
			message: "from must be before or equal to to.",
		});
	}

	const page = Math.max(1, input.page ?? 1);
	const pageSize = Math.min(100, Math.max(1, input.pageSize ?? 25));
	const offset = (page - 1) * pageSize;

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
			id: agencyOpsTimeEntry.id,
			teamId: agencyOpsTimeEntry.teamId,
			userId: agencyOpsTimeEntry.userId,
			userName: user.name,
			projectId: agencyOpsTimeEntry.projectId,
			projectName: agencyOpsProject.name,
			clientId: agencyOpsClient.id,
			clientName: agencyOpsClient.name,
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
		.leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
		.where(and(...filters))
		.orderBy(desc(agencyOpsTimeEntry.startedAt))
		.limit(pageSize)
		.offset(offset);

	// Filter by tagIds if provided (post-query, since tags are in a join table)
	const tagFilter = input.tagIds && input.tagIds.length > 0 ? new Set(input.tagIds) : null;

	const entriesWithTags = await Promise.all(
		rows.map(async (row) => {
			const tags = await db
				.select({
					id: agencyOpsTag.id,
					teamId: agencyOpsTag.teamId,
					name: agencyOpsTag.name,
					createdAt: agencyOpsTag.createdAt,
					updatedAt: agencyOpsTag.updatedAt,
				})
				.from(agencyOpsTimeEntryTag)
				.innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsTimeEntryTag.tagId))
				.where(eq(agencyOpsTimeEntryTag.timeEntryId, row.id));

			return {
				id: row.id,
				teamId: row.teamId,
				userId: row.userId,
				userName: row.userName ?? "Unknown",
				projectId: row.projectId,
				projectName: row.projectName,
				clientId: row.clientId,
				clientName: row.clientName,
				tags: tags.map(mapTagRow),
				source: row.source,
				description: row.description,
				startedAt: row.startedAt.toISOString(),
				endedAt: row.endedAt.toISOString(),
				durationSeconds: row.durationSeconds,
				createdAt: row.createdAt.toISOString(),
				updatedAt: row.updatedAt.toISOString(),
			} satisfies AgencyTimeEntryRecord;
		}),
	);

	const filteredEntries = tagFilter
		? entriesWithTags.filter((e) => e.tags.some((t) => tagFilter.has(t.id)))
		: entriesWithTags;

	const [countRow] = await db
		.select({ count: sql<number>`count(*)` })
		.from(agencyOpsTimeEntry)
		.innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
		.innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
		.where(and(...filters));

	const parsedTotal = Number(countRow?.count ?? 0);
	const total = Number.isFinite(parsedTotal) && parsedTotal >= 0 ? parsedTotal : 0;

	return {
		items: filteredEntries,
		page,
		pageSize,
		total,
	};
}

export async function updateAnyAgencyTimeEntry(
	actorUserId: string,
	input: {
		teamId: string;
		entryId: string;
		startAt?: string;
		endAt?: string;
		description?: string;
		projectId?: string;
		tagIds?: string[];
	},
) {
	await requireTeamMembership(actorUserId, input.teamId, "owner");

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
				isNull(agencyOpsTimeEntry.deletedAt),
			),
		)
		.limit(1);

	if (!current) {
		throw new ORPCError("NOT_FOUND");
	}

	const nextStartedAt = input.startAt
		? parseIsoDateTime(input.startAt, "startAt")
		: current.startedAt;
	const nextEndedAt = input.endAt
		? parseIsoDateTime(input.endAt, "endAt")
		: current.endedAt;
	validateDateRange(nextStartedAt, nextEndedAt);

	const now = new Date();
	const durationSeconds = getDurationSeconds(nextStartedAt, nextEndedAt);

	const [updated] = await db.transaction(async (tx) => {
		const [timeEntry] = await tx
			.update(agencyOpsTimeEntry)
			.set({
				...(input.projectId ? { projectId: input.projectId } : {}),
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
					isNull(agencyOpsTimeEntry.deletedAt),
				),
			)
			.returning({ id: agencyOpsTimeEntry.id });

		if (input.tagIds !== undefined && timeEntry) {
			await tx
				.delete(agencyOpsTimeEntryTag)
				.where(eq(agencyOpsTimeEntryTag.timeEntryId, timeEntry.id));

			if (input.tagIds.length > 0) {
				await tx.insert(agencyOpsTimeEntryTag).values(
					input.tagIds.map((tagId) => ({
						timeEntryId: timeEntry.id,
						tagId,
					})),
				);
			}
		}

		return [timeEntry];
	});

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
		.leftJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
		.where(eq(agencyOpsTimeEntry.id, updated.id))
		.limit(1);

	if (!row) {
		throw new ORPCError("NOT_FOUND");
	}

	const tags = await db
		.select({
			id: agencyOpsTag.id,
			teamId: agencyOpsTag.teamId,
			name: agencyOpsTag.name,
			createdAt: agencyOpsTag.createdAt,
			updatedAt: agencyOpsTag.updatedAt,
		})
		.from(agencyOpsTimeEntryTag)
		.innerJoin(agencyOpsTag, eq(agencyOpsTag.id, agencyOpsTimeEntryTag.tagId))
		.where(eq(agencyOpsTimeEntryTag.timeEntryId, updated.id));

	return {
		id: row.id,
		teamId: row.teamId,
		userId: row.userId,
		userName: row.userName ?? "Unknown",
		projectId: row.projectId,
		projectName: row.projectName,
		clientId: row.clientId,
		clientName: row.clientName,
		tags: tags.map(mapTagRow),
		source: row.source,
		description: row.description,
		startedAt: row.startedAt.toISOString(),
		endedAt: row.endedAt.toISOString(),
		durationSeconds: row.durationSeconds,
		createdAt: row.createdAt.toISOString(),
		updatedAt: row.updatedAt.toISOString(),
	} satisfies AgencyTimeEntryRecord;
}
