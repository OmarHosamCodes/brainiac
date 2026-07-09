import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import type { AgencyReportHeaderLabelContext } from "@/features/reports/agency-report-naming";
import { useAgencyClientsQuery } from "@/features/shared/agency-queries";
import { orpc } from "@/lib/orpc";

export function useAgencyReportLabelContext(teamId: string): AgencyReportHeaderLabelContext {
  const clientsQuery = useAgencyClientsQuery(teamId);
  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });
  const membersQuery = useQuery({
    ...orpc.agencyOps.taskThreads.members.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  return useMemo(
    () => ({
      clients: (clientsQuery.data?.items ?? []).map((client) => ({
        id: client.id,
        name: client.name,
      })),
      projects: (projectsQuery.data?.items ?? []).map((project) => ({
        id: project.id,
        name: project.name,
      })),
      members: (membersQuery.data?.items ?? []).map((member) => ({
        userId: member.userId,
        userName: member.userName,
      })),
    }),
    [clientsQuery.data?.items, membersQuery.data?.items, projectsQuery.data?.items],
  );
}
