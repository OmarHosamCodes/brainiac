import { Plus, RefreshCw } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";
import { useAppShellActions, useAppShellCustomDock, useAppShellDockContent, useAppShellPageTitle } from "@/hooks/use-app-shell";
import { useTeamSelection } from "@/hooks/use-team-selection";
import { useDashboard } from "@/stores/dashboard";
import { useWorkspaceState } from "@/hooks/useWorkspaceState";
import { orpc } from "@/lib/orpc";
import { getErrorMessage } from "@/utils/get-error-message";
import { DashboardWorkspaceSidebar } from "./dashboard-workspace-sidebar";
import { InfiniteCanvas } from "./infinite-canvas";
import { WorkspaceEditorModal } from "../workspace/workspace-editor-modal";
import { WorkspaceBoardStatus } from "../workspace/workspace-board-status";

export function DashboardSurface() {
  useAppShellPageTitle("Dashboard");
  useAppShellCustomDock();

  const teamSelection = useTeamSelection();
  const workspaceState = useWorkspaceState();
  const workspaceQuery = workspaceState.workspaceQuery;
  
  // Dashboard UI state
  const dashboardState = useDashboard();
  const [sidebarCompact, setSidebarCompact] = React.useState(false);
  const [selectedTeamId, setSelectedTeamId] = React.useState(teamSelection.selectedTeamId || "");
  
  const nodes = workspaceState.nodes;
  const teams = teamSelection.teams ?? [];

  const handleCreateNode = React.useCallback(() => {
    const { translateX, translateY, scale } = dashboardState.viewState;
    workspaceState.openCreateNode({
      x: (360 - translateX) / scale,
      y: (220 - translateY) / scale,
    });
  }, [dashboardState.viewState, workspaceState]);

  const handleEditNode = React.useCallback((nodeId: string) => {
    workspaceState.openEditNode({ nodeId });
  }, [workspaceState]);

  const handleDeleteNode = React.useCallback((nodeId: string) => {
    const node = nodes.find((entry) => entry.id === nodeId);
    if (!node) return;

    if (window.confirm(`Delete node "${node.title || "Untitled node"}"?`)) {
      workspaceState.removeNode({ nodeId });
    }
  }, [nodes, workspaceState]);

  const handleSubmitModal = React.useCallback(() => {
    workspaceState.submitNodeEditor();
  }, [workspaceState]);

  const shellActions = React.useMemo(
    () => (
      <Button type="button" size="sm" onClick={handleCreateNode}>
        <Plus className="size-4" />
        Add Node
      </Button>
    ),
    [handleCreateNode],
  );

  const dockContent = React.useMemo(
    () => (
      <div className="flex h-full flex-col p-5">
        <h2 className="text-sm font-bold">Workspace agent</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          The full agent chat port will attach here. Current workspace nodes available: {nodes.length}.
        </p>
      </div>
    ),
    [nodes.length],
  );

  useAppShellActions(shellActions);
  useAppShellDockContent(dockContent);

  const selectedNode = nodes.find((n) => dashboardState.selectedNodeId === n.id);
  const selectedNodeTeamRole =
    selectedNode?.visibility === "team" && selectedNode.teamId
      ? teams.find((team) => team.id === selectedNode.teamId)?.role
      : teams.find((team) => team.id === selectedTeamId)?.role;
  const canManageSelectedNodeSharing = selectedNodeTeamRole === "owner";

  const toggleSelectedNodeSharing = React.useCallback(async () => {
    if (!selectedNode) {
      return;
    }

    if (!canManageSelectedNodeSharing) {
      toast({
        title: "Owner role required",
        description: "Only team owners can change node sharing.",
        variant: "destructive",
      });
      return;
    }

    try {
      if (selectedNode.visibility === "team") {
        await orpc.workspace.unshareNode.call({ nodeId: selectedNode.id });
        toast({ title: "Node unshared" });
      } else {
        if (!selectedTeamId) {
          toast({
            title: "Select a team",
            description: "Choose a team before sharing this node.",
            variant: "destructive",
          });
          return;
        }

        await orpc.workspace.shareNode.call({
          nodeId: selectedNode.id,
          teamId: selectedTeamId,
        });
        toast({ title: "Node shared" });
      }

      await workspaceQuery.refetch();
    } catch (error) {
      toast({
        title: "Sharing update failed",
        description: getErrorMessage(error, "Please try again."),
        variant: "destructive",
      });
    }
  }, [canManageSelectedNodeSharing, selectedNode, selectedTeamId, workspaceQuery]);

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <DashboardWorkspaceSidebar
        compact={sidebarCompact}
        onCompactChange={setSidebarCompact}
        teamsCount={teams.length}
        selectedTeamId={selectedTeamId}
        onSelectedTeamChange={setSelectedTeamId}
        teams={teams.map((t) => ({ id: t.id, name: t.name }))}
        onCreateTeam={(name) => {
          toast({
            title: "Team creation unavailable here",
            description: `${name} was not created. Use team settings for membership changes.`,
          });
        }}
        selectedNodeTitle={selectedNode?.title ?? null}
        isSelectedNodeShared={selectedNode?.visibility === "team"}
        canManageSharing={canManageSelectedNodeSharing}
        onToggleNodeSharing={() => void toggleSelectedNodeSharing()}
        onOpenTeamSettings={() => {
          toast({ title: "Team settings are available from the team surface." });
        }}
      />

      {/* Main canvas area */}
      <section className="flex-1 flex flex-col bg-background">
        <div className="flex items-center justify-between border-b px-4 py-3 md:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Canvas
            </p>
            <h2 className="text-xl font-bold">Workspace map</h2>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {teamSelection.selectedTeam?.name ?? "Team"}
            </Badge>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void workspaceQuery.refetch()}
            >
              <RefreshCw className="size-4" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative overflow-hidden">
          {workspaceQuery.isLoading ? (
            <WorkspaceBoardStatus isLoading />
          ) : nodes.length === 0 ? (
            <WorkspaceBoardStatus isEmpty />
          ) : (
            <InfiniteCanvas
              nodes={nodes}
              selectedNodeIds={dashboardState.selectedNodeId ? [dashboardState.selectedNodeId] : []}
              onNodeSelect={(nodeId) => dashboardState.setSelectedNodeId(nodeId)}
              onCanvasClick={(x, y) => {
                workspaceState.openCreateNode({ x, y });
              }}
              onNodeEdit={handleEditNode}
              onNodeDelete={handleDeleteNode}
              viewState={dashboardState.viewState}
              onViewStateChange={(state) => dashboardState.setViewState(state)}
            />
          )}
        </div>
      </section>

      {/* Editor Modal */}
      <WorkspaceEditorModal
        open={workspaceState.editorOpen}
        onOpenChange={(open) => {
          if (!open) workspaceState.closeEditor();
        }}
        mode={workspaceState.editorMode}
        title={workspaceState.nodeDraft.title}
        onTitleChange={workspaceState.updateNodeDraftTitle}
        content={workspaceState.nodeDraft.content}
        onContentChange={workspaceState.updateNodeDraftContent}
        nodeType={workspaceState.nodeDraft.nodeType}
        onNodeTypeChange={workspaceState.updateNodeDraftNodeType}
        tint={workspaceState.nodeDraft.tint}
        onTintChange={workspaceState.updateNodeDraftTint}
        featuredBlocks={workspaceState.nodeDraft.featuredBlocks}
        onFeaturedBlocksChange={workspaceState.updateNodeDraftFeaturedBlocks}
        availableBlocks={workspaceState.editorBlockOptions}
        valid={workspaceState.isDraftValid}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}
