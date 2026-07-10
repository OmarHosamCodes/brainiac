import { assertNever } from "@orch/config/assert-never";
import {
  WORKSPACE_NODE_LIMIT,
  createDefaultWorkspaceTab,
  createWorkspaceNode,
  normalizeWorkspaceNode,
  type WorkspaceMarketplaceItem,
  type WorkspaceNode,
} from "@orch/workspace";
import { Box, Check, Component, Download, HelpCircle, Info, Layout, Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import {
  cloneMarketplaceBlockPayload,
  cloneMarketplaceNodePayloadAsNode,
  cloneMarketplaceTabPayload,
  getMarketplacePayloadSummary,
  getMarketplacePayloadTypeLabel,
} from "@/features/workspace/utils/workspace-marketplace";
import { useWorkspaceQuery } from "@/features/workspace/hooks/use-workspace-query";
import { cn } from "@/lib/utils";

function kindIcon(kind: WorkspaceMarketplaceItem["payload"]["kind"] | null) {
  switch (kind) {
    case "node":
      return Box;
    case "tab":
      return Layout;
    case "block":
      return Component;
    case null:
      return HelpCircle;
    default:
      return assertNever(kind);
  }
}

function kindIconClass(kind: WorkspaceMarketplaceItem["payload"]["kind"] | null) {
  switch (kind) {
    case "node":
      return "bg-primary/10 text-primary";
    case "tab":
      return "bg-success/10 text-success";
    case "block":
      return "bg-warning/10 text-warning";
    case null:
      return "bg-muted text-muted";
    default:
      return assertNever(kind);
  }
}

function kindBadgeVariant(kind: WorkspaceMarketplaceItem["payload"]["kind"] | null) {
  switch (kind) {
    case "node":
      return "default" as const;
    case "tab":
      return "success" as const;
    case "block":
      return "warning" as const;
    case null:
      return "secondary" as const;
    default:
      return assertNever(kind);
  }
}

export function MarketplaceImportModal({
  open,
  item,
  nodes,
  selectedNodeIds,
  onOpenChange,
  onImported,
}: {
  open: boolean;
  item: WorkspaceMarketplaceItem | null;
  nodes: WorkspaceNode[];
  selectedNodeIds: string[];
  onOpenChange: (open: boolean) => void;
  onImported: (payload: { kind: "node" | "tab" | "block"; nodeId?: string }) => void;
}) {
  const { updateNodes } = useWorkspaceQuery();

  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [selectedTabId, setSelectedTabId] = useState("");
  const [creatingNode, setCreatingNode] = useState(false);
  const [creatingTab, setCreatingTab] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState("");
  const [newTabTitle, setNewTabTitle] = useState("");

  const kind = item?.payload.kind ?? null;
  const Icon = kindIcon(kind);

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) ?? null,
    [nodes, selectedNodeId],
  );

  const modalTitle =
    kind === "node"
      ? "Add node to dashboard"
      : kind === "tab"
        ? "Choose a destination node"
        : kind === "block"
          ? "Choose a destination"
          : "";

  const payloadSummary = item ? getMarketplacePayloadSummary(item.payload) : "";
  const payloadLabel = item ? getMarketplacePayloadTypeLabel(item.payload) : "";

  const canSubmit =
    Boolean(item) &&
    (kind === "node" ||
      (kind === "tab" && selectedNodeId) ||
      (kind === "block" && selectedNodeId && selectedTabId));

  function reset() {
    setSelectedNodeId("");
    setSelectedTabId("");
    setCreatingNode(false);
    setCreatingTab(false);
    setNewNodeTitle("");
    setNewTabTitle("");
  }

  function close() {
    onOpenChange(false);
    reset();
  }

  function syncTab(nodeId: string) {
    if (kind !== "block") {
      setSelectedTabId("");
      return;
    }

    const node = nodes.find((entry) => entry.id === nodeId);
    const tabs = node?.tabs ?? [];
    setSelectedTabId((current) =>
      tabs.some((tab) => tab.id === current) ? current : (tabs[0]?.id ?? ""),
    );
  }

  function initDefaults() {
    if (!item || kind === "node") return;

    const preferredNodeId =
      selectedNodeIds.find((id) => nodes.some((node) => node.id === id)) ?? nodes[0]?.id ?? "";

    setSelectedNodeId(preferredNodeId);
    syncTab(preferredNodeId);
  }

  useEffect(() => {
    if (open) {
      initDefaults();
    }
  }, [open, item?.id]);

  useEffect(() => {
    if (selectedNodeId) {
      setCreatingTab(false);
      setNewTabTitle("");
      syncTab(selectedNodeId);
    }
  }, [selectedNodeId, kind, nodes]);

  function mutateNodes(mutator: (draftNodes: WorkspaceNode[]) => void) {
    updateNodes(mutator);
  }

  function createNewNode() {
    const title = newNodeTitle.trim() || "New node";

    if (nodes.length >= WORKSPACE_NODE_LIMIT) {
      toast.warning("Node limit reached", {
        description: `A workspace can store up to ${WORKSPACE_NODE_LIMIT} nodes.`,
      });
      return;
    }

    const anchorNode = nodes[nodes.length - 1];
    const node = createWorkspaceNode({
      title,
      x: (anchorNode?.x ?? 0) + 56,
      y: (anchorNode?.y ?? 0) + 56,
    });

    mutateNodes((draftNodes) => {
      draftNodes.push(node);
    });

    setSelectedNodeId(node.id);
    setCreatingNode(false);
    setNewNodeTitle("");
    syncTab(node.id);

    toast.success("Node created", { description: `"${title}" was added to your workspace.` });
  }

  function createNewTab() {
    const title = newTabTitle.trim() || "New tab";
    if (!selectedNodeId) return;

    const tab = createDefaultWorkspaceTab(title);
    let created = false;

    mutateNodes((draftNodes) => {
      const nodeIndex = draftNodes.findIndex((entry) => entry.id === selectedNodeId);
      if (nodeIndex < 0) return;

      const node = draftNodes[nodeIndex]!;
      node.tabs.push(tab);
      node.viewState.activeTabId = tab.id;
      node.updatedAt = new Date().toISOString();
      draftNodes[nodeIndex] = normalizeWorkspaceNode(node);
      created = true;
    });

    if (created) {
      setSelectedTabId(tab.id);
      setCreatingTab(false);
      setNewTabTitle("");
      toast.success("Tab created", { description: `"${title}" was added to the node.` });
    }
  }

  function insertNode() {
    if (!item) return;

    if (nodes.length >= WORKSPACE_NODE_LIMIT) {
      toast.warning("Node limit reached", {
        description: `A workspace can store up to ${WORKSPACE_NODE_LIMIT} nodes.`,
      });
      return;
    }

    const nextNode = cloneMarketplaceNodePayloadAsNode(item.payload);
    const anchorNode = nodes[nodes.length - 1];
    nextNode.x = (anchorNode?.x ?? 0) + 56;
    nextNode.y = (anchorNode?.y ?? 0) + 56;

    mutateNodes((draftNodes) => {
      draftNodes.push(nextNode);
    });

    toast.success("Node inserted", { description: `${item.title} was added to your dashboard.` });
    onImported({ kind: "node", nodeId: nextNode.id });
    close();
  }

  function insertTab() {
    if (!item) return;

    const imported = cloneMarketplaceTabPayload(item.payload);
    if (!imported) return;

    let inserted = false;
    let targetNodeTitle = "";

    mutateNodes((draftNodes) => {
      const nodeIndex = draftNodes.findIndex((entry) => entry.id === selectedNodeId);
      if (nodeIndex < 0) return;

      const timestamp = new Date().toISOString();
      const targetNode = draftNodes[nodeIndex]!;
      targetNode.tabs.push(imported.tab);
      targetNode.customBlockTemplates.push(...imported.templates);
      targetNodeTitle = targetNode.title.trim() || "Untitled node";
      targetNode.viewState.activeTabId = imported.tab.id;
      targetNode.updatedAt = timestamp;
      draftNodes[nodeIndex] = normalizeWorkspaceNode(targetNode);
      inserted = true;
    });

    if (!inserted) return;

    toast.success("Tab inserted", {
      description: `${item.title} was added to ${targetNodeTitle}.`,
    });
    onImported({ kind: "tab", nodeId: selectedNodeId });
    close();
  }

  function insertBlock() {
    if (!item) return;

    const imported = cloneMarketplaceBlockPayload(item.payload);
    if (!imported) return;

    let inserted = false;
    let targetTabTitle = "";

    mutateNodes((draftNodes) => {
      const nodeIndex = draftNodes.findIndex((entry) => entry.id === selectedNodeId);
      if (nodeIndex < 0) return;

      const timestamp = new Date().toISOString();
      const targetNode = draftNodes[nodeIndex]!;
      const targetTab = targetNode.tabs.find((tab) => tab.id === selectedTabId);
      if (!targetTab) return;

      targetNode.customBlockTemplates.push(...imported.templates);
      targetTab.blocks.push(imported.block);
      targetTab.updatedAt = timestamp;
      targetTabTitle = targetTab.title.trim() || "Untitled tab";
      targetNode.viewState.activeTabId = targetTab.id;
      targetNode.updatedAt = timestamp;
      draftNodes[nodeIndex] = normalizeWorkspaceNode(targetNode);
      inserted = true;
    });

    if (!inserted) return;

    toast.success("Block inserted", {
      description: `${item.title} was added to ${targetTabTitle}.`,
    });
    onImported({ kind: "block", nodeId: selectedNodeId });
    close();
  }

  function submit() {
    if (!item || !canSubmit) return;

    switch (kind) {
      case "node":
        insertNode();
        break;
      case "tab":
        insertTab();
        break;
      case "block":
        insertBlock();
        break;
      default:
        assertNever(kind);
    }
  }

  const selectClassName =
    "flex h-10 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/20";

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (nextOpen ? onOpenChange(true) : close())}>
      <DialogContent className="max-w-lg rounded-2xl p-0">
        <DialogHeader className="space-y-1 px-6 pt-6 text-left">
          <DialogTitle>{modalTitle}</DialogTitle>
          {item ? (
            <DialogDescription>{`Import "${item.title}" into your workspace.`}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-5 px-6 pb-2">
          <div className="rounded-2xl border border-muted/30 bg-elevated/20 p-4">
            <div className="flex items-center gap-2.5">
              <div className={cn("shrink-0 rounded-xl p-2", kindIconClass(kind))}>
                <Icon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold tracking-[0.18em] text-muted uppercase">
                  Importing {payloadLabel}
                </p>
                <p className="mt-0.5 truncate font-semibold text-highlighted">{item?.title}</p>
              </div>
              <Badge variant={kindBadgeVariant(kind)} className="shrink-0">
                {payloadSummary}
              </Badge>
            </div>
            {item?.summary ? <p className="mt-2 text-sm text-muted">{item.summary}</p> : null}
          </div>

          {kind === "node" ? (
            <div className="rounded-2xl border border-dashed border-muted/30 p-4">
              <div className="flex items-center gap-2 text-sm text-muted">
                <Info className="size-4 shrink-0" />
                <p>
                  This node will be added to your dashboard canvas, positioned near your last node.
                </p>
              </div>
            </div>
          ) : null}

          {kind === "tab" || kind === "block" ? (
            <div className="space-y-2">
              <Label htmlFor="destination-node">Destination node</Label>
              <div className="flex items-center gap-2">
                {!creatingNode ? (
                  <select
                    id="destination-node"
                    className={cn(selectClassName, "flex-1")}
                    value={selectedNodeId}
                    onChange={(event) => setSelectedNodeId(event.target.value)}
                  >
                    <option value="">Select a node...</option>
                    {nodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.title.trim() || "Untitled node"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={newNodeTitle}
                      placeholder="Node title..."
                      className="flex-1"
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === "Enter") createNewNode();
                        if (event.key === "Escape") setCreatingNode(false);
                      }}
                      onChange={(event) => setNewNodeTitle(event.target.value)}
                    />
                    <Button size="sm" disabled={!newNodeTitle.trim()} onClick={createNewNode}>
                      <Check className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCreatingNode(false)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
                {!creatingNode ? (
                  <Button variant="secondary" size="sm" onClick={() => setCreatingNode(true)}>
                    <Plus className="size-4" />
                    New node
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}

          {kind === "block" && selectedNodeId ? (
            <div className="space-y-2">
              <Label htmlFor="destination-tab">Destination tab</Label>
              <div className="flex items-center gap-2">
                {!creatingTab ? (
                  <select
                    id="destination-tab"
                    className={cn(selectClassName, "flex-1")}
                    value={selectedTabId}
                    onChange={(event) => setSelectedTabId(event.target.value)}
                  >
                    <option value="">Select a tab...</option>
                    {(selectedNode?.tabs ?? []).map((tab) => (
                      <option key={tab.id} value={tab.id}>
                        {tab.title.trim() || "Untitled tab"}
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="flex flex-1 items-center gap-2">
                    <Input
                      value={newTabTitle}
                      placeholder="Tab title..."
                      className="flex-1"
                      autoFocus
                      onKeyDown={(event) => {
                        if (event.key === "Enter") createNewTab();
                        if (event.key === "Escape") setCreatingTab(false);
                      }}
                      onChange={(event) => setNewTabTitle(event.target.value)}
                    />
                    <Button size="sm" disabled={!newTabTitle.trim()} onClick={createNewTab}>
                      <Check className="size-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setCreatingTab(false)}>
                      <X className="size-4" />
                    </Button>
                  </div>
                )}
                {!creatingTab ? (
                  <Button variant="secondary" size="sm" onClick={() => setCreatingTab(true)}>
                    <Plus className="size-4" />
                    New tab
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-3 border-t border-muted/20 bg-elevated/20 px-6 py-5 sm:justify-end">
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button disabled={!canSubmit} onClick={submit}>
            {kind === "node" ? <Plus className="size-4" /> : <Download className="size-4" />}
            {kind === "node" ? "Add to Dashboard" : "Import"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
