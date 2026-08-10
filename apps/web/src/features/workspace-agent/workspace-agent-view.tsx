import { AnimatePresence, LayoutGroup, MotionConfig, motion } from "motion/react";

import { AgentCanvasOverlayView } from "@/features/workspace-agent/agent-canvas-overlay-view";
import { WorkspaceAgentChatPanelView } from "@/features/workspace-agent/chat-panel-view";
import { WorkspaceAgentComposerView } from "@/features/workspace-agent/composer-view";
import type { WorkspaceAgentViewModel } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { WorkspaceAgentModelLibraryView } from "@/features/workspace-agent/model-library-view";
import { cn } from "@/lib/utils";

type WorkspaceAgentViewProps = {
  view: WorkspaceAgentViewModel;
};

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

const SHELL_LAYOUT_ID = "workspace-agent-shell";

const layoutTransition = { type: "spring" as const, stiffness: 380, damping: 34, mass: 0.9 };
const contentEnter = { type: "spring" as const, stiffness: 420, damping: 36, mass: 0.8 };
const contentExit = { duration: 0.12, ease: EASE_OUT_QUART };

export function WorkspaceAgentView({ view }: WorkspaceAgentViewProps) {
  const selectedModelLabel = view.selectedModelLabel;
  const selectedModelButtonLabel = view.selectedModelButtonLabel;
  const showChat = view.messages.length > 0 || Boolean(view.activeConversationId);
  const isWorking = view.isPending;
  const collapsedLabel = isWorking ? "Working..." : "Message Orch";
  const showArtifactSplit = Boolean(view.activeArtifact);
  const showFloatingQuickStarts =
    view.expanded &&
    !showChat &&
    !view.isPending &&
    view.draft.trim().length === 0 &&
    view.scopeChips.length === 0;

  return (
    <MotionConfig reducedMotion="user" transition={{ layout: layoutTransition }}>
      <LayoutGroup id="workspace-agent">
        <div
          data-workspace-agent-root
          className={cn(
            "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4",
            view.bottomOffsetClass,
          )}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {!view.expanded ? (
              <motion.div
                key="workspace-agent-collapsed"
                className="pointer-events-auto flex w-full max-w-[360px] items-center justify-center py-3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.1 } }}
              >
                <div className="group/pill flex w-full items-center justify-center">
                  <motion.button
                    type="button"
                    layoutId={SHELL_LAYOUT_ID}
                    transition={{ layout: layoutTransition }}
                    aria-label={collapsedLabel}
                    title={isWorking ? "Working..." : "Message Orch (Ctrl+J)"}
                    aria-busy={isWorking || undefined}
                    style={{ borderRadius: 9999 }}
                    className={cn(
                      "group relative flex items-center justify-center overflow-hidden",
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
                  </motion.button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="workspace-agent-expanded"
                {...(showChat
                  ? {
                      layoutId: SHELL_LAYOUT_ID,
                      transition: { layout: layoutTransition },
                      style: { borderRadius: 16 },
                    }
                  : {})}
                className={cn(
                  "pointer-events-auto flex w-full flex-col",
                  showArtifactSplit ? "max-w-[1080px]" : "max-w-[760px]",
                  showChat &&
                    "overflow-hidden rounded-2xl border border-border bg-card text-card-foreground shadow-lg",
                )}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, transition: { duration: 0.12 } }}
              >
                <AnimatePresence initial={false}>
                  {showChat ? (
                    <motion.div
                      key="workspace-agent-chat"
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: contentExit }}
                      transition={{ layout: layoutTransition, opacity: contentEnter }}
                      className="overflow-hidden"
                    >
                      <WorkspaceAgentChatPanelView
                        title={view.activeConversationTitle}
                        messages={view.messages}
                        conversationOptions={view.conversationOptions}
                        conversationsLoading={view.conversationsLoading}
                        activeConversationId={view.activeConversationId}
                        threadMenuOpen={view.threadMenuOpen}
                        onThreadMenuOpenChange={view.setThreadMenuOpen}
                        onSelectConversation={view.switchConversation}
                        onStartNewConversation={view.startNewConversation}
                        onDeleteConversation={(id) => void view.deleteConversationById(id)}
                        deletingConversationId={view.deletingConversationId}
                        canManageConversation={view.canManageConversation}
                        isRenameDialogOpen={view.isRenameDialogOpen}
                        isDeleteDialogOpen={view.isDeleteDialogOpen}
                        renameDraft={view.renameDraft}
                        onRenameDraftChange={view.setRenameDraft}
                        onOpenRename={view.openRenameDialog}
                        onCloseRename={view.closeRenameDialog}
                        onSubmitRename={() => void view.submitRenameConversation()}
                        onOpenDelete={view.openDeleteDialog}
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
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <AnimatePresence initial={false}>
                  {view.error ? (
                    <motion.div
                      key="workspace-agent-error"
                      layout
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0, transition: contentExit }}
                      transition={contentEnter}
                      className={cn(
                        "overflow-hidden bg-destructive/10 text-sm text-destructive",
                        showChat
                          ? "border-b border-border px-3 py-2"
                          : "mb-2 rounded-xl border border-destructive/40 bg-card px-3 py-2",
                      )}
                    >
                      {view.error}
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <motion.div
                  layout
                  className={cn(showChat && "border-t border-border")}
                  transition={{ layout: layoutTransition }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1, transition: contentEnter }}
                >
                  <WorkspaceAgentComposerView
                    draft={view.draft}
                    onDraftChange={view.setDraft}
                    placeholder={view.placeholder}
                    scopeChips={view.scopeChips}
                    onRemoveChip={view.removeScopeChip}
                    mentionSuggestions={view.mentionSuggestions}
                    onSelectMention={view.addMentionedNode}
                    selectedToolPreset={view.selectedToolPreset}
                    onSelectToolPreset={view.setSelectedToolPreset}
                    planModeEnabled={view.planModeEnabled}
                    surfaceLabel={view.surfaceLabel}
                    crossSurfaceUnlockLabel={view.crossSurfaceUnlockLabel}
                    onUnlockCrossSurface={view.onUnlockCrossSurface}
                    selectedModelLabel={selectedModelLabel}
                    selectedModelButtonLabel={selectedModelButtonLabel}
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
                    historyBillOpen={view.historyBillOpen}
                    onHistoryBillOpenChange={view.setHistoryBillOpen}
                    conversationOptions={view.conversationOptions}
                    conversationsLoading={view.conversationsLoading}
                    activeConversationId={view.activeConversationId}
                    activeCostUsd={view.activeCostUsd}
                    onSelectConversation={view.switchConversation}
                    onStartNewConversation={view.startNewConversation}
                    onDeleteConversation={(id) => void view.deleteConversationById(id)}
                    deletingConversationId={view.deletingConversationId}
                    canSend={view.canSend}
                    isPending={view.isPending}
                    chatStatus={view.chatStatus}
                    onSend={(input) => void view.sendMessage(input)}
                    onStop={view.stopGeneration}
                    dimmed={view.scopeModeActive}
                    shellLayoutId={showChat ? undefined : SHELL_LAYOUT_ID}
                    nestedInShell={showChat}
                    quickStarts={view.quickStarts}
                    showQuickStarts={showFloatingQuickStarts}
                    onSelectQuickStart={view.onSelectQuickStart}
                  />
                </motion.div>
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
      </LayoutGroup>
    </MotionConfig>
  );
}
