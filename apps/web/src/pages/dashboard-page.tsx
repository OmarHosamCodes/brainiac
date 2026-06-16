import { AlertCircle, Loader2, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { DashboardAgentChatPanel } from "@/components/dashboard/dashboard-agent-chat-panel";
import { DashboardWorkspaceSidebar } from "@/components/dashboard/dashboard-workspace-sidebar";
import { InfiniteCanvas, type InfiniteCanvasHandle } from "@/components/infinite-canvas";
import { WorkspaceEditorModal } from "@/components/workspace/workspace-editor-modal";
import { WorkspaceNodeCard } from "@/components/workspace/workspace-node-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTeamManagement } from "@/hooks/use-team-management";
import { useTeamSelection } from "@/hooks/use-team-selection";
import {
  useAppShellActionsSlot,
  useAppShellContextSlot,
  useAppShellCustomDock,
  useAppShellPageTitle,
} from "@/hooks/use-app-shell";
import { useWorkspaceBoard } from "@/hooks/use-workspace-board";
import { AppShellPortal } from "@/hooks/use-app-shell-portal";
import { useAppShellStore } from "@/stores/app-shell";
import { dashboardErrorAlertClass, dashboardStatusBadgeClass } from "@/lib/utils/dashboard-ui";
import { shellActionsSlotClass } from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  useAppShellPageTitle("Dashboard");
  useAppShellCustomDock();
  useAppShellContextSlot();
  useAppShellActionsSlot();

  const canvasRef = useRef<InfiniteCanvasHandle | null>(null);
  const [isTeamAsideCompact, setIsTeamAsideCompact] = useState(true);
  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);

  const board = useWorkspaceBoard();
  const teamSelection = useTeamSelection();
  const teamManagement = useTeamManagement({
    teamSelection,
    workspaceQuery: board.workspaceQuery,
  });

  const selectedNode = useMemo(() => {
    const nodeId = board.selectedNodeIds[0];
    if (!nodeId) return null;
    return board.nodes.find((node) => node.id === nodeId) ?? null;
  }, [board.nodes, board.selectedNodeIds]);

  const selectedTeamRole = teamSelection.selectedTeam?.role ?? null;
  const selectedTeamName = teamSelection.selectedTeam?.name ?? "";
  const selectedTeamMemberCount = teamSelection.selectedTeam?.members?.length ?? 0;
  const isSelectedNodeShared = selectedNode?.visibility === "team";
  const isNodeShareActionPending = false;

  useEffect(() => {
    if (board.isWorkspaceInitialLoading || !canvasRef.current) return;
    canvasRef.current.fitAllNodes();
  }, [board.isWorkspaceInitialLoading]);

  return (
    <div className="relative h-full w-full overflow-hidden bg-default selection:bg-primary/30">
      <AppShellPortal targetId="app-shell-actions">
        <div className={shellActionsSlotClass}>
          <Button variant="ghost" size="sm" onClick={() => setIsTeamAsideCompact((value) => !value)}>
            {isTeamAsideCompact ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
            <span className="hidden lg:inline">Workspace</span>
          </Button>
          <Button variant="secondary" size="sm" onClick={() => canvasRef.current?.createNodeAtViewportCenter()}>
            <Plus className="size-4" />
            Add
          </Button>
        </div>
      </AppShellPortal>

      <AppShellPortal targetId="app-shell-dock-content">
        <div className="flex h-full min-h-0 flex-col">
          <DashboardAgentChatPanel nodes={board.nodes} onClose={() => setAgentDockOpen(false)} />
        </div>
      </AppShellPortal>

      <main className="h-full w-full">
        <div className="flex h-full w-full overflow-hidden">
          <DashboardWorkspaceSidebar
            compact={isTeamAsideCompact}
            teamsCount={teamSelection.teams.length}
            newTeamName={teamSelection.newTeamName}
            createTeamPending={teamManagement.createTeamMutation.isPending}
            selectedTeamName={selectedTeamName}
            selectedTeamRole={selectedTeamRole}
            memberCount={selectedTeamMemberCount}
            selectedNode={selectedNode}
            canInvite={teamManagement.canInvite}
            canManageSelectedNodeSharing={selectedTeamRole === "owner"}
            selectedNodeTeamRole={selectedTeamRole}
            isSelectedNodeShared={Boolean(isSelectedNodeShared)}
            isNodeShareActionPending={Boolean(isNodeShareActionPending)}
            nodeShareActionLabel={isSelectedNodeShared ? "Unshare node" : "Share node"}
            nodeShareActionDisabled={!selectedNode || selectedTeamRole !== "owner"}
            onCompactChange={setIsTeamAsideCompact}
            onNewTeamNameChange={teamSelection.setNewTeamName}
            onCreateTeam={() => void teamManagement.createTeam()}
            onOpenTeamSettings={() => {}}
            onToggleSelectedNodeSharing={() => {}}
          />

          <div className="min-w-0 flex-1">
            <InfiniteCanvas
              ref={canvasRef}
              nodes={board.nodes}
              selectedNodeIds={board.selectedNodeIds}
              loading={board.isWorkspaceInitialLoading}
              onNodesChange={(nextNodes) =>
                board.updateNodes((draft) => {
                  const positionById = new Map(nextNodes.map((node) => [node.id, node]));
                  draft.forEach((node, index) => {
                    const updated = positionById.get(node.id);
                    if (!updated) return;
                    draft[index] = {
                      ...node,
                      x: updated.x,
                      y: updated.y,
                      width: updated.width,
                      height: updated.height,
                    };
                  });
                })
              }
              onSelectedNodeIdsChange={board.setSelectedNodeIds}
              onCreateNode={board.openCreateNode}
              onEditNode={board.openEditNode}
              onConnectNodePair={board.connectNodePair}
              onDisconnectNodePair={board.disconnectNodePair}
              onRemoveNode={board.removeNode}
              onOpenNode={board.openNodePage}
              renderNode={(node, selected, allNodes) => (
                <WorkspaceNodeCard node={node} selected={selected} allNodes={allNodes} />
              )}
            />
          </div>
        </div>
      </main>

      <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex max-w-xs flex-col gap-3 md:bottom-6 md:left-6">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <span className={cn(dashboardStatusBadgeClass, board.saveBadge.className)}>{board.saveBadge.label}</span>
          {board.isWorkspaceRefreshing && board.saveBadge.label !== "Syncing" ? (
            <Badge variant="secondary" className="gap-1.5">
              <Loader2 className="size-3 animate-spin" />
              Refreshing
            </Badge>
          ) : null}
        </div>

        {board.saveError ? (
          <div className={cn(dashboardErrorAlertClass, "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive")}>
            {board.saveError}
          </div>
        ) : null}

        {board.workspaceQuery.status === "error" ? (
          <div className={cn(dashboardErrorAlertClass, "rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive")}>
            <div className="flex items-center gap-2 font-semibold">
              <AlertCircle className="size-4" />
              Couldn&apos;t load workspace
            </div>
            <p className="mt-1">{board.workspaceQuery.error?.message}</p>
          </div>
        ) : null}
      </div>

      <WorkspaceEditorModal
        availableBlocks={board.editorBlockOptions}
        content={board.nodeDraft.content}
        featuredBlocks={board.nodeDraft.featuredBlocks}
        mode={board.editorMode}
        nodeType={board.nodeDraft.nodeType}
        open={board.editorOpen}
        tint={board.nodeDraft.tint}
        title={board.nodeDraft.title}
        valid={board.isDraftValid}
        onClose={board.closeEditor}
        onSubmit={board.submitNodeEditor}
        onFeaturedBlocksChange={(featuredBlocks) => board.patchNodeDraft({ featuredBlocks })}
        onContentChange={(content) => board.patchNodeDraft({ content })}
        onNodeTypeChange={(nodeType) => board.patchNodeDraft({ nodeType })}
        onTintChange={(tint) => board.patchNodeDraft({ tint })}
        onTitleChange={(title) => board.patchNodeDraft({ title })}
      />
    </div>
  );
}
