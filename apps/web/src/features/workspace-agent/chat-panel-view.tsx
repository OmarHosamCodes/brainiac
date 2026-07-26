import type { DashboardConversationMessage } from "@orch/agent";
import { History, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { WorkspaceAgentToolTraceListView } from "@/features/workspace-agent/tool-trace-view";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { cn } from "@/lib/utils";

type WorkspaceAgentChatPanelViewProps = {
  title: string;
  messages: DashboardConversationMessage[];
  conversationOptions: Array<{ id: string; label: string; preview: string }>;
  threadMenuOpen: boolean;
  onThreadMenuOpenChange: (open: boolean) => void;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  canManageConversation: boolean;
  isRenameDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onOpenRename: () => void;
  onCloseRename: () => void;
  onSubmitRename: () => void;
  onOpenDelete: () => void;
  onCloseDelete: () => void;
  onConfirmDelete: () => void;
  isRenaming: boolean;
  isDeleting: boolean;
};

export function WorkspaceAgentChatPanelView({
  title,
  messages,
  conversationOptions,
  threadMenuOpen,
  onThreadMenuOpenChange,
  onSelectConversation,
  onStartNewConversation,
  canManageConversation,
  isRenameDialogOpen,
  isDeleteDialogOpen,
  renameDraft,
  onRenameDraftChange,
  onOpenRename,
  onCloseRename,
  onSubmitRename,
  onOpenDelete,
  onCloseDelete,
  onConfirmDelete,
  isRenaming,
  isDeleting,
}: WorkspaceAgentChatPanelViewProps) {
  return (
    <div className="flex max-h-[min(60vh,520px)] min-h-0 flex-col border-b border-default">
      <div className="flex items-center gap-2 border-b border-default px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">{title}</p>
        <Popover open={threadMenuOpen} onOpenChange={onThreadMenuOpenChange}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Conversation history">
              <History />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-72 p-2">
            <Button
              type="button"
              variant="ghost"
              className="mb-1 w-full justify-start"
              onClick={() => {
                onStartNewConversation();
                onThreadMenuOpenChange(false);
              }}
            >
              <Plus data-icon="inline-start" />
              New conversation
            </Button>
            <div className="max-h-64 overflow-y-auto">
              {conversationOptions.length === 0 ? (
                <p className="px-2 py-4 text-center text-sm text-muted">No conversations yet</p>
              ) : (
                conversationOptions.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left hover:bg-muted/40"
                    onClick={() => {
                      onSelectConversation(conversation.id);
                      onThreadMenuOpenChange(false);
                    }}
                  >
                    <span className="truncate text-sm font-medium text-highlighted">
                      {conversation.label}
                    </span>
                    <span className="truncate text-xs text-muted">{conversation.preview}</span>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
        {canManageConversation ? (
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Conversation actions"
              >
                <MoreHorizontal />
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-44 p-1">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start"
                onClick={onOpenRename}
              >
                Rename
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-destructive"
                onClick={onOpenDelete}
              >
                <Trash2 data-icon="inline-start" />
                Delete
              </Button>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">Send a message to start.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "rounded-xl border px-3 py-2 text-sm",
                  message.role === "user"
                    ? "ml-8 border-primary/20 bg-primary/5 text-highlighted"
                    : "mr-4 border-default bg-muted/20 text-highlighted",
                )}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
                {message.role === "assistant" ? (
                  <WorkspaceAgentToolTraceListView toolsCalled={message.toolsCalled} />
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isRenameDialogOpen} onOpenChange={(open) => !open && onCloseRename()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Update the title for this thread.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameDraft}
            onChange={(event) => onRenameDraftChange(event.target.value)}
          />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCloseRename}>
              Cancel
            </Button>
            <Button type="button" onClick={onSubmitRename} disabled={isRenaming}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={(open) => !open && onCloseDelete()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete conversation</DialogTitle>
            <DialogDescription>This removes the thread permanently.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onCloseDelete}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={onConfirmDelete}
              disabled={isDeleting}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
