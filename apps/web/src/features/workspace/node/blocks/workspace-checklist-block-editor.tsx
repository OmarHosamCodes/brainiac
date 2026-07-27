import {
  createWorkspaceChecklistItem,
  getChecklistProgress,
  type WorkspaceChecklistBlock,
} from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import { cn } from "@/lib/utils";
import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { BlockCheckbox } from "@/features/workspace/node/blocks/shared/block-checkbox";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";

export function WorkspaceChecklistBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceChecklistBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const progress = useMemo(() => getChecklistProgress(block), [block]);
  const openItemCount = Math.max(progress.total - progress.completed, 0);

  function mutateChecklistItem(
    itemId: string,
    mutator: (item: WorkspaceChecklistBlock["items"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "checklist", (entry) => {
      const target = entry.items.find((candidate) => candidate.id === itemId);
      if (!target) {
        return;
      }
      mutator(target);
    });
  }

  function addItem() {
    mutateTypedBlock(tabId, block.id, "checklist", (entry) => {
      entry.items.push(createWorkspaceChecklistItem({ text: "" }));
    });
  }

  return (
    <div className="space-y-6">
      <div className="space-y-4 rounded-3xl border border-muted bg-muted p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
              <span className="text-lg font-black tracking-tight">{progress.percent}%</span>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  Completion
                </p>
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
                  {progress.completed}/{progress.total}
                </p>
              </div>
              <BlockProgressBar value={progress.completed} max={Math.max(progress.total, 1)} />
            </div>
          </div>

          <Button
            type="button"
            variant="secondary"
            className="rounded-full px-4"
            aria-label="Add checklist item"
            onClick={addItem}
          >
            <Plus />
            Add Item
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-2xl">
            {progress.completed} completed
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {openItemCount} open
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {progress.total} total
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {block.items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 rounded-2xl border border-muted bg-background p-3 transition-all hover:border-primary/40 hover:bg-background"
          >
            <BlockCheckbox
              checked={item.completed}
              aria-label={
                item.completed ? "Mark checklist item as open" : "Mark checklist item as complete"
              }
              onCheckedChange={(checked) =>
                mutateChecklistItem(item.id, (entry) => {
                  entry.completed = checked;
                })
              }
            />

            <Input
              value={item.text}
              placeholder="Checklist item"
              className={cn(
                "flex-1 border-0 bg-transparent px-0 font-medium shadow-none focus-visible:ring-0",
                item.completed ? "text-toned line-through" : "text-foreground",
              )}
              onChange={(event) =>
                mutateChecklistItem(item.id, (entry) => {
                  entry.text = event.target.value.slice(0, 240);
                })
              }
            />

            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-lg text-toned hover:text-destructive"
              aria-label="Delete checklist item"
              onClick={() =>
                mutateTypedBlock(tabId, block.id, "checklist", (entry) => {
                  entry.items = entry.items.filter((candidate) => candidate.id !== item.id);
                })
              }
            >
              <Trash2 />
            </Button>
          </div>
        ))}

        {block.items.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-muted bg-background py-12 text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-toned">
              No checklist items yet
            </p>
            <p className="mt-2 text-sm text-toned">
              Add the first item to start tracking completion.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
