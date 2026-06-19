import { create } from "zustand";
import { useEffect, useMemo, useState } from "react";

import { useAgencyActiveTimerQuery } from "@/hooks/use-agency-queries";
import { authClient } from "@/lib/auth-client";
import { setAgencyTimeTrackingUserId } from "@/stores/agency-time-tracking";
import {
  useAgencyTimeTrackingStore,
  selectIsTimerMutationPending,
} from "@/stores/agency-time-tracking";

type CurrentAgencyTeamState = {
  currentAgencyTeamId: string | null;
  setCurrentAgencyTeamId: (teamId: string | null) => void;
};

export const useCurrentAgencyTeamStore = create<CurrentAgencyTeamState>((set) => ({
  currentAgencyTeamId: null,
  setCurrentAgencyTeamId: (teamId) => set({ currentAgencyTeamId: teamId || null }),
}));

export function useCurrentAgencyTeam() {
  const currentAgencyTeamId = useCurrentAgencyTeamStore((s) => s.currentAgencyTeamId);
  const setCurrentAgencyTeamId = useCurrentAgencyTeamStore((s) => s.setCurrentAgencyTeamId);
  return { currentAgencyTeamId, setCurrentAgencyTeamId };
}

export type PersistentTimerState = "idle" | "running" | "saving" | "sync-failed" | "unavailable";

export function usePersistentTimer() {
  const { currentAgencyTeamId } = useCurrentAgencyTeam();
  const teamId = currentAgencyTeamId;
  const agencyStore = useAgencyTimeTrackingStore();
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const session = authClient.useSession();

  useEffect(() => {
    setAgencyTimeTrackingUserId(session.data?.user?.id ?? null);
  }, [session.data?.user?.id]);

  const activeTimerQuery = useAgencyActiveTimerQuery(teamId ?? "");

  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const tickerHandle = window.setInterval(() => {
      setNow(Date.now());
    }, 1_000);
    return () => window.clearInterval(tickerHandle);
  }, []);

  const activeTimer = activeTimerQuery.data?.timer ?? null;

  const elapsedSeconds = useMemo(() => {
    if (!activeTimer) return 0;
    const startedAt = new Date(activeTimer.startedAt).getTime();
    if (Number.isNaN(startedAt)) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1_000));
  }, [activeTimer, now]);

  const state = useMemo<PersistentTimerState>(() => {
    if (!teamId) return "unavailable";
    if (isTimerMutationPending) return "saving";
    if (activeTimerQuery.error) return "sync-failed";
    return activeTimer ? "running" : "idle";
  }, [teamId, isTimerMutationPending, activeTimerQuery.error, activeTimer]);

  async function stop() {
    if (!teamId || !activeTimer) return;
    await agencyStore.stopTimer({
      teamId,
      activeTimer,
      description: activeTimer.description,
    });
  }

  async function discard() {
    if (!teamId) return;
    await agencyStore.stopTimer({
      teamId,
      activeTimer,
      description: "",
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
