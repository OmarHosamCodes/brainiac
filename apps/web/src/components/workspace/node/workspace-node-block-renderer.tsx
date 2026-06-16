import type { WorkspaceBlock } from "@brainiac/workspace";
import { Loader2, Plus, Search, Store, Trash2 } from "lucide-react";
import { Suspense } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { getWorkspaceBlockRegistryEntry } from "@/lib/utils/workspace-block-registry";

type WorkspaceNodeBlockRendererProps = {
  block: WorkspaceBlock;
  tabId: string;
};

function BlockEditorFallback() {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-dashed border-muted/40 px-4 py-6 text-sm text-muted">
      <Loader2 className="size-4 animate-spin" />
      Loading block editor…
    </div>
  );
}

export function WorkspaceNodeBlockRenderer({ block, tabId }: WorkspaceNodeBlockRendererProps) {
  const {
    normalizedBlockSearch,
    getBlockSearchMatches,
    highlightSearchMatch,
    updateBlockTitle,
    toggleAgentContextBlock,
    isAgentContextBlock,
    saveBlockToMarketplace,
    removeBlock,
    getBlockOperationState,
  } = useWorkspaceNodeEditorContext();

  const registryEntry = getWorkspaceBlockRegistryEntry(block.type);
  const EditorComponent = registryEntry.component;
  const Icon = registryEntry.icon;
  const isContextBlock = isAgentContextBlock(tabId, block.id);
  const operationState = getBlockOperationState(tabId, block.id);
  const searchMatches = getBlockSearchMatches(block);

  return (
    <div className="group relative flex flex-col gap-5 rounded-[32px] border border-muted/40 bg-background/50 p-6 transition-all duration-300 hover:border-primary/30 hover:bg-background/80 hover:shadow-xl hover:shadow-black/5 focus-within:border-primary/30 focus-within:bg-background/80 focus-within:shadow-xl focus-within:shadow-black/5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-muted/60 bg-elevated/50 text-toned transition-colors group-hover:border-primary/40 group-hover:text-primary">
            <Icon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <Input
              value={block.title}
              placeholder="Untitled block"
              className="h-auto border-0 bg-transparent px-0 text-xl font-bold tracking-tight shadow-none focus-visible:ring-0"
              onChange={(event) => updateBlockTitle(tabId, block.id, event.target.value)}
            />
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/80">
              {registryEntry.label}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2">
          {operationState.pending ? (
            <Badge variant="secondary" className="rounded-full">
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
              {operationState.label || "Working"}
            </Badge>
          ) : null}

          <Button
            type="button"
            variant={isContextBlock ? "secondary" : "ghost"}
            size="sm"
            className="rounded-xl"
            onClick={() => toggleAgentContextBlock(tabId, block.id)}
          >
            {isContextBlock ? "In AI context" : "Add to AI context"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl"
            aria-label="Save block to marketplace"
            onClick={() => void saveBlockToMarketplace(block)}
          >
            <Store className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="rounded-xl hover:bg-error/10 hover:text-error"
            aria-label="Delete block"
            onClick={() => removeBlock(tabId, block.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      {normalizedBlockSearch && searchMatches.length > 0 ? (
        <div className="space-y-2 rounded-2xl border border-warning/40 bg-warning/5 p-4">
          <div className="flex items-center gap-2 text-warning">
            <Search className="size-4" />
            <p className="text-xs font-bold uppercase tracking-wider">Search matches</p>
          </div>
          <div className="space-y-1.5">
            {searchMatches.map((match, index) => (
              <p
                key={`${block.id}-match-${index}`}
                className="text-sm leading-relaxed text-toned"
                dangerouslySetInnerHTML={{ __html: highlightSearchMatch(match) }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="relative min-h-[50px]">
        <Suspense fallback={<BlockEditorFallback />}>
          <EditorComponent block={block} tabId={tabId} />
        </Suspense>
      </div>

      {!normalizedBlockSearch ? (
        <div className="pointer-events-none absolute inset-x-6 bottom-6 opacity-0 transition-opacity group-hover:opacity-100">
          <div className="flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="pointer-events-auto rounded-full">
              <Plus className="size-4" />
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
