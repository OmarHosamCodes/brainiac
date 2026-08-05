import { db } from "@orch/db";
import {
  agencyOpsMemberProfileAlert,
  agencyOpsTenurePolicy,
  agencyOpsTimeEntry,
  workspaceTeamMember,
  type AgencyOpsMemberProfileAlertContext,
} from "@orch/db/schema";
import { createWorkspaceId } from "@orch/workspace";
import { ORPCError } from "@orpc/server";
import { and, eq, gte, isNull, lte, ne } from "drizzle-orm";

import { fanOutNotification } from "../../notifications/service";
import { resolveWorkSchedule } from "../resourcing/work-schedule";
import { requireTeamMembership } from "../shared/membership";
import { addDaysToDateKey, localDateKeyFromInstant } from "../time-tracking/local-week-bounds";
import {
  detectSystemAlerts,
  toFiscalCalendar,
  type DaySeconds,
  type DetectedAlert,
} from "./member-profile-alerts";

export type MemberProfileAlertRecord = {
  id: string;
  kind: "abnormal_day" | "month_pace" | "quarter_pace" | "waste_spike" | "custom";
  source: "system" | "custom";
  status: "open" | "snoozed" | "removed";
  fingerprint: string;
  title: string;
  body: string;
  note: string | null;
  context: AgencyOpsMemberProfileAlertContext;
  sentAt: string | null;
  snoozedUntil: string | null;
  createdAt: string;
  ephemeral: boolean;
};

function mapRow(row: typeof agencyOpsMemberProfileAlert.$inferSelect): MemberProfileAlertRecord {
  return {
    id: row.id,
    kind: row.kind,
    source: row.source,
    status: row.status,
    fingerprint: row.fingerprint,
    title: row.title,
    body: row.body,
    note: row.note,
    context: row.contextJson ?? {},
    sentAt: row.sentAt?.toISOString() ?? null,
    snoozedUntil: row.snoozedUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    ephemeral: false,
  };
}

function localInstantBounds(
  fromKey: string,
  toKey: string,
  utcOffsetMinutes: number,
): { from: Date; to: Date } {
  const fromMs = Date.parse(`${fromKey}T00:00:00.000Z`) + utcOffsetMinutes * 60_000;
  const toMs = Date.parse(`${toKey}T23:59:59.999Z`) + utcOffsetMinutes * 60_000;
  return { from: new Date(fromMs), to: new Date(toMs) };
}

async function loadDaySeconds(
  teamId: string,
  userId: string,
  fromKey: string,
  toKey: string,
  utcOffsetMinutes: number,
): Promise<DaySeconds[]> {
  const { from, to } = localInstantBounds(fromKey, toKey, utcOffsetMinutes);
  const rows = await db
    .select({
      startedAt: agencyOpsTimeEntry.startedAt,
      durationSeconds: agencyOpsTimeEntry.durationSeconds,
      isWaste: agencyOpsTimeEntry.isWaste,
    })
    .from(agencyOpsTimeEntry)
    .where(
      and(
        eq(agencyOpsTimeEntry.teamId, teamId),
        eq(agencyOpsTimeEntry.userId, userId),
        isNull(agencyOpsTimeEntry.deletedAt),
        gte(agencyOpsTimeEntry.startedAt, from),
        lte(agencyOpsTimeEntry.startedAt, to),
      ),
    );

  const byDate = new Map<string, DaySeconds>();
  for (const row of rows) {
    const dateKey = localDateKeyFromInstant(row.startedAt, utcOffsetMinutes);
    const current = byDate.get(dateKey) ?? { dateKey, totalSeconds: 0, wasteSeconds: 0 };
    current.totalSeconds += row.durationSeconds;
    if (row.isWaste) current.wasteSeconds += row.durationSeconds;
    byDate.set(dateKey, current);
  }
  return [...byDate.values()];
}

async function upsertDetectedOpen(
  actorUserId: string,
  teamId: string,
  subjectUserId: string,
  alert: DetectedAlert,
): Promise<typeof agencyOpsMemberProfileAlert.$inferSelect> {
  const now = new Date();
  const [row] = await db
    .insert(agencyOpsMemberProfileAlert)
    .values({
      id: createWorkspaceId("agency-member-alert"),
      teamId,
      subjectUserId,
      createdByUserId: actorUserId,
      kind: alert.kind,
      source: "system",
      status: "open",
      fingerprint: alert.fingerprint,
      title: alert.title,
      body: alert.body,
      note: null,
      contextJson: alert.context,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        agencyOpsMemberProfileAlert.teamId,
        agencyOpsMemberProfileAlert.subjectUserId,
        agencyOpsMemberProfileAlert.fingerprint,
      ],
      set: {
        title: alert.title,
        body: alert.body,
        contextJson: alert.context,
        status: "open",
        snoozedUntil: null,
        removedAt: null,
        removedByUserId: null,
        updatedAt: now,
      },
      setWhere: ne(agencyOpsMemberProfileAlert.status, "removed"),
    })
    .returning();

  if (row) return row;

  const [existing] = await db
    .select()
    .from(agencyOpsMemberProfileAlert)
    .where(
      and(
        eq(agencyOpsMemberProfileAlert.teamId, teamId),
        eq(agencyOpsMemberProfileAlert.subjectUserId, subjectUserId),
        eq(agencyOpsMemberProfileAlert.fingerprint, alert.fingerprint),
      ),
    )
    .limit(1);
  if (!existing) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return existing;
}

export async function listMemberProfileAlerts(
  actorUserId: string,
  input: { teamId: string; userId: string; utcOffsetMinutes?: number },
): Promise<{ items: MemberProfileAlertRecord[]; canManageAlerts: boolean }> {
  const role = await requireTeamMembership(actorUserId, input.teamId, "viewer");
  const canManageAlerts = role === "owner" || role === "editor";

  const [subject] = await db
    .select({ userId: workspaceTeamMember.userId })
    .from(workspaceTeamMember)
    .where(
      and(
        eq(workspaceTeamMember.teamId, input.teamId),
        eq(workspaceTeamMember.userId, input.userId),
      ),
    )
    .limit(1);
  if (!subject) {
    throw new ORPCError("NOT_FOUND", { message: "Member not found on this team." });
  }

  const durableRows = await db
    .select()
    .from(agencyOpsMemberProfileAlert)
    .where(
      and(
        eq(agencyOpsMemberProfileAlert.teamId, input.teamId),
        eq(agencyOpsMemberProfileAlert.subjectUserId, input.userId),
      ),
    );

  const now = new Date();
  const utcOffsetMinutes = input.utcOffsetMinutes ?? 0;
  const todayKey = localDateKeyFromInstant(now, utcOffsetMinutes);
  const suppressed = new Set<string>();
  const durableByFingerprint = new Map(durableRows.map((row) => [row.fingerprint, row] as const));
  const items: MemberProfileAlertRecord[] = [];

  for (const row of durableRows) {
    if (row.status === "removed") {
      suppressed.add(row.fingerprint);
      continue;
    }
    if (row.status === "snoozed" && row.snoozedUntil && row.snoozedUntil > now) {
      suppressed.add(row.fingerprint);
      continue;
    }
    if (row.status === "snoozed" && (!row.snoozedUntil || row.snoozedUntil <= now)) {
      if (row.source === "custom") {
        const [reopened] = await db
          .update(agencyOpsMemberProfileAlert)
          .set({ status: "open", snoozedUntil: null, updatedAt: now })
          .where(eq(agencyOpsMemberProfileAlert.id, row.id))
          .returning();
        if (reopened) {
          durableByFingerprint.set(reopened.fingerprint, reopened);
          items.push(mapRow(reopened));
        }
      }
      continue;
    }
    if (row.status === "open" && row.source === "custom") {
      items.push(mapRow(row));
    }
  }

  const [policyRow] = await db
    .select()
    .from(agencyOpsTenurePolicy)
    .where(eq(agencyOpsTenurePolicy.teamId, input.teamId))
    .limit(1);

  const schedule = resolveWorkSchedule(policyRow ?? null);
  const calendar = toFiscalCalendar({
    fiscalYearStartMonth: policyRow?.fiscalYearStartMonth ?? 1,
    fiscalYearStartDay: policyRow?.fiscalYearStartDay ?? 1,
  });
  const quarterlyMinHours = policyRow?.quarterlyMinHours ?? 525;
  const fromKey = addDaysToDateKey(todayKey, -100);
  const days = await loadDaySeconds(
    input.teamId,
    input.userId,
    fromKey,
    todayKey,
    utcOffsetMinutes,
  );

  const detected = detectSystemAlerts({
    days,
    schedule,
    calendar,
    quarterlyMinHours,
    suppressedFingerprints: suppressed,
    todayKey,
    now,
  });

  for (const alert of detected) {
    const existing = durableByFingerprint.get(alert.fingerprint);
    if (existing?.status === "removed") continue;
    if (existing?.status === "snoozed" && existing.snoozedUntil && existing.snoozedUntil > now) {
      continue;
    }

    const row = await upsertDetectedOpen(actorUserId, input.teamId, input.userId, alert);
    if (row.status !== "open") continue;
    if (!items.some((item) => item.id === row.id)) {
      items.push(mapRow(row));
    }
  }

  items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return { items, canManageAlerts };
}

async function requireManageAlerts(actorUserId: string, teamId: string) {
  await requireTeamMembership(actorUserId, teamId, "editor");
}

async function loadAlertRow(
  teamId: string,
  userId: string,
  alertId: string,
): Promise<typeof agencyOpsMemberProfileAlert.$inferSelect> {
  const [existing] = await db
    .select()
    .from(agencyOpsMemberProfileAlert)
    .where(
      and(
        eq(agencyOpsMemberProfileAlert.id, alertId),
        eq(agencyOpsMemberProfileAlert.teamId, teamId),
        eq(agencyOpsMemberProfileAlert.subjectUserId, userId),
      ),
    )
    .limit(1);
  if (!existing || existing.status === "removed") {
    throw new ORPCError("NOT_FOUND", { message: "Alert not found." });
  }
  return existing;
}

export async function createMemberProfileAlert(
  actorUserId: string,
  input: {
    teamId: string;
    userId: string;
    title: string;
    body?: string;
    note?: string | null;
  },
): Promise<{ alert: MemberProfileAlertRecord }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const fingerprint = `custom:${createWorkspaceId("alert-fp")}`;
  const now = new Date();
  const [row] = await db
    .insert(agencyOpsMemberProfileAlert)
    .values({
      id: createWorkspaceId("agency-member-alert"),
      teamId: input.teamId,
      subjectUserId: input.userId,
      createdByUserId: actorUserId,
      kind: "custom",
      source: "custom",
      status: "open",
      fingerprint,
      title: input.title.trim(),
      body: (input.body ?? input.title).trim(),
      note: input.note?.trim() || null,
      contextJson: {},
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  if (!row) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return { alert: mapRow(row) };
}

export async function setMemberProfileAlertNote(
  actorUserId: string,
  input: { teamId: string; userId: string; alertId: string; note: string },
): Promise<{ alert: MemberProfileAlertRecord }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const row = await loadAlertRow(input.teamId, input.userId, input.alertId);
  const [updated] = await db
    .update(agencyOpsMemberProfileAlert)
    .set({ note: input.note.trim() || null, updatedAt: new Date() })
    .where(eq(agencyOpsMemberProfileAlert.id, row.id))
    .returning();
  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return { alert: mapRow(updated) };
}

export async function sendMemberProfileAlert(
  actorUserId: string,
  input: { teamId: string; userId: string; alertId: string; note?: string },
): Promise<{ alert: MemberProfileAlertRecord }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const row = await loadAlertRow(input.teamId, input.userId, input.alertId);
  const note = (input.note ?? row.note ?? "").trim();
  if (!note) {
    throw new ORPCError("BAD_REQUEST", { message: "A note is required before sending." });
  }
  const now = new Date();
  const [updated] = await db
    .update(agencyOpsMemberProfileAlert)
    .set({ note, sentAt: now, status: "open", snoozedUntil: null, updatedAt: now })
    .where(eq(agencyOpsMemberProfileAlert.id, row.id))
    .returning();
  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");

  await fanOutNotification(actorUserId, {
    teamId: input.teamId,
    recipientUserIds: [input.userId],
    type: "member.alert",
    payload: {
      subjectUserId: input.userId,
      alertId: updated.id,
      alertTitle: updated.title,
      notePreview: note.slice(0, 160),
    },
  });

  return { alert: mapRow(updated) };
}

export async function removeMemberProfileAlert(
  actorUserId: string,
  input: { teamId: string; userId: string; alertId: string },
): Promise<{ id: string }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const row = await loadAlertRow(input.teamId, input.userId, input.alertId);
  const now = new Date();
  await db
    .update(agencyOpsMemberProfileAlert)
    .set({
      status: "removed",
      removedAt: now,
      removedByUserId: actorUserId,
      snoozedUntil: null,
      updatedAt: now,
    })
    .where(eq(agencyOpsMemberProfileAlert.id, row.id));
  return { id: row.id };
}

export async function snoozeMemberProfileAlert(
  actorUserId: string,
  input: { teamId: string; userId: string; alertId: string; snoozedUntil?: string },
): Promise<{ alert: MemberProfileAlertRecord }> {
  await requireManageAlerts(actorUserId, input.teamId);
  const row = await loadAlertRow(input.teamId, input.userId, input.alertId);
  if (row.source !== "system") {
    throw new ORPCError("BAD_REQUEST", { message: "Only system alerts can be snoozed." });
  }

  let snoozedUntil: Date;
  if (input.snoozedUntil) {
    snoozedUntil = new Date(input.snoozedUntil);
    if (Number.isNaN(snoozedUntil.getTime())) {
      throw new ORPCError("BAD_REQUEST", { message: "Invalid snoozedUntil." });
    }
  } else {
    const hint =
      typeof row.contextJson?.defaultSnoozeUntil === "string"
        ? new Date(row.contextJson.defaultSnoozeUntil)
        : null;
    snoozedUntil =
      hint && !Number.isNaN(hint.getTime()) ? hint : new Date(Date.now() + 7 * 86_400_000);
  }

  const now = new Date();
  const [updated] = await db
    .update(agencyOpsMemberProfileAlert)
    .set({
      status: "snoozed",
      snoozedUntil,
      updatedAt: now,
    })
    .where(eq(agencyOpsMemberProfileAlert.id, row.id))
    .returning();
  if (!updated) throw new ORPCError("INTERNAL_SERVER_ERROR");
  return { alert: mapRow(updated) };
}
