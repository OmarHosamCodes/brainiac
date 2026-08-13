import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";

import { ErrorState } from "@/components/elements/error-state";
import { AgentCanvasOverlayView } from "@/features/workspace-agent/agent-canvas-overlay-view";
import { WorkspaceAgentChatPanelView } from "@/features/workspace-agent/chat-panel-view";
import type { WorkspaceAgentViewModel } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { WorkspaceAgentModelLibraryView } from "@/features/workspace-agent/model-library-view";
import { WorkspaceAgentThreadComposerView } from "@/features/workspace-agent/workspace-agent-thread-composer-view";
import { cn } from "@/lib/utils";

type WorkspaceAgentViewProps = {
  view: WorkspaceAgentViewModel;
};

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

const expandTransition = {
  type: "spring" as const,
  stiffness: 420,
  damping: 36,
  mass: 0.8,
};
const contentExit = { duration: 0.14, ease: EASE_OUT_QUART };

export function WorkspaceAgentView({ view }: WorkspaceAgentViewProps) {
  const isWorking = view.isPending;
  const collapsedLabel = isWorking ? "Working..." : "Message Orch";
  const showArtifactSplit = Boolean(view.activeArtifact);

  return (
    <AssistantRuntimeProvider runtime={view.runtime}>
      <MotionConfig reducedMotion="user">
        <div
          data-workspace-agent-root
          className={cn(
            "pointer-events-none fixed inset-x-0 z-40 flex items-end justify-center px-4",
            view.bottomOffsetClass,
          )}
        >
          <AnimatePresence initial={false}>
            {!view.expanded ? (
              <motion.div
                key="workspace-agent-collapsed"
                className="pointer-events-auto flex w-full max-w-[360px] items-center justify-center py-3"
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <div className="group/pill flex w-full items-center justify-center">
                  <button
                    type="button"
                    aria-label={collapsedLabel}
                    title={isWorking ? "Working..." : "Message Orch (Ctrl+J)"}
                    aria-busy={isWorking || undefined}
                    className={cn(
                      "group relative flex items-center justify-center overflow-hidden rounded-full",
                      "border border-transparent",
                      isWorking
                        ? "workspace-agent-pill-shimmer h-1.5 w-28 bg-foreground/40"
                        : "h-1.5 w-32 bg-foreground/35",
                      "motion-safe:transition-[width,height,padding,background-color,border-color] motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.25,1,0.5,1)]",
                      "group-hover/pill:h-11 group-hover/pill:w-full group-hover/pill:justify-between group-hover/pill:border-border group-hover/pill:bg-card group-hover/pill:px-4 group-hover/pill:shadow-md",
                      "focus-visible:h-11 focus-visible:w-full focus-visible:justify-between focus-visible:border-border focus-visible:bg-card focus-visible:px-4 focus-visible:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
                    )}
                    onClick={() => view.setExpanded(true)}
                  >
                    <span className="hidden w-full items-center justify-between whitespace-nowrap text-sm group-hover/pill:flex group-focus-visible:flex">
                      {isWorking ? (
                        <span className="workspace-agent-pill-shimmer-text text-foreground">
                          {collapsedLabel}
                        </span>
                      ) : (
                        <>
                          <span className="text-foreground">{collapsedLabel}</span>
                          <kbd className="text-xs text-muted-foreground">Ctrl+J</kbd>
                        </>
                      )}
                    </span>
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="workspace-agent-expanded"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 16, transition: contentExit }}
                transition={expandTransition}
                className={cn(
                  "pointer-events-auto flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg",
                  showArtifactSplit ? "max-w-[1200px]" : "max-w-[960px]",
                )}
              >
                <WorkspaceAgentChatPanelView
                  messages={view.messages}
                  conversationOptions={view.conversationOptions}
                  conversationsLoading={view.conversationsLoading}
                  activeConversationId={view.activeConversationId}
                  onSelectConversation={view.switchConversation}
                  onStartNewConversation={view.startNewConversation}
                  onDeleteConversation={(id) => void view.deleteConversationById(id)}
                  onRenameConversation={view.openRenameConversation}
                  deletingConversationId={view.deletingConversationId}
                  isRenameDialogOpen={view.isRenameDialogOpen}
                  isDeleteDialogOpen={view.isDeleteDialogOpen}
                  renameDraft={view.renameDraft}
                  onRenameDraftChange={view.setRenameDraft}
                  onCloseRename={view.closeRenameDialog}
                  onSubmitRename={() => void view.submitRenameConversation()}
                  onCloseDelete={view.closeDeleteDialog}
                  onConfirmDelete={() => void view.confirmDeleteConversation()}
                  isRenaming={view.isRenamingConversation}
                  isDeleting={view.isDeletingConversation}
                  isStreaming={view.isStreaming}
                  streamingMessageId={view.streamingMessageId}
                  streamStopped={view.streamStopped}
                  activeArtifact={view.activeArtifact}
                  onExpandArtifact={view.openCanvas}
                  onDismissArtifact={view.dismissArtifact}
                  onOpenArtifactCanvas={view.openArtifactCanvas}
                  proposalBusyId={view.proposalBusyId}
                  planConfirmingId={view.planConfirmingId}
                  answeredQuestionIds={view.answeredQuestionIds}
                  resolvedPlanIds={view.resolvedPlanIds}
                  resolvedProposalIds={view.resolvedProposalIds}
                  dismissedStickyKeys={view.dismissedStickyKeys}
                  onDismissStickyDock={view.onDismissStickyDock}
                  questionSubmittingId={view.questionSubmittingId}
                  questionDrafts={view.questionDrafts}
                  onConfirmPlan={view.onConfirmPlan}
                  onApproveProposal={view.onApproveProposal}
                  onRejectProposal={view.onRejectProposal}
                  onOpenBoard={view.onOpenBoard}
                  onAnswerQuestion={view.onAnswerQuestion}
                  onQuestionSelectedOptionIdsChange={view.onQuestionSelectedOptionIdsChange}
                  onQuestionFreeTextChange={view.onQuestionFreeTextChange}
                  quickStarts={view.quickStarts}
                  onSelectQuickStart={view.onSelectQuickStart}
                  emptyHint={view.emptyHint}
                  onContinueStoppedTurn={view.onContinueStoppedTurn}
                  onDismissStoppedTurn={view.onDismissStoppedTurn}
                  composer={
                    <WorkspaceAgentThreadComposerView
                      placeholder={view.placeholder}
                      scopeChips={view.scopeChips}
                      onRemoveChip={view.removeScopeChip}
                      selectedToolPreset={view.selectedToolPreset}
                      onSelectToolPreset={view.setSelectedToolPreset}
                      planModeEnabled={view.planModeEnabled}
                      crossSurfaceUnlockLabel={view.crossSurfaceUnlockLabel}
                      onUnlockCrossSurface={view.onUnlockCrossSurface}
                      selectedModelLabel={view.selectedModelLabel}
                      selectedModelButtonLabel={view.selectedModelButtonLabel}
                      resolvedModelLabel={view.resolvedModelLabel}
                      modelTier={view.modelTier}
                      modelAuto={view.modelAuto}
                      modelFree={view.modelFree}
                      onModelTierChange={view.setModelTier}
                      onModelAutoChange={view.setModelAuto}
                      onModelFreeChange={view.setModelFree}
                      modelMenuOpen={view.modelMenuOpen}
                      onModelMenuOpenChange={view.setModelMenuOpen}
                      onOpenModelLibrary={() => view.setModelLibraryOpen(true)}
                      scopeModeActive={view.scopeModeActive}
                      onToggleScopeMode={view.toggleScopeMode}
                      scopeHintSeen={view.scopeHintSeen}
                      toolsMenuOpen={view.toolsMenuOpen}
                      onToolsMenuOpenChange={view.setToolsMenuOpen}
                      tools={view.tools}
                      toolsLoading={view.toolsLoading}
                      isStreaming={view.isStreaming}
                      queuedMessages={view.queuedMessages}
                      runningQueueLabel={view.runningQueueLabel}
                      onCancelQueuedMessage={view.onCancelQueuedMessage}
                      draft={view.draft}
                      onDraftChange={view.setDraft}
                      composerTriggerOpen={view.composerTriggerOpen}
                      composerTriggerSuggestions={view.composerTriggerSuggestions}
                      onPickComposerTrigger={view.onPickComposerTrigger}
                      onDismissComposerTrigger={view.onDismissComposerTrigger}
                      onSend={view.sendMessage}
                      serverDraftOffer={view.serverDraftOffer}
                      onRestoreServerDraft={view.onRestoreServerDraft}
                      onDiscardServerDraft={() => void view.onDiscardServerDraft()}
                    />
                  }
                />

                <AnimatePresence initial={false}>
                  {view.error ? (
                    <motion.div
                      key="workspace-agent-error"
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: contentExit }}
                      transition={{ duration: 0.18, ease: EASE_OUT_QUART }}
                      className="overflow-hidden border-t border-border px-3 py-2"
                    >
                      <ErrorState
                        title="Couldn't complete that turn"
                        detail={view.error}
                        retrying={view.isPending}
                        onRetry={view.retryLastTurn}
                        className="max-w-none"
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>

          <WorkspaceAgentModelLibraryView
            open={view.modelLibraryOpen}
            onOpenChange={view.setModelLibraryOpen}
            modelSearch={view.modelSearch}
            onModelSearchChange={view.setModelSearch}
            filteredModelOptions={view.filteredModelOptions}
            selectedModelId={view.selectedModelId}
            onSelectModel={(modelId) => {
              view.pinModel(modelId);
              view.setModelLibraryOpen(false);
            }}
            onToggleFavorite={view.toggleFavoriteModel}
            isFavoriteModel={view.isFavoriteModel}
            favoritesOnly={view.favoritesOnly}
            onFavoritesOnlyChange={view.setFavoritesOnly}
          />
        </div>

        <AnimatePresence>
          {view.canvasOpen && view.activeArtifact ? (
            <AgentCanvasOverlayView
              key="workspace-agent-canvas"
              artifact={view.activeArtifact}
              onClose={view.closeCanvas}
              closeRef={view.canvasCloseRef}
            />
          ) : null}
        </AnimatePresence>
      </MotionConfig>
    </AssistantRuntimeProvider>
  );
}
