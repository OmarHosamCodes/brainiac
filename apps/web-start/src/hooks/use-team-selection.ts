import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import { useSession } from "@/lib/auth-client";
import { orpc } from "@/lib/orpc";

export function useTeamSelection() {
  const session = useSession();
  const authEnabled = Boolean(session.data?.user);
  const [selectedTeamId, setSelectedTeamId] = React.useState("");

  const teamListQuery = useQuery({
    ...orpc.team.list.queryOptions(),
    enabled: authEnabled,
  });

  const teams = teamListQuery.data?.items ?? [];

  React.useEffect(() => {
    if (selectedTeamId && teams.some((team) => team.id === selectedTeamId)) {
      return;
    }

    setSelectedTeamId(teams[0]?.id ?? "");
  }, [selectedTeamId, teams]);

  const teamDetailQuery = useQuery({
    ...orpc.team.get.queryOptions({ input: { teamId: selectedTeamId } }),
    enabled: Boolean(authEnabled && selectedTeamId),
  });

  return {
    teamListQuery,
    teamDetailQuery,
    teams,
    selectedTeam: teamDetailQuery.data ?? null,
    selectedTeamId,
    setSelectedTeamId,
    refreshTeamData: async () => {
      await Promise.all([teamListQuery.refetch(), teamDetailQuery.refetch()]);
    },
  };
}
