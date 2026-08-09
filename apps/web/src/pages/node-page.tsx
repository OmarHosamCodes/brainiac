import { Loader2 } from "lucide-react";
import { Link } from "@/lib/navigation";

import { AppShellPage } from "@/features/app-shell/app-shell-page";
import { ShellBootSurface } from "@/features/app-shell/components/shell-boot-surface";
import { useShellBootGate } from "@/features/app-shell/shell/use-shell-boot-gate";
import { useWorkspaceNodePage } from "@/features/workspace/hooks/use-workspace-node-page";
import { WorkspaceNodeEditorProvider } from "@/features/workspace/node/context";
import { WorkspaceNodeShell } from "@/features/workspace/node/workspace-node-shell";
import { Button } from "@/ui/button";

export function NodePage() {
  const page = useWorkspaceNodePage();
  const dataReady = !page.isWorkspaceInitialLoading && page.hasWorkspaceLoaded;
  const { isBooting } = useShellBootGate(dataReady);

  return (
    <AppShellPage>
      <ShellBootSurface booting={isBooting} label="Opening this node">
        <div className="relative h-full w-full overflow-hidden">
          {page.workspaceQuery.status === "error" ? (
            <div className="p-6 text-sm text-destructive">
              {page.workspaceQuery.error?.message || "The workspace could not be loaded."}
            </div>
          ) : null}

          {page.node && page.activeTab && page.editorContext ? (
            <div className="h-full">
              <WorkspaceNodeEditorProvider value={page.editorContext}>
                <WorkspaceNodeShell
                  node={page.node}
                  activeTab={page.activeTab}
                  activeTabId={page.activeTabId}
                  saveBadge={page.saveBadge}
                  saveError={page.saveError}
                  visibleBlocks={page.visibleBlocks}
                  nodeVisibilityLabel={page.nodeVisibilityLabel}
                  nodeVisibilityBadgeClass={page.nodeVisibilityBadgeClass}
                  nodeOwnerLabel={page.nodeOwnerLabel}
                  nodeTeamName={page.canManageNodeSharing ? page.nodeTeamName : null}
                  activeTeamRole={page.activeTeamRole}
                  canEditNodeContent={page.canEditNodeContent}
                  teams={page.teams}
                  nodeShareTeamId={page.nodeShareTeamId}
                  canManageNodeSharing={page.canManageNodeSharing}
                  sharePending={page.shareNodeMutation.isPending}
                  unsharePending={page.unshareNodeMutation.isPending}
                  onNodeShareTeamIdChange={page.setNodeShareTeamId}
                  onShareNode={() => void page.shareCurrentNodeToTeam()}
                  onUnshareNode={() => void page.unshareCurrentNodeFromTeam()}
                />
              </WorkspaceNodeEditorProvider>
            </div>
          ) : null}

          {!page.isWorkspaceInitialLoading && page.hasWorkspaceLoaded && !page.node ? (
            <div className="mx-auto flex max-w-xl flex-col gap-4 px-6 py-16">
              <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
                Node not found. It may have been removed or the link is invalid.
              </div>
              <Button variant="secondary" asChild>
                <Link to="/canvas">Return to canvas</Link>
              </Button>
            </div>
          ) : null}

          {page.isWorkspaceRefreshing ? (
            <div className="pointer-events-none absolute right-4 top-4 z-30 md:right-6 md:top-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-muted/70 bg-background/95 px-3 py-2 text-xs font-medium text-toned">
                <Loader2 className="size-3.5 animate-spin text-primary" />
                Refreshing workspace
              </div>
            </div>
          ) : null}
        </div>
      </ShellBootSurface>
    </AppShellPage>
  );
}
