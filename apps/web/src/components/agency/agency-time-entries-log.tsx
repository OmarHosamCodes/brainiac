import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Link,
  Loader2,
  MoreVertical,
  Play,
  Tag,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { orpc } from "@/lib/orpc";
import { withAgencyLiveQueryOptions } from "@/lib/utils/agency-query-options";
import { agencyLabelClass, agencyMetricClass } from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { getErrorMessage } from "@/lib/utils/get-error-message";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/stores/agency-time-tracking";

type AgencyTimeEntriesLogProps = {
  teamId: string;
  className?: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

type GroupedEntry = {
  key: string;
  projectId: string;
  taskId: string | null;
  taskTitle: string;
  projectName: string;
  clientName: string;
  description: string;
  linkUrl: string | null;
  tags: Array<{ id: string; name: string }>;
  totalSeconds: number;
  entries: Array<{
    id: string;
    startedAt: string;
    endedAt: string;
    durationSeconds: number;
  }>;
};

export function AgencyTimeEntriesLog({ teamId, className }: AgencyTimeEntriesLogProps) {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const deletingEntryIds = useAgencyTimeTrackingStore((s) => s.deletingEntryIds);
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const entriesQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.timeEntries.listMine.queryOptions({
        input: { teamId, page, pageSize },
      }),
      enabled: Boolean(teamId),
    }),
  );

  const projectsQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
      enabled: Boolean(teamId),
    }),
  );

  const entriesQueryKey = orpc.agencyOps.timeEntries.listMine.queryOptions({
    input: { teamId, page, pageSize },
  }).queryKey;

  const entries = entriesQuery.data?.items ?? [];
  const totalEntries = entriesQuery.data?.total ?? 0;
  const projects = projectsQuery.data?.items ?? [];
  const weekSummary = entriesQuery.data?.weekSummary ?? null;

  const groupedEntries = useMemo<GroupedEntry[]>(() => {
    const map = new Map<string, GroupedEntry>();

    for (const entry of entries) {
      const tagKey = [...entry.tags]
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((t) => t.id)
        .join(",");
      const taskKey = entry.taskId ?? `project-only:${entry.projectId}`;
      const key = `${taskKey}||${entry.description ?? ""}||${entry.linkUrl ?? ""}||${tagKey}`;

      const existing = map.get(key);

      if (existing) {
        existing.totalSeconds += entry.durationSeconds;
        existing.entries.push({
          id: entry.id,
          startedAt: entry.startedAt,
          endedAt: entry.endedAt,
          durationSeconds: entry.durationSeconds,
        });
      } else {
        map.set(key, {
          key,
          projectId: entry.projectId,
          taskId: entry.taskId ?? null,
          taskTitle: entry.taskTitle ?? "Project-only entry",
          projectName: entry.projectName,
          clientName: entry.clientName,
          description: entry.description ?? "",
          linkUrl: entry.linkUrl ?? null,
          tags: entry.tags,
          totalSeconds: entry.durationSeconds,
          entries: [
            {
              id: entry.id,
              startedAt: entry.startedAt,
              endedAt: entry.endedAt,
              durationSeconds: entry.durationSeconds,
            },
          ],
        });
      }
    }

    return [...map.values()];
  }, [entries]);

  const maxPage = useMemo(() => {
    if (pageSize <= 0) return 1;
    return Math.max(1, Math.ceil(totalEntries / pageSize));
  }, [pageSize, totalEntries]);

  const todaySeconds = useMemo(() => {
    const daily = weekSummary?.daily;
    if (!daily) return 0;
    const todayDate = new Date().toISOString().slice(0, 10);
    return daily.find((d) => d.date === todayDate)?.totalSeconds ?? 0;
  }, [weekSummary]);

  useEffect(() => {
    if (page > maxPage) setPage(maxPage);
  }, [maxPage, page]);

  useEffect(() => {
    setPage(1);
  }, [teamId]);

  useEffect(() => {
    if (!teamId) return;
    agencyTimeTrackingStore.registerLogQuery({ teamId, page, queryKey: entriesQueryKey });
    return () => agencyTimeTrackingStore.unregisterLogQuery(entriesQueryKey);
  }, [teamId, page, entriesQueryKey, agencyTimeTrackingStore]);

  const logRefreshing = entriesQuery.isFetching || projectsQuery.isFetching;
  const logQueryError = entriesQuery.error ?? projectsQuery.error ?? null;

  function setPageSizeValue(value: string) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return;
    setPageSize(Math.min(100, Math.max(5, Math.round(numeric))));
    setPage(1);
  }

  function formatDateTime(value: string) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "Invalid date";
    return dateTimeFormatter.format(parsed);
  }

  async function deleteEntry(entryId: string) {
    const entry = entries.find((item) => item.id === entryId);
    if (!teamId || !entry) return;
    await agencyTimeTrackingStore.deleteEntries({ teamId, entries: [entry] });
  }

  async function deleteGroupEntries(entryIds: string[]) {
    const selectedEntries = entries.filter((entry) => entryIds.includes(entry.id));
    if (!teamId || selectedEntries.length === 0) return;
    await agencyTimeTrackingStore.deleteEntries({ teamId, entries: selectedEntries });
  }

  async function restartEntry(group: GroupedEntry) {
    const project = projects.find((projectEntry) => projectEntry.id === group.projectId);
    if (!teamId || !project || !group.taskId) return;

    await agencyTimeTrackingStore.restartEntry({
      teamId,
      project,
      task: { id: group.taskId, title: group.taskTitle },
      description: group.description,
      linkUrl: group.linkUrl,
      tags: group.tags,
    });
  }

  function toggleGroup(key: string) {
    setExpandedGroups((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  return (
    <div className={["space-y-4", className].filter(Boolean).join(" ")}>
      <div className="flex flex-wrap items-center gap-3">
        <Input
          value={String(pageSize)}
          type="number"
          min={5}
          max={100}
          step={1}
          aria-label="Page size"
          className="w-20 shrink-0"
          onChange={(e) => setPageSizeValue(e.target.value)}
        />

        {logRefreshing ? (
          <Badge variant="secondary" className="rounded-full">
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="size-3.5 animate-spin" />
              Syncing
            </span>
          </Badge>
        ) : null}
      </div>

      {logQueryError ? (
        <div className="rounded-2xl border border-error/30 bg-error/5 p-4 text-sm" role="alert">
          <div className="flex items-start gap-2">
            <AlertTriangle className="mt-0.5 size-4 text-error" />
            <div>
              <p className="font-semibold text-highlighted">Unable to load entries</p>
              <p className="mt-1 text-muted">
                {getErrorMessage(logQueryError, "Please refresh and try again.")}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="space-y-3 border-t border-default pt-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold text-highlighted">My time entries</h3>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className={agencyLabelClass}>Today</p>
              <p className={["text-sm font-semibold", agencyMetricClass].join(" ")}>
                {formatDuration(todaySeconds, "short")}
              </p>
            </div>
            <div className="h-6 w-px bg-default" />
            <div className="text-right">
              <p className={agencyLabelClass}>This week</p>
              <p className={["text-sm font-semibold", agencyMetricClass].join(" ")}>
                {formatDuration(weekSummary?.totalSeconds ?? 0, "short")}
              </p>
            </div>
          </div>
        </div>

        {entriesQuery.isPending && entries.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map((rowIndex) => (
              <div key={rowIndex} className="h-14 animate-pulse rounded-xl bg-elevated/60" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted/30 p-4 text-sm text-muted">
            No entries found. Run a timer to populate your history.
          </div>
        ) : (
          groupedEntries.map((group) => (
            <article key={group.key} className="border-b border-default py-3 last:border-b-0">
              <div className="flex items-start gap-3">
                {group.entries.length > 1 ? (
                  <button
                    type="button"
                    className={[
                      "mt-0.5 shrink-0 text-muted transition-transform duration-200",
                      expandedGroups.has(group.key) ? "rotate-90" : "",
                    ].join(" ")}
                    aria-label={
                      expandedGroups.has(group.key) ? "Collapse entries" : "Expand entries"
                    }
                    onClick={() => toggleGroup(group.key)}
                  >
                    <ChevronRight className="size-3.5" />
                  </button>
                ) : null}

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-highlighted">{group.taskTitle}</p>
                  <p className="mt-0.5 truncate text-xs text-muted">
                    {group.clientName} · {group.projectName}
                  </p>
                  {group.description ? (
                    <p className="mt-0.5 truncate text-xs text-muted">{group.description}</p>
                  ) : null}
                  {group.entries.length === 1 ? (
                    <div className="mt-1.5">
                      <span className="text-[10px] text-muted">
                        {formatDateTime(group.entries[0]!.startedAt)} to{" "}
                        {formatDateTime(group.entries[0]!.endedAt)}
                      </span>
                    </div>
                  ) : null}

                  {group.tags.length > 0 || group.linkUrl ? (
                    <div className="mt-1.5 flex items-center gap-1">
                      {group.tags.length > 0 ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-primary">
                              <Tag />
                              {group.tags.length > 1 ? group.tags.length : null}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="flex max-w-56 flex-wrap gap-1 p-2">
                            {group.tags.map((tag) => (
                              <Badge key={tag.id} variant="secondary" className="rounded-full">
                                {tag.name}
                              </Badge>
                            ))}
                          </PopoverContent>
                        </Popover>
                      ) : null}

                      {group.linkUrl ? (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-primary" aria-label="View linked URL">
                              <Link />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-72 space-y-2 p-2">
                            <div className="flex items-center gap-2">
                              <Link className="size-3.5 shrink-0 text-muted" />
                              <p className="truncate text-xs text-muted">{group.linkUrl}</p>
                            </div>
                            <div className="flex justify-end">
                              <Button variant="ghost" size="sm" asChild>
                                <a href={group.linkUrl} target="_blank" rel="noreferrer">
                                  <ExternalLink />
                                  Open link
                                </a>
                              </Button>
                            </div>
                          </PopoverContent>
                        </Popover>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  <div className="text-right">
                    <Badge variant="secondary" className="font-mono tabular-nums">
                      {formatDuration(group.totalSeconds, "short")}
                    </Badge>
                    {group.entries.length > 1 ? (
                      <p className="mt-0.5 text-[10px] text-muted">
                        {group.entries.length} entries
                      </p>
                    ) : null}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={!teamId || !group.taskId || isTimerMutationPending}
                    aria-label={`Restart timer for ${group.taskTitle}`}
                    onClick={() => void restartEntry(group)}
                  >
                    <Play />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${group.taskTitle} entries`}
                    onClick={() => void deleteGroupEntries(group.entries.map((e) => e.id))}
                  >
                    <MoreVertical />
                  </Button>
                </div>
              </div>

              {group.entries.length > 1 && expandedGroups.has(group.key) ? (
                <div className="mt-2 space-y-1 border-t border-muted/10 pt-2">
                  {group.entries.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between gap-2">
                      <span className="text-[10px] text-muted">
                        {formatDateTime(entry.startedAt)} to {formatDateTime(entry.endedAt)}
                      </span>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <span className="font-mono text-[10px] tabular-nums text-muted">
                          {formatDuration(entry.durationSeconds, "short")}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-error"
                          disabled={deletingEntryIds.includes(entry.id)}
                          aria-label={`Delete entry from ${formatDateTime(entry.startedAt)}`}
                          onClick={() => void deleteEntry(entry.id)}
                        >
                          <Trash2 />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </article>
          ))
        )}

        <div className="flex items-center justify-between gap-2 pt-2">
          <Button variant="ghost" size="sm" disabled={page <= 1} onClick={() => setPage(Math.max(1, page - 1))}>
            <ChevronLeft />
            Previous
          </Button>
          <p className="text-xs text-muted">
            Page {page} / {maxPage}
          </p>
          <Button
            variant="ghost"
            size="sm"
            disabled={page >= maxPage}
            onClick={() => setPage(Math.min(maxPage, page + 1))}
          >
            Next
            <ChevronRight />
          </Button>
        </div>
      </section>
    </div>
  );
}
