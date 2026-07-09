import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export type UseAgencySettingsIntegrationsPaneProps = {
  teamId: string;
  active: boolean;
};

export type AgencySettingsIntegrationsPaneViewModel = ReturnType<
  typeof useAgencySettingsIntegrationsPane
>;

export function useAgencySettingsIntegrationsPane({
  teamId,
  active,
}: UseAgencySettingsIntegrationsPaneProps) {
  const integrationsQuery = useQuery({
    ...orpc.agencyOps.integrations.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && active,
  });

  const integrations = integrationsQuery.data?.items ?? [];

  return {
    isPending: integrationsQuery.isPending,
    integrations,
  };
}
