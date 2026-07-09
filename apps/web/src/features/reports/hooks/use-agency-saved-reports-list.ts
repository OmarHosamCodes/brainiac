import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { orpcClient } from "@/lib/orpc";
import {
  filterSavedReports,
  groupSavedReportsByPeriod,
  type SavedReportListItem,
  type SavedReportSearchContext,
} from "@/features/reports/agency-report-naming";

type UseSavedReportsListOptions = {
  teamId: string;
  enabled: boolean;
};

export function useSavedReportsList({ teamId, enabled }: UseSavedReportsListOptions) {
  return useQuery({
    queryKey: ["agency-reports", "saved", teamId],
    queryFn: () => orpcClient.agencyOps.reports.saved.list({ teamId }),
    enabled: enabled && Boolean(teamId),
  });
}

export type UseSavedReportsListBodyProps = {
  items: SavedReportListItem[];
  searchContext: SavedReportSearchContext;
};

export function useSavedReportsListBody({ items, searchContext }: UseSavedReportsListBodyProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(
    () => filterSavedReports(items, searchTerm, searchContext),
    [items, searchContext, searchTerm],
  );
  const grouped = useMemo(() => groupSavedReportsByPeriod(filtered), [filtered]);

  return {
    searchTerm,
    setSearchTerm,
    filtered,
    grouped,
  };
}

export type SavedReportsListBodyViewModel = ReturnType<typeof useSavedReportsListBody>;
