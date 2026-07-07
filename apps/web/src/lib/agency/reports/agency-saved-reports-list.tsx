import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  filterSavedReports,
  formatRelativeReportTime,
  groupSavedReportsByPeriod,
  type SavedReportListItem,
  type SavedReportSearchContext,
} from "@/lib/agency/reports/agency-report-naming";
import { orpcClient } from "@/lib/orpc";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

const reportItemClass = cn(
  "flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

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

type SavedReportsListBodyProps = {
  items: SavedReportListItem[];
  searchContext: SavedReportSearchContext;
  onSelect: (reportId: string) => void;
  searchable?: boolean;
  compact?: boolean;
};

export function SavedReportsListBody({
  items,
  searchContext,
  onSelect,
  searchable = true,
  compact = false,
}: SavedReportsListBodyProps) {
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = useMemo(
    () => filterSavedReports(items, searchTerm, searchContext),
    [items, searchContext, searchTerm],
  );
  const grouped = useMemo(() => groupSavedReportsByPeriod(filtered), [filtered]);

  if (items.length === 0) {
    return (
      <p className="px-2 py-4 text-center text-xs text-muted">
        No reports yet. Create one from the current filters.
      </p>
    );
  }

  return (
    <>
      {searchable ? (
        <div className="border-b border-default p-2">
          <Input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search reports…"
            className="h-8 rounded-lg border-default bg-default text-xs"
          />
        </div>
      ) : null}
      <div className={cn("overflow-y-auto p-1", compact ? "max-h-60" : "max-h-72")}>
        {filtered.length === 0 ? (
          <p className="px-2 py-4 text-center text-xs text-muted">No matching reports.</p>
        ) : (
          grouped.map((section) => (
            <div key={section.group.key} className="mb-2 last:mb-0">
              <p className="px-2 py-1 text-[10px] font-semibold tracking-wide text-muted uppercase">
                {section.group.label}
              </p>
              {section.items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className={reportItemClass}
                  onClick={() => onSelect(item.id)}
                >
                  <span className="truncate text-xs font-semibold text-highlighted">
                    {item.name}
                  </span>
                  <span className="text-[11px] text-muted">
                    {item.createdByUserName} · edited {formatRelativeReportTime(item.updatedAt)}
                  </span>
                </button>
              ))}
            </div>
          ))
        )}
      </div>
    </>
  );
}

export function SavedReportsListSkeleton() {
  return (
    <div className="space-y-2 p-2">
      {Array.from({ length: 4 }, (_, index) => (
        <Skeleton key={index} className="h-10 w-full rounded-lg" />
      ))}
    </div>
  );
}
