import { ArrowLeft, AlertTriangle } from "lucide-react";

import { AgencyTaskComposerView } from "@/components/agency/work/task-thread/agency-task-composer-view";
import { AgencyTaskThreadMessageView } from "@/components/agency/work/task-thread/agency-task-message-attachments-view";
import { AgencyMiniTimer } from "@/components/agency/agency-mini-timer";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import type { AgencyTaskThreadViewModel } from "@/lib/agency/work/hooks/use-agency-task-thread";

type AgencyTaskThreadViewProps = {
  view: AgencyTaskThreadViewModel;
};

export function AgencyTaskThreadView({ view }: AgencyTaskThreadViewProps) {
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
          className="relative flex h-full flex-col rounded-2xl border border-default bg-default"
          onDragOver={view.onDragOver}
          onDragLeave={view.onDragLeave}
          onDrop={view.onDrop}
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
              <div className="flex shrink-0 items-center justify-between gap-3 pl-10 sm:justify-end sm:pl-0">
                <AgencyMiniTimer
                  teamId={view.teamId}
                  taskId={view.taskId}
                  projectId={view.projectId}
                  taskTitle={view.taskTitle}
                  projectName={view.projectName}
                />
                <div className="flex items-center gap-2">
                  <input
                    id={view.agentToggleId}
                    type="checkbox"
                    checked={view.agentEnabled}
                    onChange={(e) => view.onAgentEnabledChange(e.target.checked)}
                    className="size-4 rounded border-default"
                    aria-describedby={view.agentToggleHelpId}
                  />
                  <Label htmlFor={view.agentToggleId} className="text-xs font-semibold">
                    Agent
                  </Label>
                </div>
              </div>
            </div>
          </header>

          <div ref={view.threadContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
            {view.messagesEmpty ? (
              <div className="py-8 text-center text-xs text-muted">
                No messages yet. Start the thread below.
              </div>
            ) : (
              view.messages.map((message) => (
                <AgencyTaskThreadMessageView
                  key={message.id}
                  senderType={message.senderType}
                  userName={message.userName}
                  createdAt={message.createdAt}
                  showDateDivider={message.showDateDivider}
                  dateLabel={message.dateLabel}
                  attachments={message.attachments}
                  messageType={message.type}
                  content={message.content}
                />
              ))
            )}
          </div>

          <div className="border-t border-default p-3">
            <AgencyTaskComposerView composer={view.composer} voice={view.voice} />
          </div>
        </section>
      );
    default: {
      const _exhaustive: never = view;
      return _exhaustive;
    }
  }
}
