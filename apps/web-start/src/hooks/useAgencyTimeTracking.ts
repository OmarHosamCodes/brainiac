import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";

import { useAgencyTimeTrackingStore } from "@/stores/agency-time-tracking";
import type { AgencyActiveTimer, AgencyTimeEntry } from "@/stores/agency-time-tracking";

type QueryKey = readonly unknown[];

/**
 * Hook for agency time tracking operations (timer, entries, drafts).
 * Handles optimistic updates and draft management per team.
 *
 * Note: Actual mutations (startTimer, stopTimer, deleteEntries) should be called
 * from components using React Query's useMutation hook with oRPC procedures.
 * This hook focuses on client-side state and draft management.
 */
export function useAgencyTimeTracking(teamId: string | null) {
  const queryClient = useQueryClient();

  const draftByTeam = useAgencyTimeTrackingStore((state) => state.draftByTeam);
  const isTimerMutationPending = useAgencyTimeTrackingStore((state) =>
    state.isTimerMutationPending(),
  );
  const deletingEntryIds = useAgencyTimeTrackingStore((state) => state.deletingEntryIds);

  const store = useAgencyTimeTrackingStore(
    useShallow((state) => ({
      registerActiveTimerQuery: state.registerActiveTimerQuery,
      unregisterActiveTimerQuery: state.unregisterActiveTimerQuery,
      registerLogQuery: state.registerLogQuery,
      unregisterLogQuery: state.unregisterLogQuery,
    })),
  );

  // Draft management
  const ensureTrackerDraft = useCallback(() => {
    if (!teamId) return null;
    return useAgencyTimeTrackingStore.getState().ensureTrackerDraft(teamId);
  }, [teamId]);

  const setTrackerDescription = useCallback(
    (description: string) => {
      if (!teamId) return;
      useAgencyTimeTrackingStore.getState().setTrackerDescription(teamId, description);
    },
    [teamId],
  );

  const setTrackerProjectId = useCallback(
    (projectId: string) => {
      if (!teamId) return;
      useAgencyTimeTrackingStore.getState().setTrackerProjectId(teamId, projectId);
    },
    [teamId],
  );

  const setTrackerSelectedTagIds = useCallback(
    (tagIds: string[]) => {
      if (!teamId) return;
      useAgencyTimeTrackingStore.getState().setTrackerSelectedTagIds(teamId, tagIds);
    },
    [teamId],
  );

  const setTrackerLinkUrl = useCallback(
    (linkUrl: string) => {
      if (!teamId) return;
      useAgencyTimeTrackingStore.getState().setTrackerLinkUrl(teamId, linkUrl);
    },
    [teamId],
  );

  const toggleTrackerTag = useCallback(
    (tagId: string) => {
      if (!teamId) return;
      useAgencyTimeTrackingStore.getState().toggleTrackerTag(teamId, tagId);
    },
    [teamId],
  );

  // Query registry
  const registerActiveTimerQuery = useCallback(
    (queryKey: QueryKey) => {
      if (!teamId) return;
      store.registerActiveTimerQuery({
        queryKey,
        teamId,
      });
    },
    [teamId, store],
  );

  const unregisterActiveTimerQuery = useCallback(
    (queryKey: QueryKey) => {
      store.unregisterActiveTimerQuery(queryKey);
    },
    [store],
  );

  const registerLogQuery = useCallback(
    (queryKey: QueryKey, page: number) => {
      if (!teamId) return;
      store.registerLogQuery({
        queryKey,
        teamId,
        page,
      });
    },
    [teamId, store],
  );

  const unregisterLogQuery = useCallback(
    (queryKey: QueryKey) => {
      store.unregisterLogQuery(queryKey);
    },
    [store],
  );

  // Helper to update optimistic state
  const applyOptimisticTimer = useCallback(
    (timer: AgencyActiveTimer | null) => {
      const store = useAgencyTimeTrackingStore.getState();
      store.patchActiveTimerCaches(timer, queryClient);
    },
    [queryClient],
  );

  const applyOptimisticEntry = useCallback(
    (entry: AgencyTimeEntry) => {
      if (!teamId) return;
      const store = useAgencyTimeTrackingStore.getState();
      store.patchInsertedEntry(teamId, entry, queryClient);
    },
    [teamId, queryClient],
  );

  const currentDraft = teamId ? draftByTeam[teamId] : null;

  return {
    // State
    currentDraft,
    isTimerMutationPending,
    deletingEntryIds,

    // Draft management
    ensureTrackerDraft,
    setTrackerDescription,
    setTrackerProjectId,
    setTrackerSelectedTagIds,
    setTrackerLinkUrl,
    toggleTrackerTag,

    // Query registry
    registerActiveTimerQuery,
    unregisterActiveTimerQuery,
    registerLogQuery,
    unregisterLogQuery,

    // Optimistic updates
    applyOptimisticTimer,
    applyOptimisticEntry,
  };
}
