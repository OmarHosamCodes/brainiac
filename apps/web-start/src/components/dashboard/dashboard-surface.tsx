import { Plus, RefreshCw } from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAppShellActions, useAppShellCustomDock, useAppShellDockContent, useAppShellPageTitle } from "@/hooks/use-app-shell";
import { useTeamSelection } from "@/hooks/use-team-selection";
import { useWorkspaceSnapshot } from "@/hooks/use-workspace";
import { useDashboard } from "@/stores/dashboard";
import { useWorkspaceState } from "@/hooks/useWorkspaceState";
import { DashboardWorkspaceSidebar } from "./dashboard-workspace-sidebar";
import { InfiniteCanvas } from "./infinite-canvas";
import { WorkspaceEditorModal } from "../workspace/workspace-editor-modal";
import { WorkspaceBoardStatus } from "../workspace/workspace-board-status";

export function DashboardSurface() {
  useAppShellPageTitle("Dashboard");
  useAppShellCustomDock();

  const workspaceQuery = useWorkspaceSnapshot();
  const teamSelection = useTeamSelection();
  const workspaceState = useWorkspaceState();
  
  // Dashboard UI state
  const dashboardState = useDashboard();
  const [sidebarCompact, setSidebarCompact] = React.useState(false);
  const [selectedTeamId, setSelectedTeamId] = React.useState(teamSelection.selectedTeamId || "");
  const [isCreateMode, setIsCreateMode] = React.useState(false);
  
  const nodes = workspaceQuery.data?.nodes ?? [];
  const teams = teamSelection.teams ?? [];

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingNodeId, setEditingNodeId] = React.useState<string | null>(null);
  const [formData, setFormData] = React.useState({
    title: "",
    content: "",
    nodeType: "standard" as const,
    tint: "neutral" as const,
    featuredBlocks: [] as Array<{ tabId: string; blockId: string }>,
  });

  const handleCreateNode = React.useCallback(() => {
    setIsCreateMode(true);
    setEditingNodeId(null);
    setFormData({
      title: "",
      content: "",
      nodeType: "standard",
      tint: "neutral",
      featuredBlocks: [],
    });
    setModalOpen(true);
  }, []);

  const handleEditNode = React.useCallback((nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (!node) return;

    setIsCreateMode(false);
    setEditingNodeId(nodeId);
    setFormData({
      title: node.title,
      content: node.content,
      nodeType: node.nodeType,
      tint: node.dashboard.tint,
      featuredBlocks: node.dashboard.featuredBlocks,
    });
    setModalOpen(true);
  }, [nodes]);

  const handleDeleteNode = React.useCallback((nodeId: string) => {
    // TODO: implement delete mutation
    console.log("Delete node:", nodeId);
  }, []);

  const handleSubmitModal = React.useCallback(async () => {
    if (isCreateMode) {
      // TODO: implement create mutation
      console.log("Create node:", formData);
    } else {
      // TODO: implement update mutation
      console.log("Update node:", editingNodeId, formData);
    }
    setModalOpen(false);
  }, [formData, isCreateMode, editingNodeId]);

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
          // TODO: implement create team mutation
          console.log("Create team:", name);
        }}
        selectedNodeTitle={selectedNode?.title ?? null}
        isSelectedNodeShared={selectedNode?.visibility === "team"}
        canManageSharing={true} // TODO: check actual permission
        onToggleNodeSharing={() => {
          // TODO: implement share mutation
          console.log("Toggle sharing for node:", selectedNode?.id);
        }}
        onOpenTeamSettings={() => {
          // TODO: open team settings modal
          console.log("Open team settings");
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
                handleCreateNode();
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
        open={modalOpen}
        onOpenChange={setModalOpen}
        mode={isCreateMode ? "create" : "edit"}
        title={formData.title}
        onTitleChange={(title) => setFormData((prev) => ({ ...prev, title }))}
        content={formData.content}
        onContentChange={(content) => setFormData((prev) => ({ ...prev, content }))}
        nodeType={formData.nodeType}
        onNodeTypeChange={(nodeType) => setFormData((prev) => ({ ...prev, nodeType }))}
        tint={formData.tint}
        onTintChange={(tint) => setFormData((prev) => ({ ...prev, tint }))}
        featuredBlocks={formData.featuredBlocks}
        onFeaturedBlocksChange={(blocks) => setFormData((prev) => ({ ...prev, featuredBlocks: blocks }))}
        availableBlocks={selectedNode?.dashboard.availableBlocks ?? []}
        valid={formData.title.trim().length > 0}
        onSubmit={handleSubmitModal}
      />
    </div>
  );
}
