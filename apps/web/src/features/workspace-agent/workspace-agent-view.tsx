import { WorkspaceAgentChatPanelView } from "@/features/workspace-agent/chat-panel-view";
import { WorkspaceAgentComposerView } from "@/features/workspace-agent/composer-view";
import type { WorkspaceAgentViewModel } from "@/features/workspace-agent/hooks/use-workspace-agent";
import { WorkspaceAgentModelLibraryView } from "@/features/workspace-agent/model-library-view";
import { cn } from "@/lib/utils";

type WorkspaceAgentViewProps = {
  view: WorkspaceAgentViewModel;
};

export function WorkspaceAgentView({ view }: WorkspaceAgentViewProps) {
  const selectedModelLabel =
    view.modelOptions.find((model) => model.id === view.selectedModelId)?.label ?? "Model";

  if (!view.expanded) {
    return (
      <div
        data-workspace-agent-root
        className={cn(
          "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4",
          view.bottomOffsetClass,
        )}
      >
        <div className="group/pill pointer-events-auto flex w-full max-w-[360px] items-center justify-center py-3">
          <button
            type="button"
            aria-label="Message Orch"
            title="Message Orch (Ctrl+J)"
            className={cn(
              "group relative flex items-center justify-center overflow-hidden",
              "h-1.5 w-12 rounded-full border-0 bg-muted-foreground/40",
              "motion-safe:transition-[width,height,padding,background-color,border-color,box-shadow] motion-safe:duration-200 motion-safe:ease-out",
              "group-hover/pill:h-11 group-hover/pill:w-full group-hover/pill:justify-between group-hover/pill:border group-hover/pill:border-primary/30 group-hover/pill:bg-default group-hover/pill:px-4 group-hover/pill:shadow-[0_4px_16px_oklch(0.18_0.005_285_/_0.08)]",
              "focus-visible:h-11 focus-visible:w-full focus-visible:justify-between focus-visible:border focus-visible:border-primary/40 focus-visible:bg-default focus-visible:px-4 focus-visible:outline-none focus-visible:shadow-[0_4px_16px_oklch(0.18_0.005_285_/_0.08)]",
            )}
            onClick={() => view.setExpanded(true)}
          >
            <span className="hidden w-full items-center justify-between whitespace-nowrap text-sm text-muted group-hover/pill:flex group-focus-visible:flex">
              <span>Message Orch</span>
              <kbd className="text-xs text-muted">Ctrl+J</kbd>
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      data-workspace-agent-root
      className={cn(
        "pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4",
        view.bottomOffsetClass,
      )}
    >
      <div className="pointer-events-auto flex w-full max-w-[720px] flex-col overflow-hidden rounded-2xl border border-default bg-default shadow-[0_8px_28px_oklch(0.18_0.005_285_/_0.12)] motion-safe:transition-[opacity,transform] motion-safe:duration-200 motion-safe:ease-out">
        {(view.messages.length > 0 || view.activeConversationId) && (
          <WorkspaceAgentChatPanelView
            title={view.activeConversationTitle}
            messages={view.messages}
            conversationOptions={view.conversationOptions}
            threadMenuOpen={view.threadMenuOpen}
            onThreadMenuOpenChange={view.setThreadMenuOpen}
            onSelectConversation={view.switchConversation}
            onStartNewConversation={view.startNewConversation}
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
          />
        )}

        {view.error ? (
          <div className="border-b border-default px-3 py-2 text-sm text-destructive">
            {view.error}
          </div>
        ) : null}

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
          agentModeDisabled={view.agentModeDisabled}
          selectedModelLabel={selectedModelLabel}
          onOpenModelLibrary={() => view.setModelLibraryOpen(true)}
          scopeModeActive={view.scopeModeActive}
          onToggleScopeMode={view.toggleScopeMode}
          scopeHintSeen={view.scopeHintSeen}
          toolsMenuOpen={view.toolsMenuOpen}
          onToolsMenuOpenChange={view.setToolsMenuOpen}
          tools={view.tools}
          toolsLoading={view.toolsLoading}
          canSend={view.canSend}
          isPending={view.isPending}
          onSend={() => void view.sendMessage()}
          dimmed={view.scopeModeActive}
        />
      </div>

      <WorkspaceAgentModelLibraryView
        open={view.modelLibraryOpen}
        onOpenChange={view.setModelLibraryOpen}
        modelSearch={view.modelSearch}
        onModelSearchChange={view.setModelSearch}
        filteredModelOptions={view.filteredModelOptions}
        selectedModelId={view.selectedModelId}
        onSelectModel={view.setConversationDraftModelId}
        onToggleFavorite={view.toggleFavoriteModel}
        isFavoriteModel={view.isFavoriteModel}
        favoritesOnly={view.favoritesOnly}
        onFavoritesOnlyChange={view.setFavoritesOnly}
      />
    </div>
  );
}
