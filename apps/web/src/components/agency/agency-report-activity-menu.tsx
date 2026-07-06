import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatRelativeReportTime,
} from "@/lib/agency/reports/agency-report-naming";
import { orpcClient } from "@/lib/orpc";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type ReportActivityAction =
  | "created"
  | "renamed"
  | "entries_excluded"
  | "entries_restored"
  | "entry_edited"
  | "waste_toggled"
  | "exported";

function formatActivityDescription(
  action: ReportActivityAction,
  payload: Record<string, unknown>,
): string {
  switch (action) {
    case "created":
      return "created this report";
    case "renamed":
      return "renamed the report";
    case "entries_excluded":
      return `removed ${String(payload.count ?? 1)} ${Number(payload.count ?? 1) === 1 ? "entry" : "entries"}`;
    case "entries_restored":
      return `restored ${String(payload.count ?? 1)} ${Number(payload.count ?? 1) === 1 ? "entry" : "entries"}`;
    case "entry_edited":
      return "edited an entry";
    case "waste_toggled":
      return payload.isWaste ? "marked a task as waste" : "unmarked a task as waste";
    case "exported":
      return "exported the report";
    default: {
      const unexpected: never = action;
      return unexpected;
    }
  }
}

type AgencyReportActivityMenuProps = {
  teamId: string;
  reportId: string;
};

export function AgencyReportActivityMenu({ teamId, reportId }: AgencyReportActivityMenuProps) {
  const [open, setOpen] = useState(false);

  const activityQuery = useQuery({
    queryKey: ["agency-reports", "saved", reportId, "activity"],
    queryFn: () =>
      orpcClient.agencyOps.reports.saved.listActivity({ teamId, reportId, limit: 50 }),
    enabled: open && Boolean(teamId && reportId),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 px-2 text-xs">
          <History className="size-3.5" />
          History
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="border-b border-default px-3 py-2.5">
          <p className="text-sm font-semibold text-highlighted">Activity</p>
        </div>
        <div className="max-h-72 overflow-y-auto p-2">
          {activityQuery.isPending ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }, (_, index) => (
                <Skeleton key={index} className="h-8 w-full rounded-lg" />
              ))}
            </div>
          ) : activityQuery.isError ? (
            <p className="px-1 py-3 text-center text-xs text-muted">Couldn't load activity.</p>
          ) : (activityQuery.data?.items.length ?? 0) === 0 ? (
            <p className="px-1 py-3 text-center text-xs text-muted">No changes yet.</p>
          ) : (
            activityQuery.data?.items.map((item) => (
              <div
                key={item.id}
                className={cn(
                  "rounded-lg px-2 py-1.5 text-xs",
                  agencyFocusRingClass,
                )}
              >
                <span className="font-semibold text-highlighted">{item.actorUserName}</span>{" "}
                <span className="text-muted">
                  {formatActivityDescription(item.action, item.payload)} ·{" "}
                  {formatRelativeReportTime(item.createdAt)}
                </span>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
