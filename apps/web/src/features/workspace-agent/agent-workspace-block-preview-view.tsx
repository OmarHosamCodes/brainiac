import type { AiUiArtifact } from "@orch/agent/types";
import type { WorkspaceBlock, WorkspaceNode } from "@orch/workspace";
import { Suspense } from "react";

import {
  WorkspaceNodeEditorProvider,
  type WorkspaceNodeEditorContextValue,
} from "@/features/workspace/node/context";
import { getWorkspaceBlockRegistryEntry } from "@/features/workspace/utils/workspace-block-registry";

const previewEditorContext = new Proxy({} as WorkspaceNodeEditorContextValue, {
  get(_target, prop) {
    if (prop === "currentNode") return null;
    if (prop === "blockSearch" || prop === "normalizedBlockSearch") return "";
    if (prop === "priorityOptions" || prop === "domainOptions") return [];
    if (prop === "tabEditor") return { open: false, mode: "create", title: "" };
    if (prop === "isAgentContextBlock") return () => false;
    if (prop === "getBlockOperationState") return () => ({ pending: false, label: null });
    if (prop === "getBlockSearchMatches") return () => [];
    if (prop === "getTimeOrchestratorSummaryForBlock") return () => null;
    return () => undefined;
  },
});

function WorkspaceBlockPreviewBody({ block, tabId }: { block: WorkspaceBlock; tabId: string }) {
  try {
    const entry = getWorkspaceBlockRegistryEntry(block.type);
    const Editor = entry.component;
    return (
      <div className="pointer-events-none select-none">
        <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
          <entry.icon className="size-3.5" aria-hidden />
          {entry.label}
        </div>
        <Suspense
          fallback={<p className="text-sm text-muted-foreground">Loading block preview…</p>}
        >
          <Editor block={block} tabId={tabId} />
        </Suspense>
      </div>
    );
  } catch {
    return (
      <pre className="max-h-64 overflow-auto text-[11px] leading-snug whitespace-pre-wrap text-foreground/80">
        {JSON.stringify(block, null, 2)}
      </pre>
    );
  }
}

function previewFromArtifact(artifact: AiUiArtifact) {
  if (artifact.kind === "workspaceBlock") {
    return {
      block: artifact.block as WorkspaceBlock,
      tabId: artifact.tabId ?? "preview-tab",
      node: null as WorkspaceNode | null,
    };
  }
  if (artifact.kind === "workspaceNode") {
    const node = artifact.node as WorkspaceNode;
    const tab = node.tabs[0];
    return {
      block: tab?.blocks[0] ?? null,
      tabId: tab?.id ?? "preview-tab",
      node,
    };
  }
  return null;
}

export function AgentWorkspaceArtifactPreviewView({ artifact }: { artifact: AiUiArtifact }) {
  const preview = previewFromArtifact(artifact);

  if (!preview) return null;

  return (
    <WorkspaceNodeEditorProvider value={previewEditorContext}>
      {preview.node ? (
        <div className="mb-3 rounded-lg border border-border bg-muted/30 px-3 py-2">
          <p className="text-sm font-semibold tracking-tight">{preview.node.title}</p>
          <p className="text-xs text-muted-foreground">
            {preview.node.tabs.length} tab{preview.node.tabs.length === 1 ? "" : "s"}
            {preview.node.visibility === "team" ? " · Team shared" : ""}
          </p>
        </div>
      ) : null}
      {preview.block ? (
        <WorkspaceBlockPreviewBody block={preview.block} tabId={preview.tabId} />
      ) : (
        <p className="text-sm text-muted-foreground">Empty node preview.</p>
      )}
    </WorkspaceNodeEditorProvider>
  );
}
