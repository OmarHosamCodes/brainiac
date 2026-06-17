import type { WorkspaceNode } from "@brainiac/workspace";
import { useEffect, useState } from "react";

import { DashboardAgentChatHeader } from "@/components/dashboard/agent-chat/dashboard-agent-chat-header";
import { DashboardAgentComposer } from "@/components/dashboard/agent-chat/dashboard-agent-composer";
import { DashboardAgentConversationDialogs } from "@/components/dashboard/agent-chat/dashboard-agent-conversation-dialogs";
import { DashboardAgentMessageList } from "@/components/dashboard/agent-chat/dashboard-agent-message-list";
import { DashboardAgentModelLibrary } from "@/components/dashboard/agent-chat/dashboard-agent-model-library";
import { DashboardAgentThreadRail } from "@/components/dashboard/agent-chat/dashboard-agent-thread-rail";
import { useDashboardAgentChat } from "@/hooks/use-dashboard-agent-chat";
import { useAppShellStore } from "@/stores/app-shell";

const NARROW_DOCK_WIDTH = 480;

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
  const agentDockWidth = useAppShellStore((state) => state.agentDockWidth);
  const [isModelLibraryOpen, setIsModelLibraryOpen] = useState(false);
  const isNarrowDock = agentDockWidth < NARROW_DOCK_WIDTH;
  const [railExpanded, setRailExpanded] = useState(!isNarrowDock);

  useEffect(() => {
    setRailExpanded(!isNarrowDock);
  }, [isNarrowDock]);

  function closeRailOverlay() {
    if (isNarrowDock) {
      setRailExpanded(false);
    }
  }

  function handleToggleRail() {
    setRailExpanded((current) => !current);
  }

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

      <DashboardAgentConversationDialogs chat={chat} />

      {isNarrowDock && railExpanded ? (
        <button
          type="button"
          className="absolute inset-0 z-20 bg-black/20"
          aria-label="Close conversation list"
          onClick={closeRailOverlay}
        />
      ) : null}

      <div className="flex min-h-0 flex-1">
        <DashboardAgentThreadRail
          chat={chat}
          expanded={railExpanded}
          slideover={isNarrowDock}
          onToggleExpanded={handleToggleRail}
          onSelectConversation={closeRailOverlay}
        />

        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <DashboardAgentChatHeader
            chat={chat}
            onClose={onClose}
            onToggleRail={isNarrowDock ? handleToggleRail : undefined}
            scopeBadges={scopeBadges}
          />

          <DashboardAgentMessageList chat={chat} scopeKind={scopeKind} />

          <DashboardAgentComposer
            chat={chat}
            scopeKind={scopeKind}
            onOpenModelLibrary={() => setIsModelLibraryOpen(true)}
          />
        </div>
      </div>
    </div>
  );
}
