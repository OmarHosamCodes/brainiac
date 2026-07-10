import { Loader2 } from "lucide-react";

import { TaskThreadEmptyState } from "@/components/agency/work/task-thread/task-thread-empty-state";
import { TaskThreadMessage } from "@/components/agency/work/task-thread/task-thread-message";
import type { TaskThreadMessageViewModel } from "@/lib/agency/work/hooks/use-task-thread-messaging";

type TaskThreadMessageListProps = {
  messages: TaskThreadMessageViewModel[];
  messagesEmpty: boolean;
  agentEnabled: boolean;
  containerRef: React.RefObject<HTMLDivElement | null>;
  hasOlderMessages: boolean;
  isFetchingOlder: boolean;
  showJumpToLatest: boolean;
  onJumpToLatest: () => void;
  lastError: string | null;
  onClearError: () => void;
};

export function TaskThreadMessageList({
  messages,
  messagesEmpty,
  agentEnabled,
  containerRef,
  hasOlderMessages,
  isFetchingOlder,
  showJumpToLatest,
  onJumpToLatest,
  lastError,
  onClearError,
}: TaskThreadMessageListProps) {
  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={containerRef}
        className="flex h-full min-h-0 flex-col gap-4 overflow-y-auto p-4"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
      >
        {hasOlderMessages ? (
          <div className="flex justify-center py-1">
            {isFetchingOlder ? (
              <span className="inline-flex items-center gap-2 text-xs text-muted" role="status">
                <Loader2 className="size-3.5 motion-safe:animate-spin" aria-hidden="true" />
                Loading older messages…
              </span>
            ) : (
              <span className="text-xs text-muted">Scroll up for older messages</span>
            )}
          </div>
        ) : null}

        {messagesEmpty ? (
          <TaskThreadEmptyState agentEnabled={agentEnabled} />
        ) : (
          messages.map((message) => (
            <TaskThreadMessage key={message.animationKey} message={message} />
          ))
        )}

        {lastError ? (
          <div
            className="rounded-xl border border-error/30 bg-error/5 px-3 py-2 text-sm text-error"
            role="alert"
          >
            <p>{lastError}</p>
            <button
              type="button"
              className="mt-1 text-xs font-bold underline"
              onClick={onClearError}
            >
              Dismiss
            </button>
          </div>
        ) : null}
      </div>

      {showJumpToLatest ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <button
            type="button"
            className="pointer-events-auto rounded-full border border-default bg-elevated px-3 py-1.5 text-xs font-bold text-highlighted shadow-sm"
            onClick={onJumpToLatest}
          >
            Jump to latest
          </button>
        </div>
      ) : null}
    </div>
  );
}
