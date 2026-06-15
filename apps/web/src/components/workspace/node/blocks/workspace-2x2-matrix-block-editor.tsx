import {
  createWorkspace2x2MatrixItem,
  get2x2MatrixSummary,
  type Workspace2x2MatrixBlock,
} from "@brainiac/workspace";
import { Plus, SquareDashed, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const quadrants = [
  { key: "topLeft" as const, tone: "border-emerald-300/40 bg-emerald-500/5", accent: "text-emerald-500" },
  { key: "topRight" as const, tone: "border-sky-300/40 bg-sky-500/5", accent: "text-sky-500" },
  { key: "bottomLeft" as const, tone: "border-amber-300/40 bg-amber-500/5", accent: "text-amber-500" },
  { key: "bottomRight" as const, tone: "border-rose-300/40 bg-rose-500/5", accent: "text-rose-500" },
];

type MatrixField =
  | "xAxisLabel"
  | "yAxisLabel"
  | "xStartLabel"
  | "xEndLabel"
  | "yStartLabel"
  | "yEndLabel";

export function Workspace2x2MatrixBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<Workspace2x2MatrixBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => get2x2MatrixSummary(block), [block]);
  const averageItemsPerQuadrant = Number((summary.itemCount / 4).toFixed(1));

  function updateMatrixField(field: MatrixField, value: string, limit: number) {
    mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
      entry[field] = value.slice(0, limit);
    });
  }

  function updateQuadrantName(quadrantKey: (typeof quadrants)[number]["key"], value: string) {
    mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
      entry.quadrants[quadrantKey].name = value.slice(0, 80);
    });
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Decision Matrix
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare ideas across four quadrants with clearer axis labels and easier item management.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-2xl">
              {summary.itemCount} items
            </Badge>
            <Badge variant="secondary" className="rounded-2xl">
              {averageItemsPerQuadrant} avg / quadrant
            </Badge>
            <Badge variant="secondary" className="rounded-2xl">
              {block.xAxisLabel || "Horizontal axis"}
            </Badge>
            <Badge variant="secondary" className="rounded-2xl">
              {block.yAxisLabel || "Vertical axis"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Items", summary.itemCount, ""],
            ["Axis X", block.xAxisLabel, ""],
            ["Axis Y", block.yAxisLabel, "border-primary/20 bg-primary/10 text-primary"],
            ["Quadrants", 4, ""],
          ].map(([label, value, extra]) => (
            <div
              key={String(label)}
              className={cn(
                "rounded-3xl border border-muted/20 bg-muted/10 p-5",
                extra,
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                {label}
              </p>
              <p className="mt-1 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
                {value}
              </p>
            </div>
          ))}
        </div>

        <div className="grid gap-3 rounded-3xl border border-muted/20 bg-background/40 p-4 sm:grid-cols-2 lg:w-[360px]">
          {(
            [
              ["xAxisLabel", "Horizontal axis", 80],
              ["yAxisLabel", "Vertical axis", 80],
              ["xStartLabel", "X low", 60],
              ["xEndLabel", "X high", 60],
              ["yStartLabel", "Y low", 60],
              ["yEndLabel", "Y high", 60],
            ] as const
          ).map(([field, placeholder, limit]) => (
            <Input
              key={field}
              value={block[field]}
              placeholder={placeholder}
              className="rounded-2xl"
              aria-label={placeholder}
              onChange={(event) => updateMatrixField(field, event.target.value, limit)}
            />
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-muted/20 bg-background/40 p-4">
        <div className="mb-3 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          <span>{block.yEndLabel}</span>
          <span>{block.yAxisLabel}</span>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {quadrants.map((quadrant) => (
            <article
              key={quadrant.key}
              className={cn("rounded-2xl border p-4 transition-colors", quadrant.tone)}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <SquareDashed className={cn("size-4", quadrant.accent)} />
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      {block.quadrants[quadrant.key].items.length} items
                    </p>
                  </div>
                  <Input
                    value={block.quadrants[quadrant.key].name}
                    className="rounded-2xl"
                    aria-label={`Quadrant name for ${quadrant.key}`}
                    onChange={(event) => updateQuadrantName(quadrant.key, event.target.value)}
                  />
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="rounded-full"
                  aria-label={`Add item to ${block.quadrants[quadrant.key].name || "quadrant"}`}
                  onClick={() =>
                    mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
                      entry.quadrants[quadrant.key].items.push(createWorkspace2x2MatrixItem({ text: "" }));
                    })
                  }
                >
                  <Plus />
                  Add
                </Button>
              </div>

              <div className="space-y-2">
                {block.quadrants[quadrant.key].items.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-2xl border border-muted/20 bg-background/60 p-2"
                  >
                    <Input
                      value={item.text}
                      placeholder="Matrix item"
                      className="flex-1 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
                          const target = entry.quadrants[quadrant.key].items.find(
                            (candidate) => candidate.id === item.id,
                          );
                          if (target) {
                            target.text = event.target.value.slice(0, 200);
                          }
                        })
                      }
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:text-destructive"
                      aria-label="Remove matrix item"
                      onClick={() =>
                        mutateTypedBlock(tabId, block.id, "2x2-matrix", (entry) => {
                          entry.quadrants[quadrant.key].items = entry.quadrants[
                            quadrant.key
                          ].items.filter((candidate) => candidate.id !== item.id);
                        })
                      }
                    >
                      <Trash2 />
                    </Button>
                  </div>
                ))}

                {block.quadrants[quadrant.key].items.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-8 text-center">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
                      Empty Quadrant
                    </p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      Add the first item to clarify what belongs here.
                    </p>
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
          <span>{block.xStartLabel}</span>
          <span>{block.xAxisLabel}</span>
          <span>{block.xEndLabel}</span>
        </div>
        <div className="mt-1 px-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
          {block.yStartLabel}
        </div>
      </div>
    </div>
  );
}
