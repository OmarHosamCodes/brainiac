import type { AiUiArtifact } from "@orch/agent/types";
import type { ReactNode } from "react";

import { Thread } from "@/components/assistant-ui/thread";
import {
  CanvasSplit,
  CanvasSplitDocument,
  CanvasSplitThread,
} from "@/components/elements/canvas-split";
import { AgentArtifactPaneView } from "@/features/workspace-agent/agent-artifact-pane-view";
import { AgentStickyDockView } from "@/features/workspace-agent/agent-sticky-dock-view";
import {
  type OrchAgencyQuestionAnswer,
  type OrchUIDataParts,
  type OrchUIMessage,
} from "@/features/workspace-agent/orch-ui-message";
import type { WorkspaceAgentQuickStart } from "@/features/workspace-agent/workspace-agent-quick-starts";
import { WorkspaceAgentThreadDataUI } from "@/features/workspace-agent/workspace-agent-thread-data-ui";
import { WorkspaceAgentThreadHistory } from "@/features/workspace-agent/workspace-agent-thread-history";
import {
  WorkspaceAgentStoppedRunSlot,
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
import { Input } from "@/ui/input";

export type WorkspaceAgentConversationOption = {
  id: string;
  label: string;
  stamp: string;
  /** Cumulative model spend for the thread (USD). */
  costUsd: number;
};

type WorkspaceAgentChatPanelViewProps = {
  messages: OrchUIMessage[];
  conversationOptions: WorkspaceAgentConversationOption[];
  conversationsLoading: boolean;
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onStartNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string) => void;
  deletingConversationId: string | null;
  isRenameDialogOpen: boolean;
  isDeleteDialogOpen: boolean;
  renameDraft: string;
  onRenameDraftChange: (value: string) => void;
  onCloseRename: () => void;
  onSubmitRename: () => void;
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
  onContinueStoppedTurn: () => void;
  onDismissStoppedTurn: () => void;
  composer: ReactNode;
};

export function WorkspaceAgentChatPanelView({
  messages,
  conversationOptions,
  conversationsLoading,
  activeConversationId,
  onSelectConversation,
  onStartNewConversation,
  onDeleteConversation,
  onRenameConversation,
  deletingConversationId,
  isRenameDialogOpen,
  isDeleteDialogOpen,
  renameDraft,
  onRenameDraftChange,
  onCloseRename,
  onSubmitRename,
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
  onContinueStoppedTurn,
  onDismissStoppedTurn,
  composer,
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

  const threadComposer = (
    <>
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
      <WorkspaceAgentStoppedRunSlot />
      {composer}
    </>
  );

  return (
    <div className="flex h-[min(70vh,640px)] min-h-0">
      <WorkspaceAgentThreadHistory
        conversationOptions={conversationOptions}
        conversationsLoading={conversationsLoading}
        activeConversationId={activeConversationId}
        deletingConversationId={deletingConversationId}
        onSelectConversation={onSelectConversation}
        onStartNewConversation={onStartNewConversation}
        onDeleteConversation={onDeleteConversation}
        onRenameConversation={onRenameConversation}
      />

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
          onContinueStoppedTurn,
          onDismissStoppedTurn,
          emptyHint,
          quickStarts,
          onSelectQuickStart,
        }}
      >
        {showCanvas && activeArtifact ? (
          <CanvasSplit className="h-full max-h-full min-h-0 max-w-none min-w-0 flex-1 rounded-none border-0 bg-transparent shadow-none md:h-full">
            <CanvasSplitThread className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-0 p-0 md:w-2/5 md:overflow-hidden">
              <WorkspaceAgentThreadDataUI />
              <Thread
                composer={threadComposer}
                components={{
                  Welcome: WorkspaceAgentThreadWelcome,
                }}
              />
            </CanvasSplitThread>
            <CanvasSplitDocument className="min-h-0 min-w-0 flex-1 border-s border-border">
              <AgentArtifactPaneView
                artifact={activeArtifact}
                onExpand={onExpandArtifact}
                onDismiss={onDismissArtifact}
                className="h-full"
              />
            </CanvasSplitDocument>
          </CanvasSplit>
        ) : (
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <WorkspaceAgentThreadDataUI />
            <Thread
              composer={threadComposer}
              components={{
                Welcome: WorkspaceAgentThreadWelcome,
              }}
            />
          </div>
        )}
      </WorkspaceAgentThreadMessageProvider>

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
