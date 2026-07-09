import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { orpcClient } from "@/lib/orpc";
import { formatRelativeReportTime } from "@/features/reports/agency-report-naming";

export type UseAgencyReportActivityMenuProps = {
  teamId: string;
  reportId: string;
};

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

export function useAgencyReportActivityMenu({
  teamId,
  reportId,
}: UseAgencyReportActivityMenuProps) {
  const [open, setOpen] = useState(false);

  const activityQuery = useQuery({
    queryKey: ["agency-reports", "saved", reportId, "activity"],
    queryFn: () => orpcClient.agencyOps.reports.saved.listActivity({ teamId, reportId, limit: 50 }),
    enabled: open && Boolean(teamId && reportId),
  });

  const items =
    activityQuery.data?.items.map((item) => {
      return {
        id: item.id,
        actorUserName: item.actorUserName,
        description: formatActivityDescription(item.action as ReportActivityAction, item.payload),
        timeAgo: formatRelativeReportTime(item.createdAt),
      };
    }) ?? [];

  return {
    open,
    setOpen,
    isPending: activityQuery.isPending,
    isError: activityQuery.isError,
    items,
  };
}

export type AgencyReportActivityMenuViewModel = ReturnType<typeof useAgencyReportActivityMenu>;
