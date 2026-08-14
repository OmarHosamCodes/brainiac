import { PlusIcon } from "lucide-react";

import { ThreadList } from "@/components/elements/thread-list";
import { ThreadSearch } from "@/components/elements/thread-search";
import type { WorkspaceAgentConversationOption } from "@/features/workspace-agent/chat-panel-view";
import { cn } from "@/lib/utils";
import { Button } from "@/ui/button";

function formatConversationStamp(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function WorkspaceAgentThreadHistory({
  conversationOptions,
  conversationsLoading,
  historyQuery,
  onHistoryQueryChange,
  activeConversationId,
  deletingConversationId,
  onSelectConversation,
  onStartNewConversation,
  onDeleteConversation,
  onRenameConversation,
  className,
}: {
  conversationOptions: WorkspaceAgentConversationOption[];
  conversationsLoading: boolean;
  historyQuery: string;
  onHistoryQueryChange: (value: string) => void;
  activeConversationId: string | null;
  deletingConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string) => void;
  className?: string;
}) {
  const activeIndex = conversationOptions.findIndex(
    (conversation) => conversation.id === activeConversationId,
  );
  const isHistorySearchActive = historyQuery.trim().length > 0;

  return (
    <aside
      id="workspace-agent-thread-history"
      className={cn(
        "flex h-full min-h-0 w-[13.5rem] shrink-0 flex-col border-e border-border bg-muted/10",
        className,
      )}
    >
      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 min-w-0 flex-1 justify-start gap-1.5 rounded-lg px-2 text-xs"
          onClick={onStartNewConversation}
        >
          <PlusIcon className="size-3.5" aria-hidden />
          New chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        <ThreadSearch
          className={cn(
            "max-w-none px-2 pt-2",
            !isHistorySearchActive && "[&>span]:hidden [&_button]:hidden",
          )}
          query={historyQuery}
          activeId={activeConversationId ?? ""}
          threads={
            isHistorySearchActive
              ? conversationOptions.map((conversation) => ({
                  id: conversation.id,
                  title: conversation.label,
                  group: "",
                  preview: conversation.preview,
                }))
              : []
          }
          onQueryChange={onHistoryQueryChange}
          onSelect={onSelectConversation}
        />
        {conversationsLoading ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
        ) : conversationOptions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No saved chats yet</p>
        ) : isHistorySearchActive ? null : (
          <ThreadList
            className="max-w-none"
            threads={conversationOptions.map((conversation) => ({
              title: conversation.label,
              time: formatConversationStamp(conversation.stamp),
            }))}
            activeIndex={activeIndex}
            onActiveIndexChange={(index) => {
              const conversation = conversationOptions[index];
              if (conversation) onSelectConversation(conversation.id);
            }}
            onDelete={(index) => {
              const conversation = conversationOptions[index];
              if (conversation && deletingConversationId !== conversation.id) {
                onDeleteConversation(conversation.id);
              }
            }}
            onRename={(index) => {
              const conversation = conversationOptions[index];
              if (conversation) onRenameConversation(conversation.id);
            }}
          />
        )}
      </div>
    </aside>
  );
}
