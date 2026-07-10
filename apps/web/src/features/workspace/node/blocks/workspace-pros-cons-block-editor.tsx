import {
  createWorkspaceProsConsItem,
  getProsConsSummary,
  type WorkspaceProsConsBlock,
} from "@orch/workspace";
import { MinusCircle, Plus, PlusCircle, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";

export function WorkspaceProsConsBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceProsConsBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getProsConsSummary(block), [block]);

  const verdictLabel =
    summary.verdict === "do-it" ? "DO IT" : summary.verdict === "dont" ? "DON'T" : "TIE";

  const verdictClass =
    summary.verdict === "do-it"
      ? "border-success/30 bg-success/10 text-success"
      : summary.verdict === "dont"
        ? "border-destructive/30 bg-destructive/10 text-destructive"
        : "border-warning/30 bg-warning/10 text-warning";

  function addItem(list: "pros" | "cons") {
    mutateTypedBlock(tabId, block.id, "pros-cons", (entry) => {
      entry[list].push(createWorkspaceProsConsItem({ text: "" }));
    });
  }

  function updateItemText(list: "pros" | "cons", itemId: string, value: string) {
    mutateTypedBlock(tabId, block.id, "pros-cons", (entry) => {
      const target = entry[list].find((candidate) => candidate.id === itemId);
      if (target) {
        target.text = value.slice(0, 240);
      }
    });
  }

  function updateItemWeight(list: "pros" | "cons", itemId: string, weight: number) {
    mutateTypedBlock(tabId, block.id, "pros-cons", (entry) => {
      const target = entry[list].find((candidate) => candidate.id === itemId);
      if (target) {
        target.weight = Math.min(5, Math.max(1, Math.round(weight)));
      }
    });
  }

  function removeItem(list: "pros" | "cons", itemId: string) {
    mutateTypedBlock(tabId, block.id, "pros-cons", (entry) => {
      entry[list] = entry[list].filter((candidate) => candidate.id !== itemId);
    });
  }

  function renderList(list: "pros" | "cons", title: string, placeholder: string) {
    const items = block[list];
    const isPros = list === "pros";

    return (
      <section className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <div
            className={cn("flex items-center gap-2", isPros ? "text-success" : "text-destructive")}
          >
            {isPros ? <PlusCircle className="size-5" /> : <MinusCircle className="size-5" />}
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              {title}
            </h3>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            onClick={() => addItem(list)}
          >
            <Plus />
            Add Point
          </Button>
        </div>

        {items.map((item) => (
          <div
            key={item.id}
            className="group space-y-3 rounded-2xl border border-muted/20 bg-background/40 p-3 transition-all hover:bg-background/60"
          >
            <div className="flex items-start gap-3">
              <Input
                value={item.text}
                placeholder={placeholder}
                className="flex-1 border-0 bg-transparent px-0 text-sm font-semibold text-foreground shadow-none focus-visible:ring-0"
                onChange={(event) => updateItemText(list, item.id, event.target.value)}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg hover:text-destructive"
                aria-label={`Remove ${list === "pros" ? "pro" : "con"} point`}
                onClick={() => removeItem(list, item.id)}
              >
                <Trash2 />
              </Button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p
                className={cn(
                  "text-[10px] font-bold uppercase tracking-[0.2em]",
                  isPros ? "text-success/70" : "text-destructive/70",
                )}
              >
                Weight
              </p>
              <ProsConsWeightButtons
                list={list}
                currentWeight={item.weight}
                onWeightChange={(weight) => updateItemWeight(list, item.id, weight)}
              />
            </div>
          </div>
        ))}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <div className={cn("space-y-5 rounded-3xl border p-6 transition-colors", verdictClass)}>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-2xl">
            {block.pros.length} pros
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {block.cons.length} cons
          </Badge>
          <Badge variant="success" className="rounded-2xl">
            {summary.prosWeight} pro weight
          </Badge>
          <Badge variant="destructive" className="rounded-2xl">
            {summary.consWeight} con weight
          </Badge>
        </div>

        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Verdict</p>
            <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">{verdictLabel}</p>
          </div>
          <div className="flex-1 px-4 sm:px-8">
            <ProsConsBalanceBar prosWeight={summary.prosWeight} consWeight={summary.consWeight} />
            <div className="mt-4 text-center">
              <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
                Score Delta
              </p>
              <p className="text-lg font-black tracking-tight">
                {summary.totalScore > 0 ? "+" : ""}
                {summary.totalScore}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">
              Current Signal
            </p>
            <p className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
              {summary.verdict === "tie" ? "Balanced" : verdictLabel}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Pro score</p>
            <p className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
              {summary.prosWeight}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-70">Con score</p>
            <p className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
              {summary.consWeight}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {renderList("pros", "Pros", "Add a reason in favor...")}
        {renderList("cons", "Cons", "Add a risk or downside...")}
      </div>
    </div>
  );
}
