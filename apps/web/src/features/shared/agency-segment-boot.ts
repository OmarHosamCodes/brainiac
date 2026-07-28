import type { QueryClient } from "@tanstack/react-query";

import {
  isAgencyManagementPaneId,
  type AgencyManagementPaneId,
} from "@/features/shared/agency-management-sections";
import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { ensureAgencyWorkBootQueries } from "@/features/shared/agency-queries";
import {
  getCurrentTenurePeriodRange,
  resolveDefaultDashboardRangePreset,
  resolveDefaultTenureMonthIndexes,
} from "@/features/resourcing/tenure-utils";
import { orpc } from "@/lib/orpc";
import {
  prefetchAgencySyncQueryOptions,
  type AgencySyncTier,
} from "@/features/shared/agency-query-options";

const MANAGEMENT_WEEKS_AHEAD = 4;

type EnsureAgencySegmentBootInput = {
  segment: AgencySegmentId;
  teamId: string;
  userId: string;
  searchParams: URLSearchParams;
};

function startOfWeekUtc(date = new Date()): Date {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const diff = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

function ensureSyncedQuery(
  queryClient: QueryClient,
  options: any,
  tier: AgencySyncTier = "warm",
): Promise<any> {
  return queryClient.ensureQueryData(prefetchAgencySyncQueryOptions(options, tier) as any);
}

async function resolveDashboardRange(queryClient: QueryClient, teamId: string) {
  const now = new Date();
  const endIso = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
  ).toISOString();

  const policyData = await ensureSyncedQuery(
    queryClient,
    orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
    "cold",
  );
  const tenurePolicy = policyData?.policy ?? null;
  const preset = resolveDefaultDashboardRangePreset(tenurePolicy);

  if (preset === "tenure") {
    const tenureRange = getCurrentTenurePeriodRange(
      tenurePolicy,
      now,
      resolveDefaultTenureMonthIndexes(tenurePolicy, now),
    );
    if (tenureRange) {
      return { from: tenureRange.from, to: tenureRange.to };
    }
  }

  return {
    from: new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
    ).toISOString(),
    to: endIso,
  };
}

function managementPaneFromSearchParams(searchParams: URLSearchParams): AgencyManagementPaneId {
  const manage = searchParams.get("manage");
  return isAgencyManagementPaneId(manage) ? manage : "resourcing";
}

async function ensureManagementBootQueries(
  queryClient: QueryClient,
  teamId: string,
  searchParams: URLSearchParams,
) {
  const pane = managementPaneFromSearchParams(searchParams);

  switch (pane) {
    case "resourcing": {
      const weekStart = startOfWeekUtc().toISOString();
      await ensureSyncedQuery(
        queryClient,
        orpc.agencyOps.capacity.list.queryOptions({
          input: { teamId, weekStart, weeks: MANAGEMENT_WEEKS_AHEAD },
        }),
        "cold",
      );
      break;
    }
    case "invoices":
      await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.invoices.summary.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.invoices.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
      ]);
      break;
    case "rates":
      await ensureSyncedQuery(
        queryClient,
        orpc.agencyOps.rates.list.queryOptions({ input: { teamId } }),
        "cold",
      );
      break;
    case "tags":
      await ensureSyncedQuery(
        queryClient,
        orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }),
        "cold",
      );
      break;
    case "tenure":
      await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.tenure.summary.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
      ]);
      break;
    default: {
      const _exhaustive: never = pane;
      return _exhaustive;
    }
  }
}

export async function ensureAgencySegmentBootQueries(
  queryClient: QueryClient,
  { segment, teamId, userId, searchParams }: EnsureAgencySegmentBootInput,
) {
  if (!teamId) return;

  switch (segment) {
    case "work":
      await ensureAgencyWorkBootQueries(queryClient, teamId, userId);
      break;
    case "dashboard": {
      const range = await resolveDashboardRange(queryClient, teamId);
      await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.reports.dashboard.queryOptions({
            input: {
              teamId,
              from: range.from,
              to: range.to,
            },
          }),
          "cold",
        ),
      ]);
      break;
    }
    case "clients":
      await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
      ]);
      break;
    case "projects":
      await ensureSyncedQuery(
        queryClient,
        orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
        "cold",
      );
      break;
    case "reports":
      await Promise.all([
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
        ensureSyncedQuery(
          queryClient,
          orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }),
          "cold",
        ),
      ]);
      break;
    case "management":
      await ensureManagementBootQueries(queryClient, teamId, searchParams);
      break;
    default: {
      const _exhaustive: never = segment;
      return _exhaustive;
    }
  }
}
