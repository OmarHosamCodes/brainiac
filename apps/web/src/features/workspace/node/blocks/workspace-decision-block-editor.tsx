import { getDecisionSummary, type WorkspaceDecisionBlock } from "@orch/workspace";
import { Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { ProsConsWeightButtons } from "@/features/workspace/node/blocks/shared/pros-cons-helpers";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

function decisionSignalLabel(signal: "lean-yes" | "lean-no" | "balanced") {
  switch (signal) {
    case "lean-yes":
      return "Lean yes";
    case "lean-no":
      return "Lean no";
    case "balanced":
      return "Balanced";
    default: {
      const exhaustive: never = signal;
      return exhaustive;
    }
  }
}

export function WorkspaceDecisionBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceDecisionBlock>) {
  const { addDecisionItem, mutateDecisionItem, removeDecisionItem, mutateTypedBlock } =
    useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getDecisionSummary(block), [block]);

  function updateDecisionItemText(list: "pros" | "cons", itemId: string, value: string) {
    mutateDecisionItem(tabId, block.id, itemId, list, (entry) => {
      entry.text = value.slice(0, 240);
    });
  }

  function updateDecisionItemWeight(list: "pros" | "cons", itemId: string, weight: number) {
    mutateDecisionItem(tabId, block.id, itemId, list, (entry) => {
      entry.weight = Math.min(5, Math.max(1, Math.round(weight)));
    });
  }

  function renderList(list: "pros" | "cons", title: string, placeholder: string) {
    const items = block[list];

    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold">{title}</h3>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full"
            aria-label={list === "pros" ? "Add pro point" : "Add con point"}
            onClick={() => addDecisionItem(tabId, block.id, list)}
          >
            <Plus />
            Add point
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {list === "pros" ? "No pros yet." : "No cons yet."}
          </p>
        ) : null}

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="space-y-3 rounded-xl border border-muted p-3">
              <div className="flex items-start gap-3">
                <Input
                  value={item.text}
                  placeholder={placeholder}
                  className="flex-1 border-0 bg-transparent px-2 py-1 text-sm font-medium shadow-none focus-visible:ring-0"
                  onChange={(event) => updateDecisionItemText(list, item.id, event.target.value)}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-full hover:text-destructive"
                  aria-label={list === "pros" ? "Remove pro point" : "Remove con point"}
                  onClick={() => removeDecisionItem(tabId, block.id, item.id, list)}
                >
                  <Trash2 />
                </Button>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                <p className="text-xs text-muted-foreground">Weight</p>
                <ProsConsWeightButtons
                  list={list}
                  currentWeight={item.weight}
                  onWeightChange={(weight) => updateDecisionItemWeight(list, item.id, weight)}
                />
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">Signal</p>
        <p
          className={cn(
            "text-sm font-semibold",
            summary.signal === "lean-no" && "text-destructive",
          )}
        >
          {decisionSignalLabel(summary.signal)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderList("pros", "Pros", "Add a pro point...")}
        {renderList("cons", "Cons", "Add a con point...")}
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">Recommendation</p>
        <Textarea
          value={block.recommendation}
          placeholder="Based on the pros and cons above, my recommendation is..."
          className="min-h-[100px] resize-y rounded-xl"
          onChange={(event) =>
            mutateTypedBlock(tabId, block.id, "decision", (entry) => {
              entry.recommendation = event.target.value;
            })
          }
        />
      </div>
    </div>
  );
}
