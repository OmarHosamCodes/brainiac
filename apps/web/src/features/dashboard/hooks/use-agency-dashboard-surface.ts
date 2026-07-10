import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { AgencyTimeRangeFilters } from "@/features/shared/use-agency-time-range-filters";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { orpc } from "@/lib/orpc";
import { useAgencyPresenceMembers } from "@/features/shared/agency-queries";
import { useTheme } from "@/stores/theme";

export type UseAgencyDashboardSurfaceProps = {
  teamId: string;
  filters: AgencyTimeRangeFilters;
};

export type AgencyDashboardSurfaceViewModel = ReturnType<typeof useAgencyDashboardSurface>;

export function useAgencyDashboardSurface({ teamId, filters }: UseAgencyDashboardSurfaceProps) {
  const { range, projectId, memberUserId, clientId, clientIds, projectIds, memberUserIds } =
    filters;
  const { members: presenceMembers } = useAgencyPresenceMembers(teamId);
  const { isDark } = useTheme();

  const dashboardQuery = useQuery({
    ...orpc.agencyOps.reports.dashboard.queryOptions({
      input: {
        teamId,
        from: range.from,
        to: range.to,
        clientId,
        projectId,
        memberUserId,
        clientIds,
        projectIds,
        memberUserIds,
      },
    }),
    enabled: Boolean(teamId),
    placeholderData: keepPreviousData,
  });

  const summary = dashboardQuery.data?.summary ?? null;
  const rankedProjects = summary?.timeDistributionByProject.slice(0, 10) ?? [];
  const totalProjectHours =
    summary?.timeDistributionByProject.reduce((sum, row) => sum + row.hours, 0) ?? 0;

  const activeTimerByUserId = useMemo(
    () => new Map(presenceMembers.map((member) => [member.userId, member])),
    [presenceMembers],
  );

  const sortedTeamMembers = useMemo(() => {
    const members = summary?.teamMembers ?? [];
    return [...members].sort((a, b) => b.totalSeconds - a.totalSeconds);
  }, [summary?.teamMembers]);

  const sortedRankedProjects = useMemo(() => {
    const list = [...rankedProjects];
    return list.sort((a, b) => b.hours - a.hours);
  }, [rankedProjects]);

  const errorMessage = getErrorMessage(dashboardQuery.error, "Try refreshing.");

  return {
    isLoading: dashboardQuery.isLoading,
    isError: dashboardQuery.isError,
    errorMessage,
    summary,
    rankedProjects,
    totalProjectHours,
    activeTimerByUserId,
    sortedTeamMembers,
    sortedRankedProjects,
    isDark,
    refetch: () => {
      void dashboardQuery.refetch();
    },
  };
}
