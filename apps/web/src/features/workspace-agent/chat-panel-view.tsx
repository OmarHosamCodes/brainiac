import type { AiUiArtifact } from "@orch/agent/types";
import { History, MoreHorizontal, Plus, Trash2 } from "lucide-react";

import { Thread } from "@/components/assistant-ui/thread";
import { AgentArtifactPaneView } from "@/features/workspace-agent/agent-artifact-pane-view";
import { AgentStickyDockView } from "@/features/workspace-agent/agent-sticky-dock-view";
import {
  type OrchAgencyQuestionAnswer,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import type { WorkspaceAgentQuickStart } from "@/features/workspace-agent/workspace-agent-quick-starts";
import {
  WorkspaceAgentThreadAssistantMessage,
  WorkspaceAgentThreadMessageProvider,
  WorkspaceAgentThreadWelcome,
} from "@/features/workspace-agent/workspace-agent-thread-slots";
import { resolveStickyDockItem, stickyDockItemKey } from "@/features/workspace-agent/sticky-dock";
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
  answeredQuestionIds: ReadonlySet<string>;
  resolvedPlanIds: ReadonlySet<string>;
  resolvedProposalIds: ReadonlySet<string>;
  dismissedStickyKeys: ReadonlySet<string>;
  onDismissStickyDock: (key: string) => void;
  questionSubmittingId: string | null;
  questionDrafts: Record<string, { selectedOptionIds: string[]; freeText: string }>;
  onConfirmPlan: (plan: OrchUIDataParts["orchPlan"]) => void;
  onApproveProposal: (proposalId: string) => void;
  onRejectProposal: (proposalId: string) => void;
  onAnswerQuestion: (answer: OrchAgencyQuestionAnswer) => void;
  onQuestionSelectedOptionIdsChange: (questionId: string, ids: string[]) => void;
  onQuestionFreeTextChange: (questionId: string, value: string) => void;
  /** Empty-thread starter prompts (Agency vs Canvas). */
  quickStarts: WorkspaceAgentQuickStart[];
  onSelectQuickStart: (start: WorkspaceAgentQuickStart) => void;
  emptyHint: string;
  onOpenBoard?: (href: string) => void;
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
  answeredQuestionIds,
  resolvedPlanIds,
  resolvedProposalIds,
  dismissedStickyKeys,
  onDismissStickyDock,
  questionSubmittingId,
  questionDrafts,
  onConfirmPlan,
  onApproveProposal,
  onRejectProposal,
  onOpenBoard,
  onAnswerQuestion,
  onQuestionSelectedOptionIdsChange,
  onQuestionFreeTextChange,
  quickStarts,
  onSelectQuickStart,
  emptyHint,
}: WorkspaceAgentChatPanelViewProps) {
  const showCanvas = activeArtifact !== null;
  const stickyItem = resolveStickyDockItem({
    messages,
    answeredQuestionIds,
    resolvedPlanIds,
    resolvedProposalIds,
    activeArtifactId: activeArtifact?.id ?? null,
    dismissedStickyKeys,
  });

  const stickyQuestionDraft =
    stickyItem?.kind === "question"
      ? (questionDrafts[stickyItem.question.questionId] ?? {
          selectedOptionIds: [] as string[],
          freeText: "",
        })
      : null;
  const stickyQuestionCanSubmit = (() => {
    if (stickyItem?.kind !== "question" || !stickyQuestionDraft) return false;
    const q = stickyItem.question;
    const freeText = stickyQuestionDraft.freeText;
    const selectedOptionIds = stickyQuestionDraft.selectedOptionIds;
    const answered = answeredQuestionIds.has(q.questionId);
    const submitting = questionSubmittingId === q.questionId;
    if (answered || submitting) return false;
    if (q.kind === "text") return freeText.trim().length > 0;
    if (q.kind === "single") {
      return selectedOptionIds.length === 1 || (q.allowFreeText && freeText.trim().length > 0);
    }
    return selectedOptionIds.length > 0 || (q.allowFreeText && freeText.trim().length > 0);
  })();

  return (
    <div
      className={cn(
        "flex max-h-[min(60vh,520px)] min-h-0 flex-col",
        stickyItem ? "border-b-0" : "border-b border-border",
      )}
    >
      <div className="flex min-h-12 items-center gap-2 border-b border-border bg-muted/20 px-3">
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

        <p className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-tight text-foreground">
          {title}
        </p>

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
        <div
          className={cn(
            "flex min-h-0 flex-col overflow-hidden",
            showCanvas ? "w-2/5 shrink-0" : "flex-1",
          )}
        >
          <WorkspaceAgentThreadMessageProvider
            value={{
              messages,
              isStreaming,
              streamingMessageId,
              streamStopped,
              proposalBusyId,
              planConfirmingId,
              answeredQuestionIds,
              resolvedPlanIds,
              resolvedProposalIds,
              stickyItem,
              questionSubmittingId,
              questionDrafts,
              onConfirmPlan,
              onApproveProposal,
              onRejectProposal,
              onAnswerQuestion,
              onQuestionSelectedOptionIdsChange,
              onQuestionFreeTextChange,
              onOpenArtifactCanvas,
              onOpenBoard,
              emptyHint,
              quickStarts,
              onSelectQuickStart,
            }}
          >
            <div className="min-h-0 flex-1 overflow-hidden">
              <Thread
                composer={null}
                components={{
                  Welcome: WorkspaceAgentThreadWelcome,
                  AssistantMessage: WorkspaceAgentThreadAssistantMessage,
                }}
              />
            </div>
          </WorkspaceAgentThreadMessageProvider>

          <AgentStickyDockView
            item={stickyItem}
            questionDraft={stickyQuestionDraft}
            questionAnswered={
              stickyItem?.kind === "question"
                ? answeredQuestionIds.has(stickyItem.question.questionId)
                : false
            }
            questionSubmitting={
              stickyItem?.kind === "question"
                ? questionSubmittingId === stickyItem.question.questionId
                : false
            }
            questionCanSubmit={stickyQuestionCanSubmit}
            planConfirming={
              stickyItem?.kind === "plan" ? planConfirmingId === stickyItem.plan.planId : false
            }
            proposalBusy={
              stickyItem?.kind === "proposal"
                ? proposalBusyId === stickyItem.proposal.proposalId
                : false
            }
            onQuestionSelectedOptionIdsChange={(ids) => {
              if (stickyItem?.kind !== "question") return;
              onQuestionSelectedOptionIdsChange(stickyItem.question.questionId, ids);
            }}
            onQuestionFreeTextChange={(value) => {
              if (stickyItem?.kind !== "question") return;
              onQuestionFreeTextChange(stickyItem.question.questionId, value);
            }}
            onAnswerQuestion={onAnswerQuestion}
            onConfirmPlan={onConfirmPlan}
            onApproveProposal={onApproveProposal}
            onRejectProposal={onRejectProposal}
            onOpenArtifact={onOpenArtifactCanvas}
            onDismiss={() => {
              if (!stickyItem) return;
              onDismissStickyDock(stickyDockItemKey(stickyItem));
            }}
          />
        </div>

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
