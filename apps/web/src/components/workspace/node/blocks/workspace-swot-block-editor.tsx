import { getSwotSummary, type WorkspaceSwotBlock } from "@brainiac/workspace";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const quadrants = [
  {
    key: "strengths" as const,
    label: "Strengths",
    className: "border-emerald-300/40 bg-emerald-500/5 text-emerald-700",
  },
  {
    key: "weaknesses" as const,
    label: "Weaknesses",
    className: "border-rose-300/40 bg-rose-500/5 text-rose-700",
  },
  {
    key: "opportunities" as const,
    label: "Opportunities",
    className: "border-indigo-300/40 bg-indigo-500/5 text-indigo-700",
  },
  {
    key: "threats" as const,
    label: "Threats",
    className: "border-amber-300/40 bg-amber-500/5 text-amber-700",
  },
];

export function WorkspaceSwotBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceSwotBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getSwotSummary(block), [block]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-muted/20 bg-background/40 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Filled
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-foreground sm:text-2xl">
            {summary.filledCellCount}/4
          </p>
        </div>
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
            Coverage
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-primary sm:text-2xl">
            {100 - summary.emptyCellCount * 25}%
          </p>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {quadrants.map((quadrant) => {
          const value = block.cells[quadrant.key] || "";
          const filled = Boolean(value.trim());

          return (
            <article
              key={quadrant.key}
              className={cn(
                "rounded-2xl border p-4 transition-colors hover:border-opacity-50",
                quadrant.className,
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="text-[10px] font-bold uppercase tracking-[0.2em]">
                  {quadrant.label}
                </h3>
                <Badge
                  variant={filled ? "success" : "secondary"}
                  className="rounded-lg px-2 py-0.5"
                >
                  {filled ? "Filled" : "Empty"}
                </Badge>
              </div>

              <Textarea
                value={value}
                rows={5}
                placeholder={`Capture ${quadrant.label.toLowerCase()} here...`}
                className="min-h-[120px] resize-y border-0 bg-transparent p-0 text-sm font-medium leading-relaxed shadow-none focus-visible:ring-0"
                onChange={(event) =>
                  mutateBlock(tabId, block.id, (entry) => {
                    if (entry.type !== "swot") {
                      return;
                    }
                    entry.cells[quadrant.key] = event.target.value.slice(0, 4000);
                  })
                }
              />
            </article>
          );
        })}
      </div>
    </div>
  );
}
