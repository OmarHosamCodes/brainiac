import { AlertCircle, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/navigation";

import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import {
  LazyInfiniteCanvas,
  type InfiniteCanvasHandle,
} from "@/features/workspace/canvas/lazy-infinite-canvas";
import { WorkspaceEditorModal } from "@/features/workspace/workspace-editor-modal";
import { WorkspaceNodeCard } from "@/features/workspace/workspace-node-card";
import { Badge } from "@/ui/badge";
import { authClient } from "@/lib/auth-client";
import { teamListQueryOptions } from "@/features/team/team-queries";
import { useTeamStore } from "@/features/team/team-store";
import { useWorkspaceQuery } from "@/features/workspace/hooks/use-workspace-query";
import { dashboardErrorAlertClass } from "@/features/dashboard/dashboard-ui";
import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { shellContentInClass } from "@/features/app-shell/app-shell-ui";
import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
import { cn } from "@/lib/utils";

function renderWorkspaceCard(
  node: CanvasNodeModel,
  selected: boolean,
  allNodes: CanvasNodeModel[],
) {
  return <WorkspaceNodeCard node={node} selected={selected} allNodes={allNodes} />;
}

export function CanvasPage() {
  const canvasRef = useRef<InfiniteCanvasHandle | null>(null);
  const navigate = useNavigate();
  const [selectionArmed, setSelectionArmed] = useState(false);
  const session = authClient.useSession();
  const authEnabled = Boolean(session.data?.user);

  const syncSelectedTeam = useTeamStore((s) => s.syncSelectedTeam);

  const board = useWorkspaceQuery();

  useEffect(() => {
    if (board.selectedNodeIds.length > 0) {
      board.setSelectedNodeIds([]);
    }
    setSelectionArmed(true);
  }, []);

  const handleFlowNodesChange = useCallback(
    (nextNodes: CanvasNodeModel[]) => {
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
      });
    },
    [board.updateNodes],
  );

  const handleOpenNode = useCallback(
    (payload: { nodeId: string }) => {
      board.setSelectedNodeIds([]);
      void navigate(`/node/${payload.nodeId}`);
    },
    [board.setSelectedNodeIds, navigate],
  );

  const teamListQuery = useQuery({
    ...teamListQueryOptions(),
    enabled: authEnabled,
  });

  const teams = teamListQuery.data?.items ?? [];

  useEffect(() => {
    syncSelectedTeam(teams);
  }, [teams, syncSelectedTeam]);

  useEffect(() => {
    void board.preloadWorkspace();
  }, [board.preloadWorkspace]);

  const dataReady = !board.isWorkspaceInitialLoading && !teamListQuery.isPending;
  const { isBooting } = useShellBootGate(dataReady);

  return (
    <AppShellPage>
      <ShellBootSurface booting={isBooting} label="Opening canvas">
        <div className="relative h-full w-full overflow-hidden bg-default selection:bg-primary/30">
          <main className="h-full w-full">
            <LazyInfiniteCanvas
              ref={canvasRef}
              nodes={board.nodes}
              selectedNodeIds={selectionArmed ? board.selectedNodeIds : []}
              loading={board.isWorkspaceInitialLoading}
              onNodesChange={handleFlowNodesChange}
              onSelectedNodeIdsChange={board.setSelectedNodeIds}
              onCreateNode={board.openCreateNode}
              onEditNode={board.openEditNode}
              onConnectNodePair={board.connectNodePair}
              onDisconnectNodePair={board.disconnectNodePair}
              onRemoveNode={board.removeNode}
              onOpenNode={handleOpenNode}
              renderNode={renderWorkspaceCard}
            />
          </main>

          <div className="pointer-events-none absolute bottom-[11.5rem] left-4 z-30 flex max-w-xs flex-col gap-3 md:bottom-[12rem] md:left-6">
            {board.isWorkspaceRefreshing ? (
              <div className="pointer-events-auto flex flex-wrap items-center gap-2">
                <Badge
                  key="refreshing"
                  variant="secondary"
                  className={cn("gap-1.5", shellContentInClass)}
                >
                  <Loader2 className="size-3 animate-spin" />
                  Refreshing
                </Badge>
              </div>
            ) : null}

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
        </div>
      </ShellBootSurface>
    </AppShellPage>
  );
}
