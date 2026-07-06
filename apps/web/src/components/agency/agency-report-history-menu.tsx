import { History } from "lucide-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  formatAgencyReportHistoryLabel,
  formatAgencyReportHistoryMeta,
  loadAgencyReportHistory,
  type ReportHistoryLabelContext,
} from "@/lib/agency/reports/agency-report-history";
import type { AgencyTimeRangeFilterSnapshot } from "@/lib/agency/use-agency-time-range-filters";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

const historyItemClass = cn(
  "flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

type AgencyReportHistoryMenuProps = {
  teamId: string;
  labelContext: ReportHistoryLabelContext;
  onSelect: (snapshot: AgencyTimeRangeFilterSnapshot) => void;
  refreshKey?: number;
};

export function AgencyReportHistoryMenu({
  teamId,
  labelContext,
  onSelect,
  refreshKey = 0,
}: AgencyReportHistoryMenuProps) {
  const [open, setOpen] = useState(false);
  const entries = useMemo(
    () => (open ? loadAgencyReportHistory(teamId) : []),
    [open, teamId, refreshKey],
  );

  function handleSelect(snapshot: AgencyTimeRangeFilterSnapshot) {
    onSelect(snapshot);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="px-2.5"
          aria-label="Report history"
          title="Report history"
        >
          <History />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-default px-3 py-2.5">
          <p className="text-sm font-semibold text-highlighted">Report history</p>
          <p className="text-xs text-muted">Restore a recent filter setup.</p>
        </div>
        <div className="max-h-72 overflow-y-auto p-1">
          {entries.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-muted">
              No saved reports yet. Apply filters or create a report to build history.
            </p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={historyItemClass}
                onClick={() => handleSelect(entry)}
              >
                <span className="truncate text-xs font-semibold text-highlighted">
                  {formatAgencyReportHistoryLabel(entry, labelContext)}
                </span>
                <span className="text-[11px] text-muted">
                  {formatAgencyReportHistoryMeta(entry)}
                </span>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
