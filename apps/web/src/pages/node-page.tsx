import { Link } from "react-router-dom";

import { DashboardAgentChatPanel } from "@/components/dashboard/dashboard-agent-chat-panel";
import { WorkspaceNodeEditorProvider } from "@/components/workspace/node/context";
import { WorkspaceNodeShell } from "@/components/workspace/node/workspace-node-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LogoLoader } from "@/components/shell/logo-loader";
import { AppShellPage } from "@/components/app-shell-page";
import { AppShellPortal } from "@/components/app-shell-portal";
import { useWorkspaceNodePage } from "@/lib/workspace/use-node-page";
import { useShellBootGate } from "@/lib/shell/use-shell-boot-gate";
import { useAppShellStore } from "@/stores/app-shell";
import {
  shellContentInClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

export function NodePage() {
  const setAgentDockOpen = useAppShellStore((s) => s.setAgentDockOpen);
  const page = useWorkspaceNodePage();
  const dataReady = !page.isWorkspaceInitialLoading && page.hasWorkspaceLoaded;
  const { isBooting } = useShellBootGate(dataReady);

  return (
    <AppShellPage subtitle={page.node?.title ?? "Node"} slots={["dock"]}>
      <div className="relative h-full w-full overflow-hidden">
        {!isBooting ? (
        <AppShellPortal targetId="app-shell-dock-content">
          {page.node ? (
            <div className="flex h-full min-h-0 flex-col">
              <DashboardAgentChatPanel
                nodes={page.agentChatNodes}
                activeTabId={page.activeTabId}
                scopeKind="blocks"
                onClose={() => setAgentDockOpen(false)}
                scopeBadges={
                  page.agentContextBadgeItems.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {page.agentContextBadgeItems.map((item) => (
                        <Badge key={item.id} variant="secondary" className="rounded-full">
                          {item.label}
                        </Badge>
                      ))}
                    </div>
                  ) : null
                }
              />
            </div>
          ) : null}
        </AppShellPortal>
        ) : null}

        {page.workspaceQuery.status === "error" ? (
          <div className="p-6 text-sm text-destructive">
            {page.workspaceQuery.error?.message || "The workspace could not be loaded."}
          </div>
        ) : null}

        {isBooting ? (
          <LogoLoader label="Loading node" />
        ) : null}

        {!isBooting && page.node && page.activeTab && page.editorContext ? (
          <div className={cn("h-full", shellContentInClass)}>
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

        {!isBooting && !page.isWorkspaceInitialLoading && page.hasWorkspaceLoaded && !page.node ? (
          <div
            className={cn("mx-auto flex max-w-xl flex-col gap-4 px-6 py-16", shellContentInClass)}
          >
            <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
              Node not found. It may have been removed or the link is invalid.
            </div>
            <Button variant="secondary" asChild>
              <Link to="/dashboard">Return to dashboard</Link>
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
    </AppShellPage>
  );
}
