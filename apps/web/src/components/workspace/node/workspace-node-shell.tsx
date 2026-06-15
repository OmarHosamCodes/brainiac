import type {
  WorkspaceBlock,
  WorkspaceNode,
  WorkspaceNodeTab,
  WorkspaceTeamRole,
} from "@brainiac/workspace";
import {
  ArrowLeft,
  Blocks,
  Folder,
  FolderOpen,
  LayoutTemplate,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Pencil,
  ShieldCheck,
  Store,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useMemo, useState } from "react";

import { WorkspaceNodeBlockRenderer } from "@/components/workspace/node/workspace-node-block-renderer";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import type { WorkspaceSaveBadge } from "@/components/workspace/node/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  workspaceBlockPresets,
  type WorkspaceBlockPresetId,
} from "@/lib/utils/workspace-block-presets";
import {
  getWorkspaceBlockRegistryEntry,
  workspacePrimaryBlockTypes,
} from "@/lib/utils/workspace-block-registry";
import { cn } from "@/lib/utils";

type WorkspaceTeamSummary = {
  id: string;
  name: string;
  role: WorkspaceTeamRole;
};

type WorkspaceNodeShellProps = {
  node: WorkspaceNode;
  activeTab: WorkspaceNodeTab;
  activeTabId: string;
  saveBadge: WorkspaceSaveBadge;
  saveError: string | null;
  visibleBlocks: WorkspaceBlock[];
  nodeVisibilityLabel: string;
  nodeVisibilityBadgeClass: string;
  nodeOwnerLabel: string;
  nodeTeamName: string | null;
  activeTeamRole: WorkspaceTeamRole | null;
  canEditNodeContent: boolean;
  teams: WorkspaceTeamSummary[];
  nodeShareTeamId: string;
  canManageNodeSharing: boolean;
  sharePending: boolean;
  unsharePending: boolean;
  onNodeShareTeamIdChange: (value: string) => void;
  onShareNode: () => void;
  onUnshareNode: () => void;
};

export function WorkspaceNodeShell({
  node,
  activeTab,
  activeTabId,
  saveBadge,
  saveError,
  visibleBlocks,
  nodeVisibilityLabel,
  nodeVisibilityBadgeClass,
  nodeOwnerLabel,
  nodeTeamName,
  activeTeamRole,
  canEditNodeContent,
  teams,
  nodeShareTeamId,
  canManageNodeSharing,
  sharePending,
  unsharePending,
  onNodeShareTeamIdChange,
  onShareNode,
  onUnshareNode,
}: WorkspaceNodeShellProps) {
  const {
    setActiveTab,
    openTabEditor,
    deleteActiveTab,
    saveActiveTabToMarketplace,
    addBlockToActiveTab,
    addBlockPresetToActiveTab,
    getDisplayTabTitle,
  } = useWorkspaceNodeEditorContext();

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [addBlockLauncherOpen, setAddBlockLauncherOpen] = useState(false);
  const [launcherSearch, setLauncherSearch] = useState("");

  const isNodeSharedWithTeam = node.visibility === "team";
  const isShareTogglePending = sharePending || unsharePending;

  const activeTeamRoleLabel = useMemo(() => {
    if (!activeTeamRole) return null;
    if (activeTeamRole === "owner") return "Owner";
    if (activeTeamRole === "editor") return "Editor";
    return "Viewer";
  }, [activeTeamRole]);

  return (
    <div className="flex h-full w-full gap-0 overflow-hidden">
      <aside
        className={cn(
          "flex flex-col border-r border-muted/30 bg-default/40 backdrop-blur-xl transition-all duration-300",
          isSidebarOpen ? "w-80" : "w-0 opacity-0",
        )}
      >
        <div className="flex flex-1 flex-col overflow-y-auto p-6">
          <Button variant="ghost" className="justify-start px-0" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
          </Button>

          <div className="mb-8 mt-4 space-y-4">
            <Badge className={saveBadge.className}>{saveBadge.label}</Badge>
            <h1 className="text-2xl font-bold tracking-tight text-highlighted">{node.title}</h1>

            <div className="rounded-2xl border border-muted/40 bg-default/70 p-3 backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Node Access</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", nodeVisibilityBadgeClass)}>
                      {nodeVisibilityLabel}
                    </span>
                    <span className="text-[11px] text-muted">Owner: {nodeOwnerLabel}</span>
                    {activeTeamRoleLabel ? (
                      <span className="text-[11px] text-muted">Role: {activeTeamRoleLabel}</span>
                    ) : null}
                    {canManageNodeSharing && nodeTeamName ? (
                      <span className="truncate text-[11px] text-muted">Team: {nodeTeamName}</span>
                    ) : null}
                  </div>
                </div>
                <ShieldCheck className="mt-0.5 size-4 text-muted" />
              </div>

              {canManageNodeSharing ? (
                <div className="mt-2.5 flex items-center gap-2">
                  <select
                    value={nodeShareTeamId}
                    className="h-8 w-full rounded-xl border border-muted/40 bg-default px-2.5 text-xs"
                    disabled={teams.length === 0}
                    onChange={(event) => onNodeShareTeamIdChange(event.target.value)}
                  >
                    <option value="" disabled>
                      Select team
                    </option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.role})
                      </option>
                    ))}
                  </select>
                  <Button
                    size="sm"
                    disabled={isShareTogglePending || (!isNodeSharedWithTeam && !nodeShareTeamId)}
                    onClick={() => (isNodeSharedWithTeam ? onUnshareNode() : onShareNode())}
                  >
                    {isNodeSharedWithTeam ? "Unshare" : "Share"}
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mb-8 space-y-1">
            <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-muted/60">Workspaces</p>
            {node.tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={cn(
                  "group flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all",
                  tab.id === activeTabId
                    ? "bg-primary/10 text-primary shadow-sm ring-1 ring-primary/20"
                    : "text-toned hover:bg-elevated/50 hover:text-highlighted",
                )}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.id === activeTabId ? <FolderOpen className="size-4.5" /> : <Folder className="size-4.5" />}
                <span className="flex-1 truncate text-left">{getDisplayTabTitle(tab)}</span>
              </button>
            ))}
            <button
              type="button"
              className="mt-2 flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium text-muted hover:bg-elevated/50"
              onClick={() => openTabEditor("create")}
            >
              <Plus className="size-4.5" />
              Add workspace
            </button>
          </div>

          <div className="mt-auto space-y-1">
            <Button variant="ghost" className="w-full justify-start rounded-2xl" onClick={() => void saveActiveTabToMarketplace()}>
              <Store className="size-4" />
              Share template
            </Button>
            <Button variant="ghost" className="w-full justify-start rounded-2xl" onClick={() => openTabEditor("rename")}>
              <Pencil className="size-4" />
              Rename
            </Button>
            <Button variant="ghost" className="w-full justify-start rounded-2xl hover:text-error" onClick={() => deleteActiveTab()}>
              <Trash2 className="size-4" />
              Delete
            </Button>
          </div>
        </div>
      </aside>

      <main className="relative flex flex-1 flex-col overflow-hidden bg-elevated/5">
        <header className="flex min-h-16 shrink-0 items-center justify-between gap-4 border-b border-muted/20 bg-default/40 px-4 py-4 backdrop-blur-md sm:px-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen((open) => !open)}>
              {isSidebarOpen ? <PanelLeftClose className="size-4" /> : <PanelLeftOpen className="size-4" />}
            </Button>
            <div>
              <p className="text-sm font-semibold text-highlighted">{getDisplayTabTitle(activeTab)}</p>
              <p className="text-xs text-muted">{visibleBlocks.length} blocks</p>
            </div>
          </div>
          <Button disabled={!canEditNodeContent} onClick={() => setAddBlockLauncherOpen((open) => !open)}>
            <Blocks className="size-4" />
            Add block
          </Button>
        </header>

        {addBlockLauncherOpen ? (
          <div className="border-b border-default bg-default/80 px-4 py-4 sm:px-6">
            <Input
              value={launcherSearch}
              placeholder="Search blocks"
              className="mb-3"
              onChange={(event) => setLauncherSearch(event.target.value)}
            />
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {workspacePrimaryBlockTypes.map((type) => {
                const entry = getWorkspaceBlockRegistryEntry(type);
                const Icon = entry.icon;
                return (
                  <button
                    key={type}
                    type="button"
                    className="flex items-center gap-2 rounded-xl border border-muted/60 px-3 py-2 text-left hover:border-primary/30"
                    onClick={() => {
                      addBlockToActiveTab(type);
                      setAddBlockLauncherOpen(false);
                    }}
                  >
                    <Icon className="size-4" />
                    {entry.label}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {workspaceBlockPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className="rounded-xl border border-muted/60 px-3 py-2 text-left hover:border-primary/30"
                  onClick={() => {
                    addBlockPresetToActiveTab(preset.id as WorkspaceBlockPresetId);
                    setAddBlockLauncherOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2 text-sm font-semibold">
                    <LayoutTemplate className="size-4" />
                    {preset.label}
                  </div>
                  <p className="mt-1 text-xs text-muted">{preset.description}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-6 sm:px-8">
          {saveError ? (
            <div className="mb-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {saveError}
            </div>
          ) : null}

          <div className="mx-auto flex max-w-5xl flex-col gap-6">
            {visibleBlocks.map((block) => (
              <WorkspaceNodeBlockRenderer key={block.id} block={block} tabId={activeTabId} />
            ))}
            {visibleBlocks.length === 0 ? (
              <div className="rounded-[32px] border border-dashed border-muted/40 px-6 py-16 text-center text-sm text-muted">
                No blocks in this workspace yet. Add one from the toolbar.
              </div>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
}
