import { PlusIcon } from "lucide-react";

import { ThreadList } from "@/components/elements/thread-list";
import type { WorkspaceAgentConversationOption } from "@/features/workspace-agent/chat-panel-view";
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
  activeConversationId,
  deletingConversationId,
  onSelectConversation,
  onStartNewConversation,
  onDeleteConversation,
  onRenameConversation,
}: {
  conversationOptions: WorkspaceAgentConversationOption[];
  conversationsLoading: boolean;
  activeConversationId: string | null;
  deletingConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string) => void;
}) {
  const activeIndex = conversationOptions.findIndex(
    (conversation) => conversation.id === activeConversationId,
  );

  return (
    <aside className="flex h-full min-h-0 w-[13.5rem] shrink-0 flex-col border-e border-border bg-muted/10">
      <div className="flex items-center gap-1 border-b border-border px-2 py-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 w-full justify-start gap-1.5 rounded-lg px-2 text-xs"
          onClick={onStartNewConversation}
        >
          <PlusIcon className="size-3.5" aria-hidden />
          New chat
        </Button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto py-2">
        {conversationsLoading ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">Loading…</p>
        ) : conversationOptions.length === 0 ? (
          <p className="px-3 py-2 text-xs text-muted-foreground">No saved chats yet</p>
        ) : (
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
