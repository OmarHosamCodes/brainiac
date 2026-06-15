import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";

import { authClient } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

export function useTeamSelection() {
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);

  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [teamNameDraft, setTeamNameDraft] = useState("");

  const teamListQuery = useQuery({
    ...orpc.team.list.queryOptions(),
    enabled: authEnabled,
  });

  const teamDetailQuery = useQuery({
    ...orpc.team.get.queryOptions({ input: { teamId: selectedTeamId } }),
    enabled: Boolean(authEnabled && selectedTeamId),
  });

  const teams = useMemo(() => teamListQuery.data?.items ?? [], [teamListQuery.data?.items]);
  const selectedTeam = teamDetailQuery.data ?? null;

  useEffect(() => {
    if (selectedTeamId && teams.some((team) => team.id === selectedTeamId)) {
      return;
    }

    setSelectedTeamId(teams[0]?.id ?? "");
  }, [selectedTeamId, teams]);

  useEffect(() => {
    setTeamNameDraft(selectedTeam?.name ?? "");
  }, [selectedTeam?.name]);

  async function refreshTeamData() {
    await Promise.all([teamListQuery.refetch(), teamDetailQuery.refetch()]);
  }

  return {
    teamListQuery,
    teamDetailQuery,
    teams,
    selectedTeam,
    selectedTeamId,
    setSelectedTeamId,
    newTeamName,
    setNewTeamName,
    teamNameDraft,
    setTeamNameDraft,
    refreshTeamData,
  };
}
