import { publishAgencyLiveEvent } from "../agency-ops/live/live";
import type { NotificationRecord } from "../../schemas/notifications";

const liveUserTeams = new Map<string, Set<string>>();

export function registerAgencyLiveUserConnection(userId: string, teamId: string) {
  const teams = liveUserTeams.get(userId) ?? new Set<string>();
  teams.add(teamId);
  liveUserTeams.set(userId, teams);
}

export function unregisterAgencyLiveUserConnection(userId: string, teamId: string) {
  const teams = liveUserTeams.get(userId);
  if (!teams) return;
  teams.delete(teamId);
  if (teams.size === 0) {
    liveUserTeams.delete(userId);
  }
}

export function isUserLiveOnTeam(userId: string, teamId: string) {
  return liveUserTeams.get(userId)?.has(teamId) ?? false;
}

/** ponytail: test-only reset */
export function resetAgencyLiveUserConnectionsForTest() {
  liveUserTeams.clear();
}

export async function publishNotificationCreated(teamId: string, notification: NotificationRecord) {
  await publishAgencyLiveEvent(teamId, {
    type: "notification.created",
    teamId,
    updatedAt: notification.updatedAt,
    notification,
  });
}
