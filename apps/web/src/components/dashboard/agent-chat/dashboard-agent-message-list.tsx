import type { DashboardAgentChatState } from "@/hooks/use-dashboard-agent-chat";

import { DashboardAgentMessage } from "@/components/dashboard/agent-chat/dashboard-agent-message";
import { DashboardAgentEmptyState } from "@/components/dashboard/agent-chat/dashboard-agent-empty-state";
import { agentChatErrorPanelClass } from "@/lib/utils/dashboard-agent-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

type DashboardAgentMessageListProps = {
  chat: DashboardAgentChatState;
  scopeKind: "nodes" | "blocks";
};

export function DashboardAgentMessageList({ chat, scopeKind }: DashboardAgentMessageListProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chat.messages, chat.isPending, chat.isLoadingConversation]);

  if (chat.isLoadingConversation) {
    return (
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {[1, 2, 3].map((row) => (
          <Skeleton key={row} className="h-16 rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4"
      role="log"
      aria-live="polite"
      aria-relevant="additions"
    >
      {chat.messages.length === 0 ? (
        <DashboardAgentEmptyState
          scopeKind={scopeKind}
          promptSuggestions={chat.promptSuggestions}
          onSelectSuggestion={(suggestion) => void chat.sendMessage(suggestion)}
        />
      ) : (
        chat.messages.map((message) => <DashboardAgentMessage key={message.id} message={message} />)
      )}

      {chat.isPending ? (
        <div className="flex items-center gap-2 px-1 text-sm text-muted" role="status">
          <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden="true" />
          <span>Working…</span>
        </div>
      ) : null}

      {chat.error ? (
        <div className={agentChatErrorPanelClass} role="alert">
          <p className="text-sm text-destructive">{chat.error}</p>
        </div>
      ) : null}
    </div>
  );
}
