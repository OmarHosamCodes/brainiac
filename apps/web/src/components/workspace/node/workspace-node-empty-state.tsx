import type { WorkspaceBlock } from "@brainiac/workspace";
import { Blocks } from "lucide-react";

import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Button } from "@/components/ui/button";
import { getWorkspaceBlockRegistryEntry, workspacePrimaryBlockTypes } from "@/lib/utils/workspace-block-registry";
import type { WorkspaceAddBlockCommandView } from "@/components/workspace/node/workspace-add-block-command";

type WorkspaceNodeEmptyStateProps = {
  canEdit: boolean;
  onQuickAdd: (type: WorkspaceBlock["type"], blockId: string | null) => void;
  onBrowseAll: (view: WorkspaceAddBlockCommandView) => void;
};

export function WorkspaceNodeEmptyState({
  canEdit,
  onQuickAdd,
  onBrowseAll,
}: WorkspaceNodeEmptyStateProps) {
  const { addBlockToActiveTab } = useWorkspaceNodeEditorContext();

  if (!canEdit) {
    return (
      <div className="rounded-2xl border border-dashed border-muted/40 px-6 py-16 text-center text-sm text-muted-foreground">
        This workspace has no blocks yet.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-dashed border-muted/40 px-6 py-12 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-muted/50 bg-muted/20 text-toned">
        <Blocks className="size-5" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-highlighted">Start this workspace</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Add a block to capture tasks, notes, or decisions. You can always add more from the full catalog.
      </p>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        {workspacePrimaryBlockTypes.map((type) => {
          const entry = getWorkspaceBlockRegistryEntry(type);
          const Icon = entry.icon;

          return (
            <Button
              key={type}
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={() => {
                const blockId = addBlockToActiveTab(type);
                onQuickAdd(type, blockId);
              }}
            >
              <Icon className="size-4" />
              {entry.label}
            </Button>
          );
        })}
      </div>

      <Button type="button" variant="ghost" size="sm" className="mt-4" onClick={() => onBrowseAll("browse")}>
        Browse all blocks
      </Button>
    </div>
  );
}
