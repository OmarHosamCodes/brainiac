import { ArrowLeft, AlertTriangle, Bot } from "lucide-react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { AgencyMiniTimer } from "@/components/agency/agency-mini-timer";
import { TaskThreadComposer } from "@/components/agency/work/task-thread/task-thread-composer";
import { TaskThreadMessageList } from "@/components/agency/work/task-thread/task-thread-message-list";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskThreadViewModel } from "@/lib/agency/work/hooks/use-agency-task-thread";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type TaskThreadViewProps = {
  view: AgencyTaskThreadViewModel;
};

export function TaskThreadView({ view }: TaskThreadViewProps) {
  switch (view.status) {
    case "loading":
      return (
        <section className="relative flex h-full flex-col rounded-2xl border border-default bg-default">
          <div className="flex-1 p-4">
            {[1, 2, 3, 4, 5, 6].map((rowIndex) => (
              <Skeleton key={rowIndex} className="mb-3 h-16 rounded-xl" />
            ))}
          </div>
        </section>
      );
    case "error":
      return (
        <section className="relative flex h-full flex-col rounded-2xl border border-default bg-default">
          <div className="flex flex-1 flex-col items-center justify-center p-6 text-center">
            <AlertTriangle className="size-5 text-error" />
            <p className="mt-3 text-sm font-bold text-highlighted">Couldn't load thread.</p>
            <p className="mt-1 text-xs text-muted">{view.message}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={view.onRetry}>
              Retry
            </Button>
          </div>
        </section>
      );
    case "ready":
      return (
        <section
          className="relative flex h-full min-h-0 flex-col rounded-2xl border border-default bg-default"
          onDragOver={view.onThreadDragOver}
          onDragLeave={view.onThreadDragLeave}
          onDrop={view.onThreadDrop}
        >
          {view.isDraggingFile ? (
            <div
              role="status"
              aria-live="polite"
              className="pointer-events-none absolute inset-2 z-10 flex items-center justify-center rounded-xl border-2 border-dashed border-primary/40 bg-primary/5 text-sm font-bold text-highlighted"
            >
              Drop files to attach them to this task.
            </div>
          ) : null}

          <header className="border-b border-default px-4 py-3">
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <div className="flex min-w-0 flex-1 items-center gap-2">
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
              <div className="flex shrink-0 items-center justify-end gap-1.5 pl-10 sm:pl-0">
                <AgencyMemberChooser
                  mode="multiple"
                  triggerVariant="stack"
                  contentAlign="end"
                  assignedToTeam={view.assignedToTeam}
                  selectedUserIds={view.assignees.map((assignee) => assignee.userId)}
                  onAssignedToTeamChange={(assignedToTeam) =>
                    view.onAssigneesChange(
                      assignedToTeam,
                      assignedToTeam ? [] : view.assignees.map((assignee) => assignee.userId),
                    )
                  }
                  onSelectedUserIdsChange={(userIds) => view.onAssigneesChange(false, userIds)}
                  members={view.members}
                  loading={view.membersLoading}
                  disabled={view.isAssigneesPending}
                />
                <AgencyMiniTimer
                  variant="compact"
                  teamId={view.teamId}
                  taskId={view.taskId}
                  projectId={view.projectId}
                  taskTitle={view.taskTitle}
                  projectName={view.projectName}
                />
                <button
                  id={view.agentToggleId}
                  type="button"
                  aria-label={view.agentEnabled ? "Disable agent" : "Enable agent"}
                  aria-pressed={view.agentEnabled}
                  className={cn(
                    "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
                    "transition-colors",
                    agencyFocusRingClass,
                    "motion-reduce:transition-none",
                    view.agentEnabled
                      ? "bg-primary/10 text-primary hover:bg-primary/15"
                      : "text-muted hover:bg-elevated hover:text-highlighted",
                  )}
                  onClick={() => view.onAgentEnabledChange(!view.agentEnabled)}
                >
                  <Bot className="size-3.5" aria-hidden />
                </button>
              </div>
            </div>
          </header>

          <TaskThreadMessageList
            messages={view.messages}
            messagesEmpty={view.messagesEmpty}
            agentEnabled={view.agentEnabled}
            containerRef={view.threadContainerRef}
            hasOlderMessages={view.hasOlderMessages}
            isFetchingOlder={view.isFetchingOlder}
            showJumpToLatest={view.showJumpToLatest}
            onJumpToLatest={view.onJumpToLatest}
            lastError={view.lastError}
            onClearError={view.onClearError}
          />

          <div className="border-t border-default p-3">
            <TaskThreadComposer composer={view.composer} voice={view.voice} />
          </div>
        </section>
      );
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}

// Back-compat export while callers migrate.
export { TaskThreadView as AgencyTaskThreadView };
