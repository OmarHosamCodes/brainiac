import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ChevronDown, Clock, FolderX } from "lucide-react";
import { useMemo, useState } from "react";

import { AgencyProjectJourneyStepper } from "@/components/agency/journey/agency-project-journey-stepper";
import { AgencyProjectTasks } from "@/components/agency/agency-project-tasks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import { useAgencyProjectJourney } from "@/lib/agency/hooks/use-agency-project-journey";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyFocusRingClass,
  agencyLabelClass,
  agencyPanelClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { projectHueStyle } from "@/lib/utils/project-palette";
import { cn } from "@/lib/utils";

type AgencyProjectDetailProps = {
  teamId: string;
  projectId: string;
  onBack: () => void;
};

const ACTIVITY_SORTS = [
  { id: "newest" as const, label: "Newest first" },
  { id: "oldest" as const, label: "Oldest first" },
  { id: "longest" as const, label: "Most time" },
] as const;

type ActivitySort = (typeof ACTIVITY_SORTS)[number]["id"];

function startOfWeekUtcIso(): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const day = date.getUTCDay();
  const diff = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - diff);
  return date.toISOString();
}

export function AgencyProjectDetail({ teamId, projectId, onBack }: AgencyProjectDetailProps) {
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

  function formatEntryDate(iso: string): string {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
  }

  function formatEntryTime(iso: string): string {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  const isLoading = projectsQuery.isPending || entriesQuery.isPending;
  const isError = projectsQuery.isError || entriesQuery.isError;

  function retryLoad() {
    void projectsQuery.refetch();
    void entriesQuery.refetch();
  }

  return (
    <div className="agency-project-detail flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to projects
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-28 rounded-2xl" />
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <Skeleton className="h-80 rounded-2xl" />
            <Skeleton className="h-80 rounded-2xl" />
          </div>
        </div>
      ) : isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">
            Couldn&apos;t load this project.
          </p>
          <p className="mt-1 text-xs text-muted">
            {getErrorMessage(entriesQuery.error ?? projectsQuery.error, "Try refreshing.")}
          </p>
          <Button variant="secondary" size="sm" className="mt-3" onClick={retryLoad}>
            Retry
          </Button>
        </div>
      ) : !project ? (
        <div className={agencyEmptyPanelClass}>
          <FolderX className="mx-auto size-7 text-muted" />
          <p className="mt-4 text-sm font-bold text-highlighted">Project not found.</p>
          <p className="mt-1 text-xs text-muted">
            It may have been removed or moved to another team.
          </p>
        </div>
      ) : (
        <>
          <header className={cn(agencyPanelClass, "p-5")}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  {project.clientName}
                </p>
                <h2 className="mt-1 flex min-w-0 items-center gap-2.5">
                  <span
                    className="inline-block size-2.5 shrink-0 rounded-full"
                    aria-hidden="true"
                    style={projectHueStyle(project.id)}
                  />
                  <span className="truncate text-lg font-bold text-highlighted">
                    {project.name}
                  </span>
                </h2>
              </div>

              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 text-xs">
                <div>
                  <span className={agencyLabelClass}>This week</span>
                  <span
                    className={cn(
                      "ml-2 font-mono tabular-nums font-bold",
                      totalsThisWeek > 0 ? "text-highlighted" : "text-dimmed",
                    )}
                  >
                    {formatDuration(totalsThisWeek, "short")}
                  </span>
                </div>
                <div>
                  <span className={agencyLabelClass}>Last 30 days</span>
                  <span
                    className={cn(
                      "ml-2 font-mono tabular-nums font-bold",
                      totalsLast30 > 0 ? "text-highlighted" : "text-dimmed",
                    )}
                  >
                    {formatDuration(totalsLast30, "short")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-default pt-4">
              <div className="flex items-center justify-between">
                <p className={agencyLabelClass}>Budget burn</p>
                <p className={cn("text-[11px]", projectBudget ? "text-muted" : "text-dimmed")}>
                  {projectBudget ? `${budgetPct}% used` : "Not set · configure rates in Settings"}
                </p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-elevated">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-200 ease-out",
                    projectBudget ? budgetTone : "bg-muted",
                  )}
                  style={{ width: `${projectBudget ? budgetPct : 0}%` }}
                />
              </div>
            </div>
          </header>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div className="flex flex-col gap-4">
              {!journeyState.isLegacyProject && journeyState.hasJourney ? (
                <section className={cn(agencyPanelClass, "overflow-hidden")}>
                  <header className="border-b border-default px-4 py-3">
                    <button
                      type="button"
                      className={cn(
                        "flex w-full items-center justify-between gap-3 text-left md:cursor-default",
                        agencyFocusRingClass,
                        "rounded-md md:pointer-events-none",
                      )}
                      aria-expanded={journeyExpandedMobile}
                      onClick={() => setJourneyExpandedMobile((value) => !value)}
                    >
                      <div className="min-w-0">
                        <p className={agencyLabelClass}>Journey</p>
                        <p className="mt-1 font-mono text-[11px] tabular-nums text-muted">
                          {journeyState.journey?.completedSteps ?? 0}/
                          {journeyState.journey?.totalSteps ?? 0} steps
                        </p>
                      </div>
                      <ChevronDown
                        className={cn(
                          "size-4 shrink-0 text-muted md:hidden",
                          journeyExpandedMobile ? "" : "-rotate-90",
                        )}
                        aria-hidden
                      />
                    </button>
                  </header>
                  <div className={cn("px-2 py-3", !journeyExpandedMobile && "hidden md:block")}>
                    <AgencyProjectJourneyStepper teamId={teamId} projectId={projectId} />
                  </div>
                </section>
              ) : null}

              <section className={cn(agencyPanelClass, "flex flex-col")}>
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-default px-4 py-3">
                  <p className={agencyLabelClass}>Activity</p>
                  <div className="inline-flex items-center rounded-full border border-default bg-elevated p-0.5">
                    {ACTIVITY_SORTS.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        className={cn(
                          "h-7 rounded-full px-2.5 text-[11px] font-bold transition-colors motion-reduce:transition-none",
                          activitySort === option.id
                            ? "bg-default text-highlighted"
                            : "text-muted hover:text-highlighted",
                        )}
                        aria-pressed={activitySort === option.id}
                        onClick={() => setActivitySort(option.id)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </header>

                {sortedRecentEntries.length === 0 ? (
                  <div className="flex flex-1 flex-col items-center justify-center px-4 py-12 text-center">
                    <Clock className="mx-auto size-5 text-muted" />
                    <p className="mt-3 text-xs text-muted">No activity in the last 30 days.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <ul className="min-w-[36rem] divide-y divide-default">
                      {sortedRecentEntries.map((entry) => (
                        <li
                          key={entry.id}
                          className="grid grid-cols-[5.5rem_8rem_1fr_4.5rem] items-baseline gap-3 px-4 py-2.5 text-xs"
                        >
                          <span className="font-mono tabular-nums text-muted">
                            {formatEntryDate(entry.startedAt)}
                            <span className="text-dimmed"> {formatEntryTime(entry.startedAt)}</span>
                          </span>
                          <span className="truncate font-bold text-highlighted">
                            {entry.userName}
                          </span>
                          <span className="truncate text-muted">{entry.description || "None"}</span>
                          <span className="text-right font-mono font-bold tabular-nums text-highlighted">
                            {formatDuration(entry.durationSeconds, "short")}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </section>

              <AgencyProjectTasks
                teamId={teamId}
                projectId={projectId}
                projectName={project.name}
              />
            </div>

            <aside className="flex flex-col gap-4">
              <article className={agencyPanelClass}>
                <header className="border-b border-default px-4 py-3">
                  <p className={agencyLabelClass}>Hours by member · this week</p>
                </header>
                {hoursByMemberThisWeek.length > 0 ? (
                  <ul className="divide-y divide-default">
                    {hoursByMemberThisWeek.map((row) => (
                      <li key={row.userId} className="px-4 py-3">
                        <div className="flex items-baseline justify-between gap-3">
                          <span className="truncate text-xs font-bold text-highlighted">
                            {row.name}
                          </span>
                          <span className="font-mono text-[11px] tabular-nums text-muted">
                            {formatDuration(row.seconds, "short")}
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 rounded-full bg-elevated">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width:
                                memberSecondsMax > 0
                                  ? `${Math.round((row.seconds / memberSecondsMax) * 100)}%`
                                  : "0%",
                              ...projectHueStyle(project.id),
                            }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="px-4 py-8 text-center">
                    <p className="text-xs text-muted">No time logged this week.</p>
                  </div>
                )}
              </article>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}
