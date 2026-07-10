import { getDecisionSummary, type WorkspaceDecisionBlock } from "@orch/workspace";
import { CheckCircle2, MinusCircle, Plus, PlusCircle, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import {
  ProsConsBalanceBar,
  ProsConsWeightButtons,
} from "@/features/workspace/node/blocks/shared/pros-cons-helpers";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";

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

  return (
    <div className="space-y-8">
      <div className="space-y-5 rounded-3xl border border-muted/20 bg-muted/10 p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-2xl">
            {block.pros.length} pros
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {block.cons.length} cons
          </Badge>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">
              Pros Weight
            </p>
            <p className="text-2xl font-black tracking-tight text-success sm:text-3xl">
              {summary.prosWeight}
            </p>
          </div>

          <div className="flex-1 px-4 sm:px-8">
            <ProsConsBalanceBar prosWeight={summary.prosWeight} consWeight={summary.consWeight} />
            <div className="mt-4 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                Current Signal
              </p>
              <p className="text-lg font-black uppercase tracking-tight text-foreground">
                {summary.signal}
              </p>
            </div>
          </div>

          <div className="text-center">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive/70">
              Cons Weight
            </p>
            <p className="text-2xl font-black tracking-tight text-destructive sm:text-3xl">
              {summary.consWeight}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-success">
              <PlusCircle className="size-5" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/80">
                Pros
              </h3>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              aria-label="Add pro point"
              onClick={() => addDecisionItem(tabId, block.id, "pros")}
            >
              <Plus />
              Add Point
            </Button>
          </div>

          {block.pros.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No pros added yet.</p>
            </div>
          ) : null}

          <div className="space-y-2">
            {block.pros.map((item) => (
              <div
                key={item.id}
                className="group space-y-3 rounded-2xl border border-success/20 bg-background/40 p-3 transition-all hover:bg-background/60"
              >
                <div className="flex items-start gap-3">
                  <Input
                    value={item.text}
                    placeholder="Add a pro point..."
                    className="flex-1 border-0 bg-transparent px-2 py-1 text-sm font-medium shadow-none focus-visible:ring-0"
                    onChange={(event) =>
                      updateDecisionItemText("pros", item.id, event.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:text-destructive"
                    aria-label="Remove pro point"
                    onClick={() => removeDecisionItem(tabId, block.id, item.id, "pros")}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">
                    Weight
                  </p>
                  <ProsConsWeightButtons
                    list="pros"
                    currentWeight={item.weight}
                    onWeightChange={(weight) => updateDecisionItemWeight("pros", item.id, weight)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2 text-destructive">
              <MinusCircle className="size-5" />
              <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive/80">
                Cons
              </h3>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              aria-label="Add con point"
              onClick={() => addDecisionItem(tabId, block.id, "cons")}
            >
              <Plus />
              Add Point
            </Button>
          </div>

          {block.cons.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
              <p className="text-sm font-semibold text-muted-foreground">No cons added yet.</p>
            </div>
          ) : null}

          <div className="space-y-2">
            {block.cons.map((item) => (
              <div
                key={item.id}
                className="group space-y-3 rounded-2xl border border-destructive/20 bg-background/40 p-3 transition-all hover:bg-background/60"
              >
                <div className="flex items-start gap-3">
                  <Input
                    value={item.text}
                    placeholder="Add a con point..."
                    className="flex-1 border-0 bg-transparent px-2 py-1 text-sm font-medium shadow-none focus-visible:ring-0"
                    onChange={(event) =>
                      updateDecisionItemText("cons", item.id, event.target.value)
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="rounded-lg hover:text-destructive"
                    aria-label="Remove con point"
                    onClick={() => removeDecisionItem(tabId, block.id, item.id, "cons")}
                  >
                    <Trash2 />
                  </Button>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 px-2">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive/70">
                    Weight
                  </p>
                  <ProsConsWeightButtons
                    list="cons"
                    currentWeight={item.weight}
                    onWeightChange={(weight) => updateDecisionItemWeight("cons", item.id, weight)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-3xl border border-primary/20 bg-primary/5 p-6">
        <div className="flex items-center gap-2 text-primary">
          <CheckCircle2 className="size-5" />
          <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            Final Recommendation
          </h3>
        </div>
        <Textarea
          value={block.recommendation}
          placeholder="Based on the pros and cons above, my recommendation is..."
          className="min-h-[100px] resize-y border-0 bg-transparent p-0 text-base font-medium shadow-none focus-visible:ring-0"
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
