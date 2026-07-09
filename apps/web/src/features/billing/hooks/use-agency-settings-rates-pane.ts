import { useQuery } from "@tanstack/react-query";

import { orpc } from "@/lib/orpc";

export type UseAgencySettingsRatesPaneProps = {
  teamId: string;
  active: boolean;
};

export type AgencySettingsRatesPaneViewModel = ReturnType<typeof useAgencySettingsRatesPane>;

export function useAgencySettingsRatesPane({ teamId, active }: UseAgencySettingsRatesPaneProps) {
  const ratesQuery = useQuery({
    ...orpc.agencyOps.rates.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && active,
  });

  const rates = ratesQuery.data?.items ?? [];

  return {
    isPending: ratesQuery.isPending,
    rates,
  };
}
