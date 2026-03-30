import { useQuery } from "@tanstack/vue-query";
import { computed, ref, watch } from "vue";

export function useTeamSelection() {
  const orpc = useOrpc();

  const selectedTeamId = ref("");
  const newTeamName = ref("");
  const teamNameDraft = ref("");

  const teamListQuery = useQuery(orpc.team.list.queryOptions());
  const teamDetailQuery = useQuery(
    computed(() => ({
      ...orpc.team.get.queryOptions({ input: { teamId: selectedTeamId.value } }),
      enabled: Boolean(selectedTeamId.value),
    })),
  );

  const teams = computed(() => teamListQuery.data.value?.items ?? []);
  const selectedTeam = computed(() => teamDetailQuery.data.value ?? null);

  watch(
    teams,
    (nextTeams) => {
      if (
        selectedTeamId.value &&
        nextTeams.some((team) => team.id === selectedTeamId.value)
      ) {
        return;
      }

      selectedTeamId.value = nextTeams[0]?.id ?? "";
    },
    { immediate: true },
  );

  watch(
    selectedTeam,
    (team) => {
      teamNameDraft.value = team?.name ?? "";
    },
    { immediate: true },
  );

  async function refreshTeamData() {
    await Promise.all([teamListQuery.refetch(), teamDetailQuery.refetch()]);
  }

  return {
    teamListQuery,
    teamDetailQuery,
    teams,
    selectedTeam,
    selectedTeamId,
    newTeamName,
    teamNameDraft,
    refreshTeamData,
  };
}
