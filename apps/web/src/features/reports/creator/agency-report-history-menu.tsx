import { FileText } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import { Button } from "@/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import {
  SavedReportsListBody,
  SavedReportsListSkeleton,
  useSavedReportsList,
} from "@/features/reports/agency-saved-reports-list";
import type { SavedReportSearchContext } from "@/features/reports/agency-report-naming";

type AgencyReportHistoryMenuProps = {
  teamId: string;
  searchContext: SavedReportSearchContext;
  onSelectReport: (reportId: string) => void;
};

export function AgencyReportHistoryMenu({
  teamId,
  searchContext,
  onSelectReport,
}: AgencyReportHistoryMenuProps) {
  const [open, setOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const activeReportId = searchParams.get("report");
  const reportsQuery = useSavedReportsList({ teamId, enabled: open });

  function handleSelect(reportId: string) {
    onSelectReport(reportId);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="px-2.5"
          aria-label="Reports"
          title="Reports"
        >
          <FileText />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b border-default/55 px-3 py-2.5">
          <p className="text-sm font-semibold text-highlighted">Reports</p>
          <p className="text-xs text-muted">Open a saved report.</p>
        </div>
        {reportsQuery.isPending ? (
          <SavedReportsListSkeleton />
        ) : reportsQuery.isError ? (
          <p className="px-3 py-4 text-center text-xs text-muted">Couldn't load reports.</p>
        ) : (
          <SavedReportsListBody
            items={reportsQuery.data?.items ?? []}
            searchContext={searchContext}
            activeReportId={activeReportId}
            onSelect={handleSelect}
          />
        )}
      </PopoverContent>
    </Popover>
  );
}
