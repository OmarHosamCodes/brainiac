import { useQuery } from "@tanstack/vue-query";
import { computed, watch } from "vue";

import { useAgencyTimeTrackingStore } from "~/stores/agency-time-tracking";

/**
 * Global "current agency team" state for the persistent timer.
 *
 * The agency time-tracking store is keyed per-team. The persistent app-shell
 * timer needs *one* team to read the active timer for; we store that as a
 * shell-level state. The agency page sets it when its team selector changes;
 * everywhere else, it's read-only and the timer stays synced.
 */
export function useCurrentAgencyTeam() {
  const currentAgencyTeamId = useState<string | null>(
    "app-shell-current-agency-team-id",
    () => null,
  );

  function setCurrentAgencyTeamId(nextTeamId: string | null) {
    currentAgencyTeamId.value = nextTeamId || null;
  }

  return {
    currentAgencyTeamId,
    setCurrentAgencyTeamId,
  };
}

/**
 * Persistent timer composable.
 *
 * Wraps the active-timer query for the current agency team and exposes a
 * single elapsed-seconds source so the chrome timer ticks identically to
 * any in-page surface.
 *
 * States surfaced:
 *   idle         — no active timer, no mutation pending.
 *   running      — active timer present, no mutation pending.
 *   saving       — start/stop mutation pending (optimistic patch already applied).
 *   sync-failed  — query error after the most recent fetch.
 *   unavailable  — no current team (caller should hide the chrome module).
 */
export type PersistentTimerState = "idle" | "running" | "saving" | "sync-failed" | "unavailable";

export function usePersistentTimer() {
  const orpc = useOrpc();
  const agencyStore = useAgencyTimeTrackingStore();
  const { currentAgencyTeamId } = useCurrentAgencyTeam();

  const teamId = computed(() => currentAgencyTeamId.value);

  const activeTimerQuery = useQuery(
    computed(() => ({
      ...orpc.agencyOps.timer.getActive.queryOptions({
        input: {
          teamId: teamId.value || undefined,
        },
      }),
      enabled: Boolean(teamId.value),
      refetchInterval: 15_000,
    })),
  );

  const activeTimerQueryKey = computed(
    () =>
      orpc.agencyOps.timer.getActive.queryOptions({
        input: {
          teamId: teamId.value || undefined,
        },
      }).queryKey,
  );

  // Register the chrome's active-timer query with the store so optimistic
  // start/stop patches reach the chrome alongside the in-page tracker.
  watch(
    () => ({
      teamId: teamId.value,
      queryKey: activeTimerQueryKey.value,
    }),
    (next, previous) => {
      if (previous?.teamId) {
        agencyStore.unregisterActiveTimerQuery(previous.queryKey);
      }
      if (!next.teamId) return;
      agencyStore.registerActiveTimerQuery({
        teamId: next.teamId,
        queryKey: next.queryKey,
      });
    },
    { immediate: true },
  );

  onScopeDispose(() => {
    agencyStore.unregisterActiveTimerQuery(activeTimerQueryKey.value);
  });

  // Tick: drive elapsed seconds without re-reading the timer object.
  const now = ref(Date.now());
  let tickerHandle: ReturnType<typeof setInterval> | null = null;

  onMounted(() => {
    tickerHandle = setInterval(() => {
      now.value = Date.now();
    }, 1_000);
  });

  onBeforeUnmount(() => {
    if (tickerHandle) {
      clearInterval(tickerHandle);
      tickerHandle = null;
    }
  });

  const activeTimer = computed(() => activeTimerQuery.data.value?.timer ?? null);

  const elapsedSeconds = computed(() => {
    const timer = activeTimer.value;
    if (!timer) return 0;
    const startedAt = new Date(timer.startedAt).getTime();
    if (Number.isNaN(startedAt)) return 0;
    return Math.max(0, Math.floor((now.value - startedAt) / 1_000));
  });

  const state = computed<PersistentTimerState>(() => {
    if (!teamId.value) return "unavailable";
    if (agencyStore.isTimerMutationPending) return "saving";
    if (activeTimerQuery.error.value) return "sync-failed";
    return activeTimer.value ? "running" : "idle";
  });

  async function stop() {
    const team = teamId.value;
    const timer = activeTimer.value;
    if (!team || !timer) return;
    await agencyStore.stopTimer({
      teamId: team,
      activeTimer: timer,
      tagIds: timer.tags.map((tag) => tag.id),
      selectedTags: timer.tags,
      description: timer.description,
      linkUrl: timer.linkUrl ?? "",
    });
  }

  async function discard() {
    const team = teamId.value;
    if (!team) return;
    await agencyStore.stopTimer({
      teamId: team,
      activeTimer: activeTimer.value,
      tagIds: [],
      selectedTags: [],
      description: "",
      linkUrl: "",
      discard: true,
    });
  }

  return {
    teamId,
    state,
    activeTimer,
    elapsedSeconds,
    stop,
    discard,
    refetch: activeTimerQuery.refetch,
  };
}
