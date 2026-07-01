import { AlertCircle, Loader2, PanelLeftClose, PanelLeftOpen, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { AppShellPage } from "@/components/app-shell-page";
import { AppShellTopbarActions, AppShellTopbarContext } from "@/components/app-shell-topbar";
import { AppShellPortal } from "@/components/app-shell-portal";
import { DashboardAgentChatPanel } from "@/components/dashboard/dashboard-agent-chat-panel";
import { DashboardWorkspaceSidebar } from "@/components/dashboard/dashboard-workspace-sidebar";
import { LazyInfiniteCanvas, type InfiniteCanvasHandle } from "@/components/lazy-infinite-canvas";
import { TeamSettingsModal } from "@/components/team/team-settings-modal";
import { WorkspaceEditorModal } from "@/components/workspace/workspace-editor-modal";
import { WorkspaceNodeCard } from "@/components/workspace/workspace-node-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { teamDetailQueryOptions, teamListQueryOptions } from "@/lib/queries/team";
import { useAppShellStore } from "@/stores/app-shell";
import { deriveTeamPermissions, useTeamStore } from "@/stores/team";
import { useWorkspaceQuery } from "@/stores/workspace";
import { dashboardErrorAlertClass, dashboardStatusBadgeClass } from "@/lib/utils/dashboard-ui";
import { shellContentInClass } from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

export function DashboardPage() {
  const canvasRef = useRef<InfiniteCanvasHandle | null>(null);
  const navigate = useNavigate();
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);
  const [teamSettingsOpen, setTeamSettingsOpen] = useState(false);

  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);
  const isTeamAsideCompact = useTeamStore((s) => s.isTeamAsideCompact);
  const setIsTeamAsideCompact = useTeamStore((s) => s.setIsTeamAsideCompact);
  const selectedTeamId = useTeamStore((s) => s.selectedTeamId);
  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);
  const createTeamPending = useTeamStore((s) => s.createTeamPending);
  const createTeam = useTeamStore((s) => s.createTeam);

  const board = useWorkspaceQuery();

  const teamListQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled,
  });

  const teamDetailQuery = useQuery({
    ...teamDetailQueryOptions(selectedTeamId),
    enabled: Boolean(authEnabled && selectedTeamId),
  });

  const teams = useMemo(() => teamListQuery.data?.items ?? [], [teamListQuery.data?.items]);
  const selectedTeam = teamDetailQuery.data ?? null;

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  const selectedNode = useMemo(() => {
    const nodeId = board.selectedNodeIds[0];
    if (!nodeId) return null;
    return board.nodes.find((node) => node.id === nodeId) ?? null;
  }, [board.nodes, board.selectedNodeIds]);

  const selectedTeamRole = selectedTeam?.role ?? null;
  const selectedTeamName = selectedTeam?.name ?? "";
  const selectedTeamMemberCount = selectedTeam?.members?.length ?? 0;
  const { canInvite } = deriveTeamPermissions(selectedTeamRole);
  const isSelectedNodeShared = selectedNode?.visibility === "team";
  const isNodeShareActionPending = false;

  useEffect(() => {
    void board.preloadWorkspace();
  }, [board.preloadWorkspace]);

  useEffect(() => {
    if (board.isWorkspaceInitialLoading || !canvasRef.current || board.nodes.length === 0) {
      return;
    }
    canvasRef.current.fitAllNodes();
  }, [board.isWorkspaceInitialLoading, board.nodes.length]);

  return (
    <AppShellPage subtitle={selectedTeamName || null} slots={["context", "actions", "dock"]}>
      <div className="relative h-full w-full overflow-hidden bg-default selection:bg-primary/30">
        <AppShellTopbarContext>
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0"
            aria-expanded={!isTeamAsideCompact}
            onClick={() => setIsTeamAsideCompact(!isTeamAsideCompact)}
          >
            {isTeamAsideCompact ? (
              <PanelLeftOpen className="size-4" />
            ) : (
              <PanelLeftClose className="size-4" />
            )}
            <span className="hidden lg:inline">Workspace</span>
          </Button>
        </AppShellTopbarContext>

        <AppShellTopbarActions>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => canvasRef.current?.createNodeAtViewportCenter()}
          >
            <Plus className="size-4" />
            Add
          </Button>
        </AppShellTopbarActions>

        <AppShellPortal targetId="app-shell-dock-content">
          <div className="flex h-full min-h-0 flex-col">
            <DashboardAgentChatPanel nodes={board.nodes} onClose={() => setAgentDockOpen(false)} />
          </div>
        </AppShellPortal>

        <main className="h-full w-full">
          <div className="flex h-full w-full overflow-hidden">
            <DashboardWorkspaceSidebar
              compact={isTeamAsideCompact}
              teamsCount={teams.length}
              createTeamPending={createTeamPending}
              selectedTeamName={selectedTeamName}
              selectedTeamRole={selectedTeamRole}
              memberCount={selectedTeamMemberCount}
              selectedNode={selectedNode}
              canInvite={canInvite}
              canManageSelectedNodeSharing={selectedTeamRole === "owner"}
              isSelectedNodeShared={Boolean(isSelectedNodeShared)}
              isNodeShareActionPending={Boolean(isNodeShareActionPending)}
              nodeShareActionLabel={isSelectedNodeShared ? "Unshare node" : "Share node"}
              nodeShareActionDisabled={!selectedNode || selectedTeamRole !== "owner"}
              onCompactChange={setIsTeamAsideCompact}
              onCreateTeam={createTeam}
              onOpenTeamSettings={() => setTeamSettingsOpen(true)}
              onToggleSelectedNodeSharing={() => {}}
            />

            <div className="min-h-0 min-w-0 flex-1 h-full">
              <LazyInfiniteCanvas
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
                onOpenNode={(payload) => navigate(`/node/${payload.nodeId}`)}
                renderNode={(node, selected, allNodes) => (
                  <WorkspaceNodeCard node={node} selected={selected} allNodes={allNodes} />
                )}
              />
            </div>
          </div>
        </main>

        <div className="pointer-events-none absolute bottom-4 left-4 z-30 flex max-w-xs flex-col gap-3 md:bottom-6 md:left-6">
          <div className="pointer-events-auto flex flex-wrap items-center gap-2">
            <span className={cn(dashboardStatusBadgeClass, board.saveBadge.className)}>
              {board.saveBadge.label}
            </span>
            {board.isWorkspaceRefreshing && board.saveBadge.label !== "Syncing" ? (
              <Badge
                key="refreshing"
                variant="secondary"
                className={cn("gap-1.5", shellContentInClass)}
              >
                <Loader2 className="size-3 animate-spin" />
                Refreshing
              </Badge>
            ) : null}
          </div>

          {board.saveError ? (
            <div
              key={board.saveError}
              className={cn(
                dashboardErrorAlertClass,
                shellContentInClass,
                "pointer-events-auto rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
              )}
            >
              {board.saveError}
            </div>
          ) : null}

          {board.workspaceQuery.status === "error" ? (
            <div
              key={board.workspaceQuery.error?.message ?? "workspace-error"}
              className={cn(
                dashboardErrorAlertClass,
                shellContentInClass,
                "pointer-events-auto rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive",
              )}
            >
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

        <TeamSettingsModal
          open={teamSettingsOpen}
          onOpenChange={setTeamSettingsOpen}
          team={selectedTeam}
          onRefetchWorkspace={() => board.workspaceQuery.refetch()}
        />
      </div>
    </AppShellPage>
  );
}
