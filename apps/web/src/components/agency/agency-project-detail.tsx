import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Clock, FolderX } from "lucide-react";
import { useMemo } from "react";

import { AgencyProjectTasks } from "@/components/agency/agency-project-tasks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { orpc } from "@/lib/orpc";
import {
  agencyEmptyPanelClass,
  agencyErrorPanelClass,
  agencyLabelClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import { projectHueStyle } from "@/lib/utils/project-palette";

type AgencyProjectDetailProps = {
  teamId: string;
  projectId: string;
  onBack: () => void;
};

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
    <div className="agency-project-detail space-y-4">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft />
          Back to projects
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 rounded-2xl" />
          <div className="grid gap-3 lg:grid-cols-2">
            <Skeleton className="h-64 rounded-2xl" />
            <Skeleton className="h-64 rounded-2xl" />
          </div>
        </div>
      ) : isError ? (
        <div className={agencyErrorPanelClass} role="alert">
          <AlertTriangle className="mx-auto size-5 text-error" />
          <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load this project.</p>
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
          <div className="rounded-2xl border border-default bg-default p-5">
            <div className="flex flex-wrap items-baseline justify-between gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  {project.clientName}
                </p>
                <h2 className="mt-1 flex min-w-0 items-center gap-2.5">
                  <span
                    className="agency-project-detail__dot inline-block size-2.5 shrink-0 rounded-full"
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
                    className={[
                      "ml-2 font-mono tabular-nums font-bold",
                      totalsThisWeek > 0 ? "text-highlighted" : "text-dimmed",
                    ].join(" ")}
                  >
                    {formatDuration(totalsThisWeek, "short")}
                  </span>
                </div>
                <div>
                  <span className={agencyLabelClass}>Last 30 days</span>
                  <span
                    className={[
                      "ml-2 font-mono tabular-nums font-bold",
                      totalsLast30 > 0 ? "text-highlighted" : "text-dimmed",
                    ].join(" ")}
                  >
                    {formatDuration(totalsLast30, "short")}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 border-t border-default pt-4">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  Budget burn
                </p>
                <p
                  className={["text-[11px]", projectBudget ? "text-muted" : "text-dimmed"].join(
                    " ",
                  )}
                >
                  {projectBudget ? `${budgetPct}% used` : "Not set · configure rates in Settings"}
                </p>
              </div>
              <div className="mt-2 h-1.5 rounded-full bg-elevated">
                <div
                  className={[
                    "h-full rounded-full transition-[width] duration-200 ease-out",
                    projectBudget ? budgetTone : "bg-muted",
                  ].join(" ")}
                  style={{ width: `${projectBudget ? budgetPct : 0}%` }}
                />
              </div>
            </div>
          </div>

          <AgencyProjectTasks teamId={teamId} projectId={projectId} projectName={project.name} />

          <div className="grid gap-4 lg:grid-cols-[20rem,1fr]">
            <article className="rounded-2xl border border-default bg-default">
              <header className="border-b border-default px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  Hours by member · this week
                </p>
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
                          className="agency-project-detail__hue-bar h-full rounded-full"
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

            <article className="rounded-2xl border border-default bg-default">
              <header className="border-b border-default px-4 py-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
                  Recent activity · last 30 days
                </p>
              </header>

              {recentEntries.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <Clock className="mx-auto size-5 text-muted" />
                  <p className="mt-3 text-xs text-muted">No activity in the last 30 days.</p>
                </div>
              ) : (
                <ul className="divide-y divide-default">
                  {recentEntries.map((entry) => (
                    <li
                      key={entry.id}
                      className="grid grid-cols-[5.5rem,8rem,1fr,4.5rem] items-baseline gap-3 px-4 py-2.5 text-xs"
                    >
                      <span className="font-mono tabular-nums text-muted">
                        {formatEntryDate(entry.startedAt)}
                        <span className="text-dimmed"> {formatEntryTime(entry.startedAt)}</span>
                      </span>
                      <span className="truncate font-bold text-highlighted">{entry.userName}</span>
                      <span className="truncate text-muted">{entry.description || "None"}</span>
                      <span className="text-right font-mono font-bold tabular-nums text-highlighted">
                        {formatDuration(entry.durationSeconds, "short")}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          </div>
        </>
      )}
    </div>
  );
}
