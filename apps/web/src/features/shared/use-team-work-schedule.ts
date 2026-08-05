import { useQuery } from "@tanstack/react-query";

import {
  DEFAULT_WORK_SCHEDULE,
  resolveWorkSchedule,
  type WorkSchedule,
} from "@orch/api/routers/agency-ops/resourcing/work-schedule";

import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";
import { orpc } from "@/lib/orpc";

export type TeamWorkSchedule = WorkSchedule;

export function useTeamWorkSchedule(teamId: string): TeamWorkSchedule {
  const query = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.agencyOps.tenure.policy.get.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );

  return resolveWorkSchedule(query.data?.policy ?? DEFAULT_WORK_SCHEDULE);
}
