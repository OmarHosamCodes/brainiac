import { useQuery } from "@tanstack/react-query";
import { DollarSign } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { agencyEmptyPanelClass, agencySectionTitleClass } from "@/lib/utils/agency-ui";

type AgencySettingsRatesPaneProps = {
  teamId: string;
  active: boolean;
};

function formatRate(cents: number | null, currency: string): string {
  if (cents === null) return "Not set";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

export function AgencySettingsRatesPane({ teamId, active }: AgencySettingsRatesPaneProps) {
  const ratesQuery = useQuery({
    ...orpc.agencyOps.rates.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId) && active,
  });

  const rates = ratesQuery.data?.items ?? [];

  return (
    <div className="space-y-4">
      <div>
        <h2 className={agencySectionTitleClass}>Cost and billable rates per member</h2>
        <p className="mt-1 text-sm text-muted">
          Rates apply going forward, never retroactively. Override per project when a client
          negotiates a special rate.
        </p>
      </div>

      {ratesQuery.isPending ? (
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-10 rounded-lg" />
          ))}
        </div>
      ) : rates.length === 0 ? (
        <div className={agencyEmptyPanelClass}>
          <DollarSign className="mx-auto size-6 text-muted" />
          <p className="mt-3 text-sm font-bold text-highlighted">No rates set yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-muted">
            Once rates are configured for each member, budget burn and invoicing turn on across
            Projects and Billing. Rate editing ships in a follow-up release.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b border-default text-left text-muted">
              <tr>
                <th className="py-2 pr-4 font-semibold">Member</th>
                <th className="px-3 py-2 text-right font-semibold">Cost rate</th>
                <th className="px-3 py-2 text-right font-semibold">Billable rate</th>
                <th className="py-2 pl-3 font-semibold">Effective from</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.userId} className="border-b border-default last:border-b-0">
                  <td className="py-3 pr-4">
                    <p className="truncate font-bold text-highlighted">{rate.userName}</p>
                    <p className="truncate text-[11px] text-muted">{rate.userEmail}</p>
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-muted">
                    {formatRate(rate.costRateCents, rate.currency)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-highlighted">
                    {formatRate(rate.billableRateCents, rate.currency)}
                  </td>
                  <td className="py-3 pl-3 text-muted">
                    {rate.effectiveFrom
                      ? new Date(rate.effectiveFrom).toLocaleDateString(undefined, {
                          timeZone: "UTC",
                        })
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
