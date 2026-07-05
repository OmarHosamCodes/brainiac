import { ArrowLeft, AlertTriangle, Clock3 } from "lucide-react";

import { AgencyMiniTimer } from "@/components/agency/agency-mini-timer";
import { TaskThreadComposer } from "@/components/agency/work/task-thread/task-thread-composer";
import { TaskThreadMessageList } from "@/components/agency/work/task-thread/task-thread-message-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskProgressThreadViewModel } from "@/lib/agency/work/hooks/use-agency-task-progress-thread";
import type { AgencyProjectJourneyStep } from "@/lib/schemas/agency-work";
import {
  agencyFocusRingClass,
  agencyMetricClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

type TaskThreadProgressViewProps = {
  view: AgencyTaskProgressThreadViewModel;
  onEditJourney?: () => void;
};

function stepStripClass(step: AgencyProjectJourneyStep, focusedStepId: string | null): string {
  if (step.id === focusedStepId) {
    return "border-info bg-info/10 text-info";
  }
  switch (step.status) {
    case "done":
      return "border-success/40 bg-success/10 text-success";
    case "active":
      return "border-info/40 bg-info/5 text-info";
    case "blocked":
      return "border-error/40 bg-error/5 text-error";
    case "planned":
      return "border-default bg-elevated text-muted";
    default: {
      const _exhaustive: never = step.status;
      return _exhaustive;
    }
  }
}

function JourneyStepStrip({
  steps,
  focusedStepId,
}: {
  steps: AgencyProjectJourneyStep[];
  focusedStepId: string | null;
}) {
  return (
    <div
      className="flex gap-1 overflow-x-auto pb-1"
      role="list"
      aria-label="Journey steps"
    >
      {steps.map((step) => (
        <div
          key={step.id}
          role="listitem"
          className={cn(
            "min-w-[4.5rem] shrink-0 rounded-md border px-2 py-1.5 text-center",
            "motion-reduce:transition-none",
            stepStripClass(step, focusedStepId),
          )}
          aria-current={step.id === focusedStepId ? "step" : undefined}
        >
          <p className="truncate text-[10px] font-semibold">{step.label}</p>
        </div>
      ))}
    </div>
  );
}

function StepTimeEntryList({
  entries,
  empty,
}: {
  entries: Extract<AgencyTaskProgressThreadViewModel, { status: "ready" }>["stepEntries"];
  empty: boolean;
}) {
  if (empty) {
    return (
      <div className="rounded-xl border border-dashed border-default px-4 py-6 text-center">
        <p className="text-sm text-muted">No time logged on this step yet.</p>
      </div>
    );
  }

  return (
    <ul className="space-y-2" aria-label="Recent time entries">
      {entries.map((entry) => (
        <li
          key={entry.id}
          className="flex items-center justify-between gap-3 rounded-lg border border-default bg-elevated px-3 py-2"
        >
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold text-highlighted">
              {entry.description.trim() || "Untitled entry"}
            </p>
            <p className="truncate text-[11px] text-muted">{entry.userName}</p>
          </div>
          <span className={cn(agencyMetricClass, "shrink-0 text-xs text-muted")}>
            {formatDuration(entry.durationSeconds, "short")}
          </span>
        </li>
      ))}
    </ul>
  );
}

export function TaskThreadProgressView({ view, onEditJourney }: TaskThreadProgressViewProps) {
  switch (view.status) {
    case "loading":
      return (
        <section className="relative flex h-full flex-col rounded-2xl border border-default bg-default">
          <div className="space-y-3 border-b border-default p-4">
            <Skeleton className="h-8 w-2/3 rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
          <div className="flex-1 space-y-2 p-4">
            {[1, 2, 3].map((rowIndex) => (
              <Skeleton key={rowIndex} className="h-12 rounded-lg" />
            ))}
          </div>
        </section>
      );
    case "error":
      return (
        <section className="relative flex h-full flex-col rounded-2xl border border-default bg-default">
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="size-5 text-error" />
            <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load journey.</p>
            <p className="mt-1 text-xs text-muted">{view.message}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={view.onRetry}>
              Retry
            </Button>
          </div>
        </section>
      );
    case "ready":
      return (
        <section className="relative flex h-full min-h-0 flex-col rounded-2xl border border-default bg-default">
          <header className="border-b border-default px-4 py-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-start">
              <div className="flex min-w-0 flex-1 items-start gap-2">
                <Button variant="ghost" size="sm" onClick={view.onBack} aria-label="Back to tasks">
                  <ArrowLeft />
                </Button>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-highlighted">{view.taskTitle}</p>
                  <p className="truncate text-xs text-muted">
                    {view.clientName} · {view.projectName}
                  </p>
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1.5 pl-10 sm:pl-0">
                <AgencyMiniTimer
                  variant="compact"
                  teamId={view.teamId}
                  taskId={view.focusedStep?.taskId ?? view.taskId}
                  projectId={view.projectId}
                  taskTitle={view.focusedStep?.label ?? view.taskTitle}
                  projectName={view.projectName}
                />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="shrink-0"
                  onClick={onEditJourney}
                >
                  Edit journey
                </Button>
              </div>
            </div>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <div className="space-y-4 border-b border-default p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Step progress
                </p>
                <span className={cn(agencyMetricClass, "text-xs text-muted")}>
                  {view.completedSteps}/{view.totalSteps}
                </span>
              </div>
              <JourneyStepStrip
                steps={view.steps}
                focusedStepId={view.focusedStep?.id ?? null}
              />
              <div className="flex items-center gap-2 text-xs text-muted">
                <Clock3 className="size-3.5 shrink-0" aria-hidden />
                <span>
                  {view.focusedStep ? (
                    <>
                      <span className="font-semibold text-highlighted">{view.focusedStep.label}</span>
                      {" · "}
                      <span className={agencyMetricClass}>
                        {formatDuration(view.focusedStepHoursSeconds, "short")}
                      </span>{" "}
                      logged
                    </>
                  ) : (
                    "No active step"
                  )}
                </span>
              </div>
            </div>

            {view.panel === "progress" ? (
              <div className="space-y-3 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Recent time on this step
                </p>
                <StepTimeEntryList entries={view.stepEntries} empty={view.stepEntriesEmpty} />
              </div>
            ) : (
              <TaskThreadMessageList
                messages={view.messages}
                messagesEmpty={view.messagesEmpty}
                agentEnabled={false}
                containerRef={view.threadContainerRef}
                hasOlderMessages={view.hasOlderMessages}
                isFetchingOlder={view.isFetchingOlder}
                showJumpToLatest={view.showJumpToLatest}
                onJumpToLatest={view.onJumpToLatest}
                lastError={view.lastError}
                onClearError={view.onClearError}
              />
            )}
          </div>

          <div className="border-t border-default">
            <div className="flex border-b border-default px-3 pt-2" role="tablist">
              {(["progress", "messages"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={cn(
                    "rounded-t-md px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                    view.panel === tab
                      ? "bg-elevated text-highlighted"
                      : "text-muted hover:text-highlighted",
                  )}
                  aria-selected={view.panel === tab}
                  role="tab"
                  onClick={() => view.onPanelChange(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {view.panel === "messages" ? (
              <div className="p-3">
                <TaskThreadComposer composer={view.composer} voice={view.voice} />
              </div>
            ) : (
              <div className="p-3">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full justify-center text-xs"
                  onClick={() => view.onPanelChange("messages")}
                >
                  Open messages
                </Button>
              </div>
            )}
          </div>
        </section>
      );
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
