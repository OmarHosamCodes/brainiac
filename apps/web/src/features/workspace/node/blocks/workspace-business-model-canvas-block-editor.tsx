import {
  analyzeBusinessModelCanvas,
  getBusinessModelCanvasSummary,
  workspaceBusinessModelCanvasCellLabels,
  type WorkspaceBusinessModelCanvasBlock,
  type WorkspaceBusinessModelCanvasCellKey,
} from "@brainiac/workspace";
import { AlertTriangle, Sparkles } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Textarea } from "@/ui/textarea";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { cn } from "@/lib/utils";

const canvasCells: Array<{
  key: WorkspaceBusinessModelCanvasCellKey;
  area: string;
  placeholder: string;
}> = [
  {
    key: "keyPartners",
    area: "partners",
    placeholder: "Freelancers, tool providers, media partners...",
  },
  {
    key: "keyActivities",
    area: "activities",
    placeholder: "Curriculum design, consulting delivery, content publishing...",
  },
  {
    key: "keyResources",
    area: "resources",
    placeholder: "Brand, curriculum assets, instructor bench, CRM...",
  },
  {
    key: "valuePropositions",
    area: "value",
    placeholder: "Practical outcomes, speed to implementation, trusted guidance...",
  },
  {
    key: "customerRelationships",
    area: "relationships",
    placeholder: "Community, advisory support, office hours, account management...",
  },
  {
    key: "channels",
    area: "channels",
    placeholder: "Content funnel, referrals, sales calls, partnerships...",
  },
  {
    key: "customerSegments",
    area: "segments",
    placeholder: "Founders, senior marketers, in-house teams...",
  },
  {
    key: "costStructure",
    area: "costs",
    placeholder: "Talent, media spend, software, production, delivery costs...",
  },
  {
    key: "revenueStreams",
    area: "revenue",
    placeholder: "Cohorts, retainers, advisory, licensing, workshops...",
  },
];

const gridAreaClass: Record<string, string> = {
  partners: "lg:[grid-area:partners]",
  activities: "lg:[grid-area:activities]",
  resources: "lg:[grid-area:resources]",
  value: "lg:[grid-area:value]",
  relationships: "lg:[grid-area:relationships]",
  channels: "lg:[grid-area:channels]",
  segments: "lg:[grid-area:segments]",
  costs: "lg:[grid-area:costs]",
  revenue: "lg:[grid-area:revenue]",
};

function getReadinessLabel(
  readiness: ReturnType<typeof getBusinessModelCanvasSummary>["readiness"],
) {
  switch (readiness) {
    case "aligned":
      return "Aligned";
    case "forming":
      return "Forming";
    default:
      return "Early";
  }
}

export function WorkspaceBusinessModelCanvasBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceBusinessModelCanvasBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getBusinessModelCanvasSummary(block), [block]);

  function runAnalysis() {
    mutateBlock(tabId, block.id, (entry, _tab, _node, timestamp) => {
      if (entry.type !== "business-model-canvas") {
        return;
      }
      const analysis = analyzeBusinessModelCanvas(entry);
      entry.analysis = analysis.narrative;
      entry.analysisUpdatedAt = timestamp;
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
            Coverage
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-primary sm:text-2xl">
            {summary.filledCellCount}/9
          </p>
        </div>

        <div className="rounded-2xl border border-warning/20 bg-warning/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/70">
            Missing
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-warning sm:text-2xl">
            {summary.missingCellCount}
          </p>
        </div>

        <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">
            Readiness
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-success sm:text-2xl">
            {getReadinessLabel(summary.readiness)}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-black tracking-tight text-foreground">
            Business Model Canvas
          </h2>
          <p className="text-xs text-muted-foreground">
            Pressure-test how the model creates, delivers, and captures value.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={runAnalysis}
        >
          <Sparkles />
          AI Analyze
        </Button>
      </div>

      <div className="overflow-x-auto pb-2">
        <div
          className="grid gap-3 lg:min-w-[1000px] lg:grid-cols-5"
          style={{
            gridTemplateAreas: undefined,
          }}
        >
          <style>{`
            @media (min-width: 1024px) {
              .bmc-grid {
                grid-template-areas:
                  "partners activities value relationships segments"
                  "partners resources value channels segments"
                  "costs costs revenue revenue revenue";
              }
            }
          `}</style>
          <div className="bmc-grid contents">
            {canvasCells.map((cell) => {
              const filled = block.cells[cell.key].trim().length > 0;

              return (
                <article
                  key={cell.key}
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    gridAreaClass[cell.area],
                    filled ? "border-muted/20 bg-background/40" : "border-warning/30 bg-warning/5",
                  )}
                >
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      {workspaceBusinessModelCanvasCellLabels[cell.key]}
                    </p>
                    <Badge variant={filled ? "default" : "secondary"} className="rounded-lg px-2">
                      {filled ? "Filled" : "Empty"}
                    </Badge>
                  </div>

                  <Textarea
                    value={block.cells[cell.key]}
                    rows={cell.key === "costStructure" || cell.key === "revenueStreams" ? 3 : 5}
                    className="min-h-24 rounded-xl bg-muted/10"
                    placeholder={filled ? "" : cell.placeholder}
                    onChange={(event) =>
                      mutateBlock(tabId, block.id, (entry) => {
                        if (entry.type !== "business-model-canvas") {
                          return;
                        }
                        entry.cells[cell.key] = event.target.value.slice(0, 4000);
                      })
                    }
                  />
                </article>
              );
            })}
          </div>
        </div>
      </div>

      {summary.missingCellCount > 0 ? (
        <div className="rounded-2xl border border-warning/20 bg-warning/5 p-4">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-warning/10 text-warning">
              <AlertTriangle className="size-4" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-warning">Incomplete canvas</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {summary.missingCellCount} cell{summary.missingCellCount !== 1 ? "s" : ""} need
                {summary.missingCellCount === 1 ? "s" : ""} attention. Fill all cells for a complete
                model analysis.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <section className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-black tracking-tight text-foreground">Analysis Output</h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Identifies strengths, gaps, and strategic questions.
            </p>
          </div>

          {block.analysisUpdatedAt ? (
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Last analyzed {formatDateTime(block.analysisUpdatedAt)}
            </p>
          ) : null}
        </div>

        <div className="mt-3 rounded-xl border border-muted/20 bg-background/60 p-4 text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
          {block.analysis || "Run AI Analyze to generate a gap analysis of the current canvas."}
        </div>
      </section>
    </div>
  );
}
