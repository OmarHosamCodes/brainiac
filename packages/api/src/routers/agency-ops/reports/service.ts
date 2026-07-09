import { ORPCError } from "@orpc/server";
import { eq, isNull, gte, lte, and, desc, inArray, asc } from "drizzle-orm";
import { agencyOpsTimeEntry, user, agencyOpsClient, agencyOpsProject, agencyOpsProjectTask, workspaceTeamMember, agencyOpsActiveTimer } from "@brainiac/db/schema";
import { db } from "@brainiac/db";
import { type ReportEntityFilterInput, parseIsoDateTime, applyReportEntityFilters, resolveReportEntityIds, formatAvatarUrl } from "../shared/utils";
import { requireTeamMembership } from "../shared/membership";

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

type AgencyDashboardSummary = AgencyReportSummary & {
  totalSeconds: number;
  activeTimerCount: number;
  topClient: { clientId: string; clientName: string; seconds: number } | null;
  topProject: {
    projectId: string;
    projectName: string;
    clientId: string;
    clientName: string;
    seconds: number;
  } | null;
  dailyBuckets: Array<{
    date: string;
    totalSeconds: number;
    segments: Array<{
      projectId: string;
      projectName: string;
      clientName: string;
      seconds: number;
    }>;
  }>;
  teamMembers: Array<{
    userId: string;
    userName: string;
    userEmail: string;
    avatar: string | null;
    isActive: boolean;
    totalSeconds: number;
    latestEntry: {
      projectName: string;
      clientName: string;
      description: string;
      startedAt: string;
    } | null;
    projectBreakdown: Array<{
      projectId: string;
      projectName: string;
      clientName: string;
      seconds: number;
    }>;
  }>;
};

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

async function getReportRows(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
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

  applyReportEntityFilters(filters, input);

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
      taskId: agencyOpsTimeEntry.taskId,
      taskIsWaste: agencyOpsProjectTask.isWaste,
      projectName: agencyOpsProject.name,
      source: agencyOpsTimeEntry.source,
      description: agencyOpsTimeEntry.description,
    })
    .from(agencyOpsTimeEntry)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsTimeEntry.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .innerJoin(user, eq(user.id, agencyOpsTimeEntry.userId))
    .leftJoin(agencyOpsProjectTask, eq(agencyOpsProjectTask.id, agencyOpsTimeEntry.taskId))
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
        ...(() => {
          const scopedFilters: Parameters<typeof and>[0][] = [];
          const clientIds = resolveReportEntityIds(input.clientId, input.clientIds);
          if (clientIds.length === 1) {
            scopedFilters.push(eq(agencyOpsProject.clientId, clientIds[0]!));
          } else if (clientIds.length > 1) {
            scopedFilters.push(inArray(agencyOpsProject.clientId, clientIds));
          }
          const projectIds = resolveReportEntityIds(input.projectId, input.projectIds);
          if (projectIds.length === 1) {
            scopedFilters.push(eq(agencyOpsProject.id, projectIds[0]!));
          } else if (projectIds.length > 1) {
            scopedFilters.push(inArray(agencyOpsProject.id, projectIds));
          }
          return scopedFilters;
        })(),
      ),
    )
    .orderBy(asc(agencyOpsProject.name));

  return {
    rows,
    scopedProjects,
  };
}

export async function getAgencyReportsSummary(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
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

export async function getAgencyDashboardSummary(
  actorUserId: string,
  input: ReportEntityFilterInput & {
    teamId: string;
    from: string;
    to: string;
  },
) {
  const { rows } = await getReportRows(actorUserId, input);

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

  const activeTimers = await db
    .select({
      userId: agencyOpsActiveTimer.userId,
      projectName: agencyOpsProject.name,
      clientName: agencyOpsClient.name,
      description: agencyOpsActiveTimer.description,
      startedAt: agencyOpsActiveTimer.startedAt,
    })
    .from(agencyOpsActiveTimer)
    .innerJoin(agencyOpsProject, eq(agencyOpsProject.id, agencyOpsActiveTimer.projectId))
    .innerJoin(agencyOpsClient, eq(agencyOpsClient.id, agencyOpsProject.clientId))
    .where(eq(agencyOpsActiveTimer.teamId, input.teamId));

  const activeTimerByUser = new Map(activeTimers.map((timer) => [timer.userId, timer]));
  const clientSeconds = new Map<
    string,
    { clientId: string; clientName: string; seconds: number }
  >();
  const projectSeconds = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      clientId: string;
      clientName: string;
      seconds: number;
    }
  >();
  const memberSeconds = new Map<string, number>();
  const memberProjectSeconds = new Map<
    string,
    Map<string, { projectId: string; projectName: string; clientName: string; seconds: number }>
  >();
  const latestEntryByMember = new Map<
    string,
    { projectName: string; clientName: string; description: string; startedAt: string }
  >();
  const dailyBuckets = new Map<
    string,
    Map<string, { projectId: string; projectName: string; clientName: string; seconds: number }>
  >();

  let totalSeconds = 0;

  for (const row of rows) {
    totalSeconds += row.durationSeconds;

    const clientEntry = clientSeconds.get(row.clientId) ?? {
      clientId: row.clientId,
      clientName: row.clientName,
      seconds: 0,
    };
    clientEntry.seconds += row.durationSeconds;
    clientSeconds.set(row.clientId, clientEntry);

    const projectEntry = projectSeconds.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName,
      clientId: row.clientId,
      clientName: row.clientName,
      seconds: 0,
    };
    projectEntry.seconds += row.durationSeconds;
    projectSeconds.set(row.projectId, projectEntry);

    memberSeconds.set(
      row.memberEmail,
      (memberSeconds.get(row.memberEmail) ?? 0) + row.durationSeconds,
    );

    const memberProjects = memberProjectSeconds.get(row.memberEmail) ?? new Map();
    const memberProjectEntry = memberProjects.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName,
      clientName: row.clientName,
      seconds: 0,
    };
    memberProjectEntry.seconds += row.durationSeconds;
    memberProjects.set(row.projectId, memberProjectEntry);
    memberProjectSeconds.set(row.memberEmail, memberProjects);

    if (!latestEntryByMember.has(row.memberEmail)) {
      latestEntryByMember.set(row.memberEmail, {
        projectName: row.projectName,
        clientName: row.clientName,
        description: row.description,
        startedAt: row.startedAt.toISOString(),
      });
    }

    const dateKey = formatUtcDateKey(row.startedAt);
    const dayProjects = dailyBuckets.get(dateKey) ?? new Map();
    const dayProjectEntry = dayProjects.get(row.projectId) ?? {
      projectId: row.projectId,
      projectName: row.projectName,
      clientName: row.clientName,
      seconds: 0,
    };
    dayProjectEntry.seconds += row.durationSeconds;
    dayProjects.set(row.projectId, dayProjectEntry);
    dailyBuckets.set(dateKey, dayProjects);
  }

  const topClient =
    [...clientSeconds.values()].sort((left, right) => right.seconds - left.seconds)[0] ?? null;
  const topProject =
    [...projectSeconds.values()].sort((left, right) => right.seconds - left.seconds)[0] ?? null;
  const fromDate = parseIsoDateTime(input.from, "from");
  const toDate = parseIsoDateTime(input.to, "to");
  const filledDailyBuckets = [];
  for (
    let cursor = new Date(
      Date.UTC(fromDate.getUTCFullYear(), fromDate.getUTCMonth(), fromDate.getUTCDate()),
    );
    cursor <= toDate && filledDailyBuckets.length < 370;
    cursor = addDaysUtc(cursor, 1)
  ) {
    const date = formatUtcDateKey(cursor);
    const projects = dailyBuckets.get(date) ?? new Map();
    filledDailyBuckets.push({
      date,
      totalSeconds: [...projects.values()].reduce(
        (sumSeconds, project) => sumSeconds + project.seconds,
        0,
      ),
      segments: [...projects.values()].sort((left, right) => right.seconds - left.seconds),
    });
  }

  const summary: AgencyDashboardSummary = {
    totalHours: Number((totalSeconds / 3_600).toFixed(2)),
    totalSeconds,
    totalEntries: rows.length,
    activeTimerCount: activeTimers.length,
    topClient,
    topProject,
    timeDistributionByClient: [...clientSeconds.values()]
      .map((entry) => ({
        clientId: entry.clientId,
        clientName: entry.clientName,
        hours: Number((entry.seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
    timeDistributionByProject: [...projectSeconds.values()]
      .map((entry) => ({
        projectId: entry.projectId,
        projectName: entry.projectName,
        clientId: entry.clientId,
        clientName: entry.clientName,
        hours: Number((entry.seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
    teamActivity: [...memberSeconds.entries()]
      .map(([userEmail, seconds]) => ({
        userId: userEmail,
        userName: members.find((member) => member.email === userEmail)?.name ?? "Unknown",
        userEmail,
        hours: Number((seconds / 3_600).toFixed(2)),
      }))
      .sort((left, right) => right.hours - left.hours),
    dailyBuckets: filledDailyBuckets,
    teamMembers: members
      .map((member) => {
        const activeTimer = activeTimerByUser.get(member.id);
        return {
          userId: member.id,
          userName: member.name ?? "Unknown",
          userEmail: member.email,
          avatar: formatAvatarUrl(member.image),
          isActive: Boolean(activeTimer),
          totalSeconds: memberSeconds.get(member.email) ?? 0,
          // Prefer the live timer over the last completed entry in-range.
          latestEntry: activeTimer
            ? {
                projectName: activeTimer.projectName,
                clientName: activeTimer.clientName,
                description: activeTimer.description,
                startedAt: activeTimer.startedAt.toISOString(),
              }
            : (latestEntryByMember.get(member.email) ?? null),
          projectBreakdown: [...(memberProjectSeconds.get(member.email)?.values() ?? [])].sort(
            (left, right) => right.seconds - left.seconds,
          ),
        };
      })
      .sort(
        (left, right) =>
          Number(right.isActive) - Number(left.isActive) || right.totalSeconds - left.totalSeconds,
      ),
  };

  return { summary };
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
