import { History, MoreHorizontal, Paperclip, Plus, Trash2 } from "lucide-react";

import {
  Tool,
  ToolContent,
  ToolHeader,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  getMessageAttachments,
  getMessageText,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import { Bubble, BubbleContent } from "@/ui/bubble";
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
import { Marker, MarkerContent } from "@/ui/marker";
import { Message, MessageContent } from "@/ui/message";
import {
  MessageScroller,
  MessageScrollerButton,
  MessageScrollerContent,
  MessageScrollerItem,
  MessageScrollerProvider,
  MessageScrollerViewport,
} from "@/ui/message-scroller";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";

type WorkspaceAgentChatPanelViewProps = {
  title: string;
  messages: OrchUIMessage[];
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
  isStreaming: boolean;
  streamingMessageId: string | null;
  streamStopped: boolean;
};

function WorkspaceAgentMessagePartsView({
  message,
  isStreamingMessage,
}: {
  message: OrchUIMessage;
  isStreamingMessage: boolean;
}) {
  const text = getMessageText(message);
  const attachments = getMessageAttachments(message);
  const toolParts = message.parts.filter((part) => part.type === "dynamic-tool");

  return (
    <>
      {attachments.length > 0 ? (
        <div
          className={
            message.role === "user"
              ? "flex max-w-[min(100%,36rem)] flex-wrap justify-end gap-1.5"
              : "flex max-w-[min(100%,36rem)] flex-wrap gap-1.5"
          }
        >
          {attachments.map((attachment) =>
            attachment.previewUrl ? (
              <span
                key={`${attachment.filename}-${attachment.mediaType}`}
                className="inline-flex overflow-hidden rounded-md border border-border"
                title={attachment.filename}
              >
                <img
                  src={attachment.previewUrl}
                  alt={attachment.filename}
                  className="size-14 object-cover"
                />
              </span>
            ) : (
              <span
                key={`${attachment.filename}-${attachment.mediaType}`}
                className="inline-flex h-7 max-w-full items-center gap-1.5 rounded-md border border-border bg-secondary px-2 text-xs font-medium text-secondary-foreground"
                title={attachment.mediaType}
              >
                <Paperclip className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate">{attachment.filename}</span>
              </span>
            ),
          )}
        </div>
      ) : null}

      {text ? (
        <Bubble
          variant={message.role === "user" ? "secondary" : "muted"}
          align={message.role === "user" ? "end" : "start"}
          className="max-w-[min(100%,36rem)]"
        >
          <BubbleContent className="whitespace-pre-wrap text-pretty">
            {text}
            {isStreamingMessage ? (
              <span
                aria-hidden
                className="ml-0.5 inline-block text-foreground motion-safe:animate-pulse motion-reduce:animate-none"
              >
                ▍
              </span>
            ) : null}
          </BubbleContent>
        </Bubble>
      ) : isStreamingMessage ? (
        <Marker>
          <MarkerContent className="text-muted-foreground">
            <span
              aria-hidden
              className="inline-block text-foreground motion-safe:animate-pulse motion-reduce:animate-none"
            >
              ▍
            </span>
          </MarkerContent>
        </Marker>
      ) : null}

      {toolParts.map((part) => {
        const open = part.state === "input-available" || part.state === "input-streaming";
        return (
          <Tool key={part.toolCallId} defaultOpen={open}>
            <ToolHeader title={part.toolName} type={`tool-${part.toolName}`} state={part.state} />
            <ToolContent>
              {"input" in part && part.input != null ? <ToolInput input={part.input} /> : null}
              {part.state === "output-available" ? (
                <ToolOutput output={part.output} errorText={undefined} />
              ) : null}
              {part.state === "output-error" ? (
                <ToolOutput output={undefined} errorText={part.errorText} />
              ) : null}
            </ToolContent>
          </Tool>
        );
      })}
    </>
  );
}

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
  isStreaming,
  streamingMessageId,
  streamStopped,
}: WorkspaceAgentChatPanelViewProps) {
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }

  return (
    <div className="flex max-h-[min(60vh,520px)] min-h-0 flex-col border-b border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title}</p>
        <Popover open={threadMenuOpen} onOpenChange={onThreadMenuOpenChange}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Conversation history">
              <History />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" data-workspace-agent-overlay className="w-72 gap-1 p-2">
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
                <p className="px-2 py-4 text-center text-sm text-muted-foreground">
                  No conversations yet
                </p>
              ) : (
                conversationOptions.map((conversation) => (
                  <button
                    key={conversation.id}
                    type="button"
                    className="flex w-full flex-col gap-0.5 rounded-lg px-2 py-2 text-left hover:bg-accent hover:text-accent-foreground"
                    onClick={() => {
                      onSelectConversation(conversation.id);
                      onThreadMenuOpenChange(false);
                    }}
                  >
                    <span className="truncate text-sm font-medium text-foreground">
                      {conversation.label}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {conversation.preview}
                    </span>
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
            <PopoverContent align="end" data-workspace-agent-overlay className="w-44 gap-0 p-1">
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

      <MessageScrollerProvider>
        <MessageScroller className="min-h-0 flex-1">
          <MessageScrollerViewport className="px-3 py-3">
            <MessageScrollerContent className="gap-3">
              {messages.length === 0 ? (
                <p className="py-8 text-center text-sm text-foreground/70">
                  Send a message to start.
                </p>
              ) : (
                messages.map((message, index) => {
                  const isStreamingMessage =
                    isStreaming &&
                    message.role === "assistant" &&
                    message.id === streamingMessageId;
                  const isLastAssistant =
                    message.role === "assistant" && index === lastAssistantIndex;
                  const isLast = index === messages.length - 1;

                  return (
                    <MessageScrollerItem key={message.id} scrollAnchor={isLast}>
                      <Message align={message.role === "user" ? "end" : "start"}>
                        <MessageContent>
                          <WorkspaceAgentMessagePartsView
                            message={message}
                            isStreamingMessage={isStreamingMessage}
                          />
                          {streamStopped && !isStreaming && isLastAssistant ? (
                            <Marker>
                              <MarkerContent className="text-muted-foreground">
                                Stopped
                              </MarkerContent>
                            </Marker>
                          ) : null}
                        </MessageContent>
                      </Message>
                    </MessageScrollerItem>
                  );
                })
              )}
            </MessageScrollerContent>
          </MessageScrollerViewport>
          <MessageScrollerButton direction="end" />
        </MessageScroller>
      </MessageScrollerProvider>

      <Dialog open={isRenameDialogOpen} onOpenChange={(open) => !open && onCloseRename()}>
        <DialogContent data-workspace-agent-overlay>
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
        <DialogContent data-workspace-agent-overlay>
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
