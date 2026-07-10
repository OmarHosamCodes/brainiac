import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { useAgencyProjectJourney } from "@/features/projects/use-agency-project-journey";

export type ActivitySort = "newest" | "oldest" | "longest";

function startOfWeekUtcIso(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString();
}

export type AgencyProjectDetailViewModel = {
  teamId: string;
  projectId: string;
  isLoading: boolean;
  isError: boolean;
  errorMessage: string;
  project: any;
  projectBudget: any;
  budgetPct: number;
  budgetTone: string;
  totalsThisWeek: number;
  totalsLast30: number;
  hoursByMemberThisWeek: Array<{ userId: string; name: string; seconds: number }>;
  memberSecondsMax: number;
  sortedRecentEntries: any[];
  activitySort: ActivitySort;
  setActivitySort: (sort: ActivitySort) => void;
  journeyExpandedMobile: boolean;
  setJourneyExpandedMobile: (expanded: boolean | ((val: boolean) => boolean)) => void;
  journeyState: ReturnType<typeof useAgencyProjectJourney>;
  retryLoad: () => void;
};

type UseAgencyProjectDetailOptions = {
  teamId: string;
  projectId: string;
};

export function useAgencyProjectDetail({
  teamId,
  projectId,
}: UseAgencyProjectDetailOptions): AgencyProjectDetailViewModel {
  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 29),
    );
    const end = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999),
    );
    return { from: start.toISOString(), to: end.toISOString() };
  }, []);

  const [activitySort, setActivitySort] = useState<ActivitySort>("newest");
  const [journeyExpandedMobile, setJourneyExpandedMobile] = useState(true);

  const journeyState = useAgencyProjectJourney(teamId, projectId, {
    enabled: Boolean(teamId && projectId),
  });

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const project = (projectsQuery.data?.items ?? []).find((entry) => entry.id === projectId) ?? null;

  const entriesQuery = useQuery({
    ...orpc.agencyOps.reports.listEntries.queryOptions({
      input: {
        teamId,
        projectId,
        from: range.from,
        to: range.to,
        page: 1,
        pageSize: 100,
      },
    }),
    enabled: Boolean(teamId) && Boolean(projectId),
  });

  const budgetsQuery = useQuery({
    ...orpc.agencyOps.budgets.list.queryOptions({
      input: { teamId, projectId },
    }),
    enabled: Boolean(teamId) && Boolean(projectId),
  });

  const projectBudget =
    budgetsQuery.data?.items.find((entry) => entry.projectId === projectId) ?? null;

  const budgetPct = useMemo(() => {
    if (!projectBudget) return 0;
    if (projectBudget.hoursBudget && projectBudget.hoursBudget > 0) {
      return Math.min(
        100,
        Math.round((projectBudget.hoursLogged / projectBudget.hoursBudget) * 100),
      );
    }
    if (projectBudget.costBudgetCents && projectBudget.costBudgetCents > 0) {
      return Math.min(
        100,
        Math.round((projectBudget.costLoggedCents / projectBudget.costBudgetCents) * 100),
      );
    }
    return 0;
  }, [projectBudget]);

  const budgetTone = budgetPct >= 100 ? "bg-error" : budgetPct >= 85 ? "bg-warning" : "bg-primary";

  const entries = entriesQuery.data?.items ?? [];
  const weekStartIso = startOfWeekUtcIso();

  const totalsThisWeek = useMemo(() => {
    const cutoff = new Date(weekStartIso).getTime();
    return entries
      .filter((entry) => new Date(entry.startedAt).getTime() >= cutoff)
      .reduce((sum, entry) => sum + entry.durationSeconds, 0);
  }, [entries, weekStartIso]);

  const totalsLast30 = useMemo(
    () => entries.reduce((sum, entry) => sum + entry.durationSeconds, 0),
    [entries],
  );

  const hoursByMemberThisWeek = useMemo(() => {
    const cutoff = new Date(weekStartIso).getTime();
    const map = new Map<string, { name: string; seconds: number }>();
    for (const entry of entries) {
      if (new Date(entry.startedAt).getTime() < cutoff) continue;
      const existing = map.get(entry.userId);
      map.set(entry.userId, {
        name: entry.userName,
        seconds: (existing?.seconds ?? 0) + entry.durationSeconds,
      });
    }
    return [...map.entries()]
      .map(([userId, value]) => ({ userId, ...value }))
      .sort((a, b) => b.seconds - a.seconds);
  }, [entries, weekStartIso]);

  const memberSecondsMax = hoursByMemberThisWeek.reduce(
    (max, row) => Math.max(max, row.seconds),
    0,
  );

  const recentEntries = [...entries]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, 25);

  const sortedRecentEntries = useMemo(() => {
    const list = [...recentEntries];
    if (activitySort === "newest") return list;
    if (activitySort === "oldest") return list.reverse();
    return list.sort((a, b) => b.durationSeconds - a.durationSeconds);
  }, [recentEntries, activitySort]);

  const isLoading = projectsQuery.isPending || entriesQuery.isPending;
  const isError = projectsQuery.isError || entriesQuery.isError;
  const errorMessage = getErrorMessage(
    entriesQuery.error ?? projectsQuery.error,
    "Try refreshing.",
  );

  function retryLoad() {
    void projectsQuery.refetch();
    void entriesQuery.refetch();
    void budgetsQuery.refetch();
  }

  return {
    teamId,
    projectId,
    isLoading,
    isError,
    errorMessage,
    project,
    projectBudget,
    budgetPct,
    budgetTone,
    totalsThisWeek,
    totalsLast30,
    hoursByMemberThisWeek,
    memberSecondsMax,
    sortedRecentEntries,
    activitySort,
    setActivitySort,
    journeyExpandedMobile,
    setJourneyExpandedMobile,
    journeyState,
    retryLoad,
  };
}
