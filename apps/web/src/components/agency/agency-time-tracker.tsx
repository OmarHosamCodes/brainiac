import { useQuery } from "@tanstack/react-query";
import { Link, MoreVertical, Search, Tag, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { orpc } from "@/lib/orpc";
import { withAgencyLiveQueryOptions } from "@/lib/utils/agency-query-options";
import { formatDuration } from "@/lib/utils/format-duration";
import {
  getAgencyLinkUrlDisplayLabel,
  normalizeAgencyLinkUrl,
} from "@/lib/utils/normalize-agency-link-url";
import {
  selectIsTimerMutationPending,
  useAgencyTimeTrackingStore,
} from "@/stores/agency-time-tracking";

type AgencyTimeTrackerProps = {
  teamId: string;
};

export function AgencyTimeTracker({ teamId }: AgencyTimeTrackerProps) {
  const agencyTimeTrackingStore = useAgencyTimeTrackingStore();
  const isTimerMutationPending = useAgencyTimeTrackingStore(selectIsTimerMutationPending);
  const [now, setNow] = useState(Date.now());
  const [tagSearch, setTagSearch] = useState("");

  useEffect(() => {
    const tickerHandle = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(tickerHandle);
  }, []);

  const projectsQuery = useQuery({
    ...orpc.agencyOps.projects.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const tasksQuery = useQuery({
    ...orpc.agencyOps.projectTasks.list.queryOptions({
      input: { teamId, statuses: ["open", "in_progress"] },
    }),
    enabled: Boolean(teamId),
  });

  const tagsQuery = useQuery({
    ...orpc.agencyOps.tags.list.queryOptions({ input: { teamId } }),
    enabled: Boolean(teamId),
  });

  const activeTimerQuery = useQuery(
    withAgencyLiveQueryOptions({
      ...orpc.agencyOps.timer.getActive.queryOptions({
        input: { teamId: teamId || undefined },
      }),
      enabled: Boolean(teamId),
    }),
  );

  const activeTimerQueryKey = orpc.agencyOps.timer.getActive.queryOptions({
    input: { teamId: teamId || undefined },
  }).queryKey;

  const projects = projectsQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];
  const tags = tagsQuery.data?.items ?? [];
  const activeTimer = activeTimerQuery.data?.timer ?? null;
  const trackerDraft = teamId ? agencyTimeTrackingStore.getDraft(teamId) : null;

  const filteredTags = useMemo(() => {
    const query = tagSearch.trim().toLowerCase();
    if (!query) return tags;
    return tags.filter((tag) => tag.name.toLowerCase().includes(query));
  }, [tagSearch, tags]);

  const selectedTaskId = trackerDraft?.taskId ?? "";
  const selectedTagIds = trackerDraft?.selectedTagIds ?? [];
  const timerDescription = trackerDraft?.description ?? "";
  const timerLinkUrl = trackerDraft?.linkUrl ?? "";

  const selectedTask = tasks.find((task) => task.id === selectedTaskId) ?? null;
  const selectedProject = selectedTask
    ? (projects.find((project) => project.id === selectedTask.projectId) ?? null)
    : null;
  const selectedTags = tags.filter((tag) => selectedTagIds.includes(tag.id));
  const linkUrlState = normalizeAgencyLinkUrl(timerLinkUrl);
  const hasValidLinkUrl = Boolean(linkUrlState.normalizedUrl);
  const linkUrlDisplayLabel = getAgencyLinkUrlDisplayLabel(linkUrlState.normalizedUrl);

  useEffect(() => {
    if (!teamId) return;
    agencyTimeTrackingStore.ensureTrackerDraft(teamId);
  }, [teamId, agencyTimeTrackingStore]);

  useEffect(() => {
    if (!teamId) return;
    agencyTimeTrackingStore.syncDraftFromActiveTimer(teamId, activeTimer);
  }, [teamId, activeTimer, agencyTimeTrackingStore]);

  useEffect(() => {
    if (!teamId) return;
    agencyTimeTrackingStore.registerActiveTimerQuery({ teamId, queryKey: activeTimerQueryKey });
    return () => agencyTimeTrackingStore.unregisterActiveTimerQuery(activeTimerQueryKey);
  }, [teamId, activeTimerQueryKey, agencyTimeTrackingStore]);

  const elapsedSeconds = useMemo(() => {
    if (!activeTimer) return 0;
    const startedAt = new Date(activeTimer.startedAt).getTime();
    if (Number.isNaN(startedAt)) return 0;
    return Math.max(0, Math.floor((now - startedAt) / 1_000));
  }, [activeTimer, now]);

  const canStartTimer = Boolean(
    teamId && selectedTask && selectedProject && selectedTagIds.length > 0 && !activeTimer,
  );
  const canStopTimer = Boolean(activeTimer && selectedTagIds.length > 0);

  const timerValidationHint = useMemo(() => {
    if (activeTimer ? canStopTimer : canStartTimer) return "";

    const missingRequirements: string[] = [];
    if (!activeTimer && !selectedTask) missingRequirements.push("a task");
    if (selectedTagIds.length === 0) missingRequirements.push("at least one tag");

    if (missingRequirements.length === 0) return "";
    return `Select ${missingRequirements.join(" and ")} to ${activeTimer ? "stop and save" : "start"} this timer.`;
  }, [activeTimer, canStartTimer, canStopTimer, selectedTagIds.length, selectedTask]);

  async function startTimer() {
    if (!teamId || !selectedProject || !selectedTask) return;

    await agencyTimeTrackingStore.startTimer({
      teamId,
      project: selectedProject,
      task: selectedTask,
      tagIds: [...selectedTagIds],
      selectedTags: [...selectedTags],
      description: timerDescription,
      linkUrl: timerLinkUrl,
    });
  }

  async function stopTimer(discard = false) {
    if (!teamId || !activeTimer || (!discard && !canStopTimer)) return;

    await agencyTimeTrackingStore.stopTimer({
      teamId,
      activeTimer,
      tagIds: [...selectedTagIds],
      selectedTags: [...selectedTags],
      description: timerDescription,
      linkUrl: timerLinkUrl,
      discard,
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={timerDescription}
          onChange={(e) =>
            teamId && agencyTimeTrackingStore.setTrackerDescription(teamId, e.target.value)
          }
          placeholder="What are you working on?"
          className="min-w-0 flex-1"
          disabled={isTimerMutationPending || !teamId}
        />

        <AgencyTaskChooser
          value={selectedTaskId}
          onValueChange={(value) =>
            teamId && agencyTimeTrackingStore.setTrackerTaskId(teamId, value || "")
          }
          projects={projects}
          tasks={tasks}
          placeholder={!teamId ? "Team first" : "Task"}
          className="w-64 shrink-0 max-sm:w-full"
          loading={projectsQuery.isPending || tasksQuery.isPending}
          disabled={
            !teamId ||
            projectsQuery.isPending ||
            tasksQuery.isPending ||
            Boolean(activeTimer)
          }
        />

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isTimerMutationPending || !teamId || tagsQuery.isPending}
              aria-label="Select timer tags"
            >
              <Tag className={selectedTagIds.length > 0 ? "text-primary" : ""} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 space-y-2 p-2">
            <div className="relative">
              <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
              <Input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags"
                className="h-8 pl-8 text-xs"
                disabled={tags.length === 0}
              />
            </div>
            <div className="flex max-h-52 flex-wrap gap-1 overflow-y-auto">
              {filteredTags.map((tag) => (
                <Button
                  key={tag.id}
                  variant={selectedTagIds.includes(tag.id) ? "secondary" : "ghost"}
                  size="sm"
                  className="rounded-full"
                  onClick={() => teamId && agencyTimeTrackingStore.toggleTrackerTag(teamId, tag.id)}
                >
                  {tag.name}
                </Button>
              ))}
              {tags.length === 0 ? (
                <div className="px-1 py-2 text-xs text-muted">
                  No tags yet. Add tags in Agency settings.
                </div>
              ) : filteredTags.length === 0 ? (
                <div className="px-1 py-2 text-xs text-muted">No matching tags.</div>
              ) : null}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              disabled={isTimerMutationPending || !teamId}
            >
              <Link className={hasValidLinkUrl ? "text-primary" : ""} />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 space-y-2 p-2">
            <div className="relative">
              <Link className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
              <Input
                value={timerLinkUrl}
                onChange={(e) =>
                  teamId && agencyTimeTrackingStore.setTrackerLinkUrl(teamId, e.target.value)
                }
                placeholder="Paste a task, ticket, or brief URL"
                className="h-8 pl-8 text-xs"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              {linkUrlState.error ? (
                <p className="text-[11px] text-error">{linkUrlState.error}</p>
              ) : hasValidLinkUrl ? (
                <p className="truncate text-[11px] text-muted">{linkUrlState.normalizedUrl}</p>
              ) : (
                <span className="text-[11px] text-muted">Link this entry to a task or brief.</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                disabled={!timerLinkUrl}
                onClick={() => teamId && agencyTimeTrackingStore.setTrackerLinkUrl(teamId, "")}
              >
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Popover>

        <Button
          variant={activeTimer ? "secondary" : "default"}
          className="min-w-28 shrink-0 font-mono tabular-nums font-bold"
          disabled={activeTimer ? !canStopTimer : !canStartTimer}
          onClick={() => void (activeTimer ? stopTimer() : startTimer())}
        >
          {isTimerMutationPending
            ? "…"
            : activeTimer
              ? formatDuration(elapsedSeconds)
              : "Start"}
        </Button>

        {activeTimer ? (
          <Button variant="ghost" size="sm" onClick={() => void stopTimer(true)}>
            <MoreVertical />
          </Button>
        ) : null}
      </div>

      {selectedTags.length > 0 || hasValidLinkUrl ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {linkUrlState.normalizedUrl ? (
            <a
              href={linkUrlState.normalizedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-w-0 max-w-full items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs text-primary transition hover:border-primary/40 hover:bg-primary/15"
            >
              <Link className="size-3 shrink-0" />
              <span className="truncate">{linkUrlDisplayLabel}</span>
            </a>
          ) : null}
          {selectedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="rounded-full">
              {tag.name}
            </Badge>
          ))}
        </div>
      ) : null}

      {timerValidationHint ? (
        <p className="text-xs text-warning">{timerValidationHint}</p>
      ) : null}

      {activeTimer ? (
        <Button
          variant="ghost"
          size="sm"
          className="text-error"
          onClick={() => void stopTimer(true)}
        >
          <Trash2 />
          Discard timer
        </Button>
      ) : null}
    </div>
  );
}
