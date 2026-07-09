import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { orpc } from "@/lib/orpc";

export type DatePreset = "this-week" | "last-month" | "year-to-date" | "custom";

type Props = { teamId: string };

export function useAgencyTimeSummary({ teamId }: Props) {
  const [datePreset, setDatePreset] = useState<DatePreset>("this-week");
  const [customFromDate, setCustomFromDate] = useState("");
  const [customToDate, setCustomToDate] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [selectedMemberUserId, setSelectedMemberUserId] = useState("");

  const dateRange = useMemo(() => {
    const now = new Date();
    let from: Date;
    let to: Date;
    switch (datePreset) {
      case "this-week": {
        const dayOfWeek = now.getDay();
        const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        from = new Date(now.getFullYear(), now.getMonth(), diff);
        to = new Date(from);
        to.setDate(to.getDate() + 6);
        break;
      }
      case "last-month":
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
        break;
      case "year-to-date":
        from = new Date(now.getFullYear(), 0, 1);
        to = now;
        break;
      case "custom":
        from = customFromDate
          ? new Date(customFromDate)
          : new Date(now.getFullYear(), now.getMonth(), 1);
        to = customToDate ? new Date(customToDate) : now;
        break;
    }
    return { from, to };
  }, [customFromDate, customToDate, datePreset]);

  const clientsQuery = useQuery({
    ...orpc.agencyOps.clients.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({
      input: { teamId, clientId: selectedClientId || undefined },
    }),
    enabled: Boolean(teamId),
  });
  const summaryQuery = useQuery({
    ...orpc.agencyOps.summary.list.queryOptions({
      input: {
        teamId,
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        clientId: selectedClientId || undefined,
        projectId: selectedProjectId || undefined,
        memberUserId: selectedMemberUserId || undefined,
      },
    }),
    enabled: Boolean(teamId),
  });

  return {
    datePreset,
    setDatePreset,
    customFromDate,
    setCustomFromDate,
    customToDate,
    setCustomToDate,
    selectedClientId,
    setSelectedClientId,
    selectedProjectId,
    setSelectedProjectId,
    selectedMemberUserId,
    setSelectedMemberUserId,
    clients: clientsQuery.data?.items ?? [],
    projects: projectsQuery.data?.items ?? [],
    summaryData: summaryQuery.data?.summary ?? null,
  };
}

export type AgencyTimeSummaryViewModel = ReturnType<typeof useAgencyTimeSummary>;
