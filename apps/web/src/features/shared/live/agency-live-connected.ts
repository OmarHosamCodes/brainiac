/** ponytail: teamId → live flag; updated by agency-live-connection only. */
const liveTeams = new Set<string>();

export function setAgencyTeamLiveConnected(teamId: string, connected: boolean) {
  if (connected) {
    liveTeams.add(teamId);
  } else {
    liveTeams.delete(teamId);
  }
}

export function isAgencyLiveConnected(teamId: string): boolean {
  return liveTeams.has(teamId);
}

/** ponytail: test-only reset; not for production */
export function resetAgencyLiveConnectedForTest() {
  liveTeams.clear();
}
