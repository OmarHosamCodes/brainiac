import type { WorkspaceNode } from "@brainiac/workspace";
import { Loader2, Send, Sparkles, X } from "lucide-react";
import { useState } from "react";

import { DashboardAgentModelLibrary } from "@/components/dashboard/dashboard-agent-model-library";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useDashboardAgentChat } from "@/hooks/use-dashboard-agent-chat";
import { dashboardEmptyPanelClass, dashboardLabelClass } from "@/lib/utils/dashboard-ui";
import { renderSimpleMarkdown } from "@/lib/utils/render-simple-markdown";
import { cn } from "@/lib/utils";

type DashboardAgentChatPanelProps = {
  nodes: WorkspaceNode[];
  activeTabId?: string | null;
  scopeKind?: "nodes" | "blocks";
  onClose?: () => void;
  scopeBadges?: React.ReactNode;
};

export function DashboardAgentChatPanel({
  nodes,
  activeTabId = null,
  scopeKind = "nodes",
  onClose,
  scopeBadges,
}: DashboardAgentChatPanelProps) {
  const chat = useDashboardAgentChat(nodes, activeTabId);
  const [isModelLibraryOpen, setIsModelLibraryOpen] = useState(false);

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <DashboardAgentModelLibrary
        open={isModelLibraryOpen}
        onOpenChange={setIsModelLibraryOpen}
        modelSearch={chat.modelSearch}
        onModelSearchChange={chat.setModelSearch}
        filteredModelOptions={chat.filteredModelOptions}
        selectedModelId={chat.selectedModelId}
        onSelectModel={chat.setConversationDraftModelId}
        onToggleFavorite={chat.toggleFavoriteModel}
        isFavoriteModel={chat.isFavoriteModel}
        favoritesOnly={chat.favoritesOnly}
        onFavoritesOnlyChange={chat.setFavoritesOnly}
      />

      <header className="flex items-start justify-between gap-3 border-b border-default px-4 py-3">
        <div className="min-w-0">
          <p className={dashboardLabelClass}>Agent</p>
          <p className="truncate text-sm font-semibold text-highlighted">{chat.activeConversationTitle}</p>
          <p className="truncate text-xs text-muted">{chat.scopeLabel}</p>
        </div>
        {onClose ? (
          <Button variant="ghost" size="icon" aria-label="Close agent panel" onClick={onClose}>
            <X className="size-4" />
          </Button>
        ) : null}
      </header>

      {scopeBadges ? <div className="border-b border-default px-4 py-2">{scopeBadges}</div> : null}

      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {chat.messages.length === 0 ? (
          <div className={cn(dashboardEmptyPanelClass, "text-left")}>
            <Sparkles className="size-5 text-primary" />
            <p className="mt-3 text-sm font-semibold text-highlighted">
              {scopeKind === "blocks" ? "Ask about blocks in scope" : "Ask about your workspace"}
            </p>
            <div className="mt-3 space-y-2">
              {chat.promptSuggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  className="block w-full rounded-xl border border-muted/60 px-3 py-2 text-left text-sm text-muted transition hover:border-primary/30 hover:bg-muted/20"
                  onClick={() => void chat.sendMessage(suggestion)}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          chat.messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "rounded-2xl border px-3 py-2 text-sm",
                message.role === "assistant"
                  ? "border-default bg-muted/20 text-highlighted"
                  : "border-primary/20 bg-primary/5 text-highlighted",
              )}
            >
              <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted">{message.role}</p>
              <div
                className="prose prose-sm dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: renderSimpleMarkdown(message.content) }}
              />
            </div>
          ))
        )}

        {chat.isPending ? (
          <div className="inline-flex items-center gap-2 text-sm text-muted">
            <Loader2 className="size-4 animate-spin" />
            Working…
          </div>
        ) : null}

        {chat.error ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {chat.error}
          </div>
        ) : null}
      </div>

      <div className="border-t border-default p-4">
        {chat.selectedNodes.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {chat.selectedNodes.map((node) => (
              <Badge key={node.id} variant="secondary" className="rounded-full">
                {node.title}
                <button type="button" className="ml-1" onClick={() => chat.removeMentionedNode(node.id)}>
                  ×
                </button>
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="flex items-end gap-2">
          <Textarea
            value={chat.draft}
            rows={3}
            placeholder={scopeKind === "blocks" ? "Ask about blocks in scope" : "Ask about anything"}
            onChange={(event) => chat.setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void chat.sendMessage();
              }
            }}
          />
          <Button disabled={!chat.canSend} onClick={() => void chat.sendMessage()}>
            {chat.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          </Button>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setIsModelLibraryOpen(true)}>
            Models
          </Button>
          <Button variant="ghost" size="sm" onClick={() => chat.startNewConversation()}>
            New chat
          </Button>
          {chat.selectedModelOption ? (
            <span className="text-xs text-muted">{chat.selectedModelOption.name}</span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
