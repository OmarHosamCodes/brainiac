import {
  WORKSPACE_TASK_DOMAINS,
  WORKSPACE_TASK_QUADRANTS,
  collectWorkspaceNodeTasks,
  createWorkspaceTimeOrchestratorSettings,
  getWorkspaceTaskDomainLabel,
  getWorkspaceTaskQuadrant,
  getWorkspaceTaskQuadrantLabel,
  type WorkspaceCollectedTask,
  type WorkspaceTaskDomain,
  type WorkspaceTaskQuadrant,
  type WorkspaceTimeOrchestratorBlock,
} from "@orch/workspace";
import { CalendarClock, Plug2, RotateCcw } from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { WorkspaceOrchestratorSourcesModal } from "@/features/workspace/node/blocks/workspace-orchestrator-sources-modal";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { cn } from "@/lib/utils";

function formatMinutes(minutes: number) {
  const roundedMinutes = Math.max(0, Math.round(minutes));

  if (roundedMinutes < 60) {
    return `${roundedMinutes} min`;
  }

  const hours = Math.floor(roundedMinutes / 60);
  const remainder = roundedMinutes % 60;

  if (remainder === 0) {
    return `${hours}h`;
  }

  return `${hours}h ${remainder}m`;
}

function getTaskActionLabel(item: WorkspaceCollectedTask) {
  const taskLabel = item.task.text || "Untitled task";
  return item.task.completed ? `Reopen ${taskLabel}` : `Complete ${taskLabel}`;
}

export function WorkspaceTimeOrchestratorBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTimeOrchestratorBlock>) {
  const {
    currentNode,
    allNodes,
    mutateTypedBlock,
    mutateCollectedTask,
    connectSource,
    disconnectSource,
    removeCollectedTask,
    addTaskToSource,
    navigateToSource,
    getTimeOrchestratorSummaryForBlock,
    formatRelativeTaskMeta,
  } = useWorkspaceNodeEditorContext();

  const [sourcesModalOpen, setSourcesModalOpen] = useState(false);

  const summary = getTimeOrchestratorSummaryForBlock(block);

  const openTasks = useMemo(
    () =>
      currentNode
        ? collectWorkspaceNodeTasks(currentNode).filter(({ task }) => !task.completed)
        : [],
    [currentNode],
  );

  const domainFilters = useMemo(() => {
    const counts = new Map<WorkspaceTaskDomain, number>();

    for (const domain of WORKSPACE_TASK_DOMAINS) {
      counts.set(domain, 0);
    }

    let unassigned = 0;

    for (const item of openTasks) {
      if (item.task.domain) {
        counts.set(item.task.domain, (counts.get(item.task.domain) ?? 0) + 1);
        continue;
      }

      unassigned += 1;
    }

    return [
      ...WORKSPACE_TASK_DOMAINS.map((domain) => ({
        key: domain as WorkspaceTaskDomain | "unassigned",
        label: getWorkspaceTaskDomainLabel(domain),
        count: counts.get(domain) ?? 0,
        active: block.settings.domains.includes(domain),
      })),
      {
        key: "unassigned" as const,
        label: "Unassigned",
        count: unassigned,
        active: block.settings.includeUnassigned,
      },
    ];
  }, [openTasks, block.settings.domains, block.settings.includeUnassigned]);

  const quadrantFilters = useMemo(() => {
    const counts = new Map<WorkspaceTaskQuadrant, number>();

    for (const quadrant of WORKSPACE_TASK_QUADRANTS) {
      counts.set(quadrant, 0);
    }

    for (const item of openTasks) {
      const key = getWorkspaceTaskQuadrant(item.task);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }

    return WORKSPACE_TASK_QUADRANTS.map((quadrant) => ({
      key: quadrant,
      label: getWorkspaceTaskQuadrantLabel(quadrant),
      count: counts.get(quadrant) ?? 0,
      active: block.settings.quadrants.includes(quadrant),
    }));
  }, [openTasks, block.settings.quadrants]);

  const visibleQuadrants = useMemo(() => {
    if (!summary) {
      return [];
    }

    return block.settings.quadrants.map((quadrant) => summary.quadrants[quadrant]);
  }, [summary, block.settings.quadrants]);

  const primarySummaryCards = useMemo(
    () => [
      {
        key: "overdue",
        label: "Overdue",
        value: summary?.overdue.length ?? 0,
        supportingLabel: "tasks",
        className: "border-destructive/30 bg-destructive/5",
        valueClassName: "text-destructive",
      },
      {
        key: "upcoming",
        label: "Upcoming",
        value: summary?.upcoming.length ?? 0,
        supportingLabel: "next 7 days",
        className: "border-info/30 bg-info/5",
        valueClassName: "text-info",
      },
      {
        key: "high-priority",
        label: "High Priority",
        value: summary?.highPriority.length ?? 0,
        supportingLabel: "tasks",
        className: "border-warning/30 bg-warning/5",
        valueClassName: "text-warning",
      },
      {
        key: "workload",
        label: "Estimated Workload",
        value: formatMinutes(summary?.totalEstimateMinutes ?? 0),
        supportingLabel: `${summary?.totalOpenTasks ?? 0} open task${
          (summary?.totalOpenTasks ?? 0) === 1 ? "" : "s"
        }`,
        className: "border-primary/30 bg-primary/5",
        valueClassName: "text-primary",
      },
    ],
    [summary],
  );

  const secondarySummaryStats = useMemo(
    () => [
      {
        key: "open",
        label: "Open Tasks",
        value: String(summary?.totalOpenTasks ?? 0),
      },
      {
        key: "urgency",
        label: "Avg Urgency",
        value: String(summary?.averageUrgency ?? 0),
      },
      {
        key: "importance",
        label: "Avg Importance",
        value: String(summary?.averageImportance ?? 0),
      },
      {
        key: "quadrants",
        label: "Visible Quadrants",
        value: String(visibleQuadrants.length),
      },
    ],
    [summary, visibleQuadrants.length],
  );

  function updateSettings(mutator: (settings: WorkspaceTimeOrchestratorBlock["settings"]) => void) {
    mutateTypedBlock(tabId, block.id, "time-orchestrator", (entry) => {
      const nextSettings = createWorkspaceTimeOrchestratorSettings(entry.settings);
      mutator(nextSettings);
      entry.settings = createWorkspaceTimeOrchestratorSettings(nextSettings);
    });
  }

  function toggleDomain(domain: WorkspaceTaskDomain) {
    updateSettings((settings) => {
      settings.domains = settings.domains.includes(domain)
        ? settings.domains.filter((entry) => entry !== domain)
        : [...settings.domains, domain];
    });
  }

  function toggleUnassigned() {
    updateSettings((settings) => {
      settings.includeUnassigned = !settings.includeUnassigned;
    });
  }

  function toggleQuadrant(quadrant: WorkspaceTaskQuadrant) {
    updateSettings((settings) => {
      settings.quadrants = settings.quadrants.includes(quadrant)
        ? settings.quadrants.filter((entry) => entry !== quadrant)
        : [...settings.quadrants, quadrant];
    });
  }

  function resetFilters() {
    updateSettings((settings) => {
      settings.domains = [...WORKSPACE_TASK_DOMAINS];
      settings.includeUnassigned = true;
      settings.quadrants = [...WORKSPACE_TASK_QUADRANTS];
    });
  }

  function toggleTaskCompletion(item: WorkspaceCollectedTask) {
    mutateCollectedTask(item, (task) => {
      task.completed = !task.completed;
    });
  }

  function handleMutateTask(
    item: WorkspaceCollectedTask,
    mutator: (task: WorkspaceCollectedTask["task"]) => void,
  ) {
    mutateCollectedTask(item, mutator);
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5 backdrop-blur-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-primary">
              <CalendarClock className="size-5" />
              <p className="text-[10px] font-bold uppercase tracking-[0.2em]">Time Orchestrator</p>
            </div>
            <h3 className="text-lg font-bold tracking-tight text-foreground">
              Focus the workload view around what matters now
            </h3>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Saved filters keep this block aligned to the domains and urgency quadrants you want
              leadership to review first.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              aria-label="Manage connected sources"
              onClick={() => setSourcesModalOpen(true)}
            >
              <Plug2 />
              Manage Sources
            </Button>

            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              aria-label="Reset time orchestrator filters"
              onClick={resetFilters}
            >
              <RotateCcw />
              Reset Filters
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <fieldset className="space-y-3">
            <legend className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Domain filters
            </legend>
            <div className="flex flex-wrap gap-2">
              {domainFilters.map((domain) => (
                <Button
                  key={domain.key}
                  type="button"
                  size="sm"
                  variant={domain.active ? "secondary" : "outline"}
                  className={cn(
                    "rounded-xl",
                    domain.active && "border-primary/20 bg-primary/10 text-primary",
                  )}
                  aria-pressed={domain.active}
                  aria-label={`${domain.active ? "Disable" : "Enable"} ${domain.label} domain filter`}
                  onClick={() =>
                    domain.key === "unassigned" ? toggleUnassigned() : toggleDomain(domain.key)
                  }
                >
                  {domain.label}
                  <span className="ml-2 text-[10px] font-black opacity-60">{domain.count}</span>
                </Button>
              ))}
            </div>
          </fieldset>

          <fieldset className="space-y-3">
            <legend className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Quadrant filters
            </legend>
            <div className="flex flex-wrap gap-2">
              {quadrantFilters.map((quadrant) => (
                <Button
                  key={quadrant.key}
                  type="button"
                  size="sm"
                  variant={quadrant.active ? "secondary" : "outline"}
                  className={cn(
                    "rounded-xl",
                    quadrant.active && "border-primary/20 bg-primary/10 text-primary",
                  )}
                  aria-pressed={quadrant.active}
                  aria-label={`${quadrant.active ? "Disable" : "Enable"} ${quadrant.label} quadrant filter`}
                  onClick={() => toggleQuadrant(quadrant.key)}
                >
                  {quadrant.label}
                  <span className="ml-2 text-[10px] font-black opacity-60">{quadrant.count}</span>
                </Button>
              ))}
            </div>
          </fieldset>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {primarySummaryCards.map((card) => (
          <div key={card.key} className={cn("rounded-3xl border p-5", card.className)}>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              {card.label}
            </p>
            <p
              className={cn(
                "mt-2 text-2xl font-black tracking-tight sm:text-3xl",
                card.valueClassName,
              )}
            >
              {card.value}
            </p>
            <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40">
              {card.supportingLabel}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-muted/20 bg-background/40 px-5 py-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {secondarySummaryStats.map((stat) => (
            <div key={stat.key} className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {stat.label}
              </p>
              <p className="text-lg font-black tracking-tight text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
        <section className="rounded-3xl border border-muted/20 bg-background/40 p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Suggested next actions
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Highest-leverage tasks from the current filter set.
              </p>
            </div>
            <Badge variant="secondary" className="rounded-2xl">
              {summary?.suggestedNextActions.length ?? 0} visible
            </Badge>
          </div>

          <ul className="mt-4 space-y-3">
            {(summary?.suggestedNextActions ?? []).map((item) => (
              <li
                key={`${block.id}-${item.task.id}`}
                className="rounded-2xl border border-muted/20 bg-muted/10 p-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 space-y-2">
                    <p className="font-bold leading-tight text-foreground">
                      {item.task.text || "Untitled task"}
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="rounded-2xl">
                        {item.sourceNodeTitle}
                      </Badge>
                      <Badge
                        variant="secondary"
                        className="rounded-2xl border-primary/20 bg-primary/10 text-primary"
                      >
                        {item.task.estimateMinutes} min
                      </Badge>
                    </div>

                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40">
                      {formatRelativeTaskMeta(item)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    className="rounded-lg"
                    aria-label={getTaskActionLabel(item)}
                    onClick={() => toggleTaskCompletion(item)}
                  >
                    {item.task.completed ? "Reopen" : "Complete"}
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {(summary?.suggestedNextActions.length ?? 0) === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-10 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                No matching next actions
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Adjust the filters above to widen the view.
              </p>
            </div>
          ) : null}
        </section>

        <div className="space-y-6">
          <section className="rounded-3xl border border-muted/20 bg-background/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Domain load
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Open work grouped by team domain.
                </p>
              </div>
              <Badge variant="secondary" className="rounded-2xl">
                {summary?.domainBreakdown.length ?? 0} domains
              </Badge>
            </div>

            <div className="mt-4 space-y-3">
              {(summary?.domainBreakdown ?? []).map((domain) => (
                <div
                  key={domain.label}
                  className="rounded-2xl border border-muted/20 bg-muted/5 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-bold text-foreground">{domain.label}</p>
                    <Badge variant="secondary" className="rounded-lg">
                      {formatMinutes(domain.estimateMinutes)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {domain.count} open task{domain.count === 1 ? "" : "s"}
                  </p>
                </div>
              ))}

              {(summary?.domainBreakdown.length ?? 0) === 0 ? (
                <div className="rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-8 text-center">
                  <p className="text-sm text-muted-foreground">
                    No domain data for the active filters.
                  </p>
                </div>
              ) : null}
            </div>
          </section>

          <section className="rounded-3xl border border-muted/20 bg-background/40 p-5">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  Deadlines
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Tasks that need immediate or near-term attention.
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-destructive/60">
                  Overdue
                </p>
                <ul className="mt-2 space-y-2">
                  {(summary?.overdue ?? []).map((item) => (
                    <li
                      key={`overdue-${item.task.id}`}
                      className="rounded-2xl border border-destructive/15 bg-destructive/5 px-3 py-2"
                    >
                      <p className="text-sm font-bold text-foreground">
                        {item.task.text || "Untitled task"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.sourceNodeTitle} · {formatRelativeTaskMeta(item)}
                      </p>
                    </li>
                  ))}
                </ul>
                {(summary?.overdue.length ?? 0) === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">Nothing overdue.</p>
                ) : null}
              </div>

              <div className="border-t border-muted/10 pt-5">
                <p className="text-[10px] font-bold uppercase tracking-widest text-primary/60">
                  Upcoming
                </p>
                <ul className="mt-2 space-y-2">
                  {(summary?.upcoming ?? []).map((item) => (
                    <li
                      key={`upcoming-${item.task.id}`}
                      className="rounded-2xl border border-primary/15 bg-primary/5 px-3 py-2"
                    >
                      <p className="text-sm font-bold text-foreground">
                        {item.task.text || "Untitled task"}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.sourceNodeTitle} · {formatRelativeTaskMeta(item)}
                      </p>
                    </li>
                  ))}
                </ul>
                {(summary?.upcoming.length ?? 0) === 0 ? (
                  <p className="mt-2 text-xs text-muted-foreground">
                    No tasks due in the next seven days.
                  </p>
                ) : null}
              </div>
            </div>
          </section>
        </div>
      </div>

      <div
        className={cn(
          "grid gap-4",
          visibleQuadrants.length > 1 ? "xl:grid-cols-2 2xl:grid-cols-4" : "",
        )}
      >
        {visibleQuadrants.map((quadrant) => (
          <section
            key={quadrant.key}
            className="rounded-3xl border border-muted/20 bg-background/40 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-foreground">{quadrant.label}</p>
                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  {formatMinutes(quadrant.estimateMinutes)}
                </p>
              </div>
              <Badge variant="secondary" className="rounded-lg">
                {quadrant.count}
              </Badge>
            </div>

            <ul className="mt-4 space-y-2">
              {quadrant.tasks.slice(0, 4).map((item) => (
                <li
                  key={`${quadrant.key}-${item.task.id}`}
                  className="rounded-2xl border border-muted/20 bg-muted/5 px-3 py-2"
                >
                  <p className="text-xs font-semibold text-muted-foreground">
                    {item.task.text || "Untitled task"}
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground/40">
                    {formatRelativeTaskMeta(item)}
                  </p>
                </li>
              ))}
            </ul>

            {quadrant.tasks.length === 0 ? (
              <p className="mt-4 text-xs text-muted-foreground">No tasks in this quadrant.</p>
            ) : null}
          </section>
        ))}
      </div>

      {currentNode ? (
        <WorkspaceOrchestratorSourcesModal
          open={sourcesModalOpen}
          onOpenChange={setSourcesModalOpen}
          orchestratorNode={currentNode}
          allNodes={allNodes}
          onConnect={connectSource}
          onDisconnect={disconnectSource}
          onMutateTask={handleMutateTask}
          onRemoveTask={removeCollectedTask}
          onAddTask={addTaskToSource}
          onNavigateToSource={navigateToSource}
        />
      ) : null}
    </div>
  );
}
