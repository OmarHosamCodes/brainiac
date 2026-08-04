import type { AiUiArtifact } from "@orch/agent/types";
import { History, MoreHorizontal, Paperclip, Plus, Trash2 } from "lucide-react";

import { AgencyPlanCardView } from "@/features/workspace-agent/agency-plan-card-view";
import { AgencyProposalCardView } from "@/features/workspace-agent/agency-proposal-card-view";
import { AgentArtifactPaneView } from "@/features/workspace-agent/agent-artifact-pane-view";
import { AgentMessageArtifactCardView } from "@/features/workspace-agent/agent-message-artifact-card-view";
import { WorkspaceAgentAssistantTextView } from "@/features/workspace-agent/assistant-text-view";
import {
  getMessageArtifacts,
  getMessageAttachments,
  getMessageText,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import {
  toolPartsToThinkingSteps,
  WorkspaceAgentThinkingActivityView,
} from "@/features/workspace-agent/thinking-activity-view";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/ui/tooltip";
import { cn } from "@/lib/utils";

export type WorkspaceAgentConversationOption = {
  id: string;
  label: string;
  stamp: string;
  /** Cumulative model spend for the thread (USD). */
  costUsd: number;
};

type WorkspaceAgentChatPanelViewProps = {
  title: string;
  messages: OrchUIMessage[];
  conversationOptions: WorkspaceAgentConversationOption[];
  conversationsLoading: boolean;
  activeConversationId: string | null;
  threadMenuOpen: boolean;
  onThreadMenuOpenChange: (open: boolean) => void;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  deletingConversationId: string | null;
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
  activeArtifact: AiUiArtifact | null;
  onExpandArtifact: () => void;
  onDismissArtifact: () => void;
  onOpenArtifactCanvas: (artifact: AiUiArtifact) => void;
  proposalBusyId: string | null;
  planConfirmingId: string | null;
  onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
};

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

function WorkspaceAgentMessagePartsView({
  message,
  isStreamingMessage,
  proposalBusyId,
  planConfirmingId,
  onConfirmPlan,
  onApproveProposal,
  onRejectProposal,
  onOpenArtifactCanvas,
}: {
  message: OrchUIMessage;
  isStreamingMessage: boolean;
  proposalBusyId: string | null;
  planConfirmingId: string | null;
  onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onOpenArtifactCanvas: (artifact: AiUiArtifact) => void;
}) {
  const text = getMessageText(message);
  const attachments = getMessageAttachments(message);
  const messageArtifacts = getMessageArtifacts(message);
  const toolParts = message.parts.filter((part) => part.type === "dynamic-tool");
  const thinkingSteps = toolPartsToThinkingSteps(toolParts);
  const planParts = message.parts.filter(
    (part): part is { type: "data-orchPlan"; id?: string; data: OrchUIDataParts["orchPlan"] } =>
      part.type === "data-orchPlan",
  );
  const proposalParts = message.parts.filter(
    (
      part,
    ): part is {
      type: "data-orchProposal";
      id?: string;
      data: OrchUIDataParts["orchProposal"];
    } => part.type === "data-orchProposal",
  );
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

      {message.role === "assistant" && (thinkingSteps.length > 0 || isStreamingMessage) ? (
        <WorkspaceAgentThinkingActivityView steps={thinkingSteps} live={isStreamingMessage} />
      ) : null}

      {planParts.map((part) => (
        <AgencyPlanCardView
          key={part.id ?? part.data.planId}
          plan={part.data}
          confirming={planConfirmingId === part.data.planId}
          onConfirm={() => onConfirmPlan(part.data)}
        />
      ))}

      {proposalParts.map((part) => (
        <AgencyProposalCardView
          key={part.id ?? part.data.proposalId}
          proposal={part.data}
          busy={proposalBusyId === part.data.proposalId}
          onApprove={() => onApproveProposal(part.data.proposalId)}
          onReject={() => onRejectProposal(part.data.proposalId)}
        />
      ))}

      {messageArtifacts.map((artifact) => (
        <AgentMessageArtifactCardView
          key={artifact.id}
          artifact={artifact}
          onOpen={() => onOpenArtifactCanvas(artifact)}
        />
      ))}

      {text ? (
        message.role === "user" ? (
          <Bubble variant="secondary" align="end" className="max-w-[min(100%,36rem)]">
            <BubbleContent className="whitespace-pre-wrap text-pretty">{text}</BubbleContent>
          </Bubble>
        ) : (
          <Bubble variant="ghost" className="max-w-[min(100%,36rem)]">
            <BubbleContent className="text-[13px] leading-relaxed whitespace-pre-wrap text-foreground/90">
              <WorkspaceAgentAssistantTextView text={text} />
              {isStreamingMessage ? (
                <span
                  aria-hidden
                  className="ms-0.5 inline-block h-3.5 w-1 translate-y-px rounded-sm bg-foreground/55 motion-safe:animate-pulse"
                />
              ) : null}
            </BubbleContent>
          </Bubble>
        )
      ) : isStreamingMessage && message.role === "assistant" && thinkingSteps.length === 0 ? (
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
    </>
  );
}

export function WorkspaceAgentChatPanelView({
  title,
  messages,
  conversationOptions,
  conversationsLoading,
  activeConversationId,
  threadMenuOpen,
  onThreadMenuOpenChange,
  onSelectConversation,
  onStartNewConversation,
  onDeleteConversation,
  deletingConversationId,
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
  activeArtifact,
  onExpandArtifact,
  onDismissArtifact,
  onOpenArtifactCanvas,
  proposalBusyId,
  planConfirmingId,
  onConfirmPlan,
  onApproveProposal,
  onRejectProposal,
}: WorkspaceAgentChatPanelViewProps) {
  let lastAssistantIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "assistant") {
      lastAssistantIndex = i;
      break;
    }
  }

  const showCanvas = activeArtifact !== null;

  return (
    <div className="flex max-h-[min(60vh,520px)] min-h-0 flex-col border-b border-border">
      <div className="flex items-center gap-2 border-b border-border px-3 py-2">
        <TooltipProvider>
          <DropdownMenu open={threadMenuOpen} onOpenChange={onThreadMenuOpenChange}>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label="Chat history">
                    <History />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom">History</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="start" data-workspace-agent-overlay className="w-72">
              <DropdownMenuLabel>Recent chats</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() => {
                  onStartNewConversation();
                }}
              >
                <Plus className="size-3.5" aria-hidden />
                New conversation
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {conversationsLoading ? (
                <DropdownMenuItem disabled>Loading…</DropdownMenuItem>
              ) : conversationOptions.length === 0 ? (
                <DropdownMenuItem disabled>No saved chats yet</DropdownMenuItem>
              ) : (
                conversationOptions.map((conversation) => {
                  const active = conversation.id === activeConversationId;
                  const stamp = formatConversationStamp(conversation.stamp);
                  return (
                    <DropdownMenuItem
                      key={conversation.id}
                      className="items-start gap-2"
                      onSelect={() => {
                        onSelectConversation(conversation.id);
                      }}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-medium">
                          {active ? "· " : ""}
                          {conversation.label}
                        </span>
                        {stamp ? (
                          <span className="block text-xs text-muted-foreground">{stamp}</span>
                        ) : null}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-destructive"
                        aria-label={`Delete ${conversation.label}`}
                        disabled={deletingConversationId === conversation.id}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          onDeleteConversation(conversation.id);
                        }}
                      >
                        <Trash2 className="size-3.5" aria-hidden />
                      </button>
                    </DropdownMenuItem>
                  );
                })
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </TooltipProvider>

        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{title}</p>

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

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <MessageScrollerProvider>
          <div className={cn("min-h-0 overflow-hidden", showCanvas ? "w-2/5 shrink-0" : "flex-1")}>
            <MessageScroller className="min-h-0 h-full">
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
                                proposalBusyId={proposalBusyId}
                                planConfirmingId={planConfirmingId}
                                onConfirmPlan={onConfirmPlan}
                                onApproveProposal={onApproveProposal}
                                onRejectProposal={onRejectProposal}
                                onOpenArtifactCanvas={onOpenArtifactCanvas}
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
          </div>
        </MessageScrollerProvider>

        {showCanvas && activeArtifact ? (
          <AgentArtifactPaneView
            artifact={activeArtifact}
            onExpand={onExpandArtifact}
            onDismiss={onDismissArtifact}
            className="min-w-0 flex-1 border-s border-border"
          />
        ) : null}
      </div>

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
