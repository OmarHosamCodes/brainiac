import {
  createWorkspaceDealScoringDeal,
  getDealScoreTone,
  getDealScoringMatrixSummary,
  sortDealScoringDeals,
  workspaceSalesPipelineStageLabels,
  workspaceSalesTemperatureLabels,
  type WorkspaceDealScoringMatrixBlock,
  type WorkspaceSalesPipelineStage,
  type WorkspaceSalesTemperature,
} from "@brainiac/workspace";
import { BadgeDollarSign, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockFieldLabel } from "@/features/workspace/node/blocks/shared/block-field-label";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { BlockSelect } from "@/features/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";

const temperatureOptions = [
  { label: workspaceSalesTemperatureLabels.hot, value: "hot" },
  { label: workspaceSalesTemperatureLabels.warm, value: "warm" },
  { label: workspaceSalesTemperatureLabels.cold, value: "cold" },
] satisfies Array<{ label: string; value: WorkspaceSalesTemperature }>;

const stageOptions = (["lead", "consultation", "proposal", "negotiation", "closed"] as const).map(
  (stage) => ({
    label: workspaceSalesPipelineStageLabels[stage],
    value: stage,
  }),
) satisfies Array<{ label: string; value: WorkspaceSalesPipelineStage }>;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function toCurrencyValue(value: string) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(1_000_000_000, Math.round(numeric)));
}

function clampScore(value: string) {
  const numeric = Number(value || 0);
  return Math.min(100, Math.max(0, Math.round(numeric)));
}

function getTemperatureDotClasses(temperature: WorkspaceSalesTemperature) {
  switch (temperature) {
    case "hot":
      return "bg-destructive";
    case "warm":
      return "bg-warning";
    default:
      return "bg-muted";
  }
}

function getScoreTextClasses(score: number) {
  switch (getDealScoreTone(score)) {
    case "strong":
      return "text-success";
    case "medium":
      return "text-warning";
    default:
      return "text-destructive";
  }
}

function getCardClasses(score: number) {
  switch (getDealScoreTone(score)) {
    case "strong":
      return "border-success/20 bg-success/5";
    case "medium":
      return "border-warning/20 bg-warning/5";
    default:
      return "border-destructive/20 bg-destructive/5";
  }
}

function getPriorityLabel(score: number) {
  if (score >= 75) {
    return "Strong";
  }

  if (score >= 50) {
    return "Watch";
  }

  return "Weak";
}

function getPrioritySummary(score: number) {
  if (score >= 75) {
    return "High-priority opportunity with strong momentum.";
  }

  if (score >= 50) {
    return "Worth advancing, but it still needs focused follow-through.";
  }

  return "Low-confidence opportunity that needs qualification or a reset.";
}

export function WorkspaceDealScoringMatrixBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceDealScoringMatrixBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getDealScoringMatrixSummary(block), [block]);
  const sortedDeals = useMemo(() => sortDealScoringDeals(block.deals), [block.deals]);
  const advancedStageCount = useMemo(
    () =>
      summary.stageCounts.proposal + summary.stageCounts.negotiation + summary.stageCounts.closed,
    [summary.stageCounts],
  );
  const topDeal = sortedDeals[0] ?? null;

  function mutateDeal(
    dealId: string,
    mutator: (deal: WorkspaceDealScoringMatrixBlock["deals"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "deal-scoring-matrix", (entry) => {
      const target = entry.deals.find((candidate) => candidate.id === dealId);

      if (!target) {
        return;
      }

      mutator(target);
    });
  }

  function addDeal() {
    mutateTypedBlock(tabId, block.id, "deal-scoring-matrix", (entry) => {
      entry.deals.unshift(createWorkspaceDealScoringDeal());
    });
  }

  function removeDeal(dealId: string) {
    mutateTypedBlock(tabId, block.id, "deal-scoring-matrix", (entry) => {
      entry.deals = entry.deals.filter((deal) => deal.id !== dealId);
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Pipeline
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {formatCurrency(summary.totalValue)}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{summary.dealCount} active deals</p>
        </div>

        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Avg Score
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {summary.averageScore}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Prioritization score out of 100</p>
        </div>

        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Hot Deals
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {summary.hotCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Immediate follow-up required</p>
        </div>

        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Advanced Stage
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {advancedStageCount}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">Proposal or later</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <p className="text-sm font-semibold text-foreground">Deal priority stack</p>
          <p className="text-sm text-muted-foreground">
            Deals are automatically ranked by score so the best opportunities stay at the top.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {topDeal ? (
            <Badge variant="secondary" className="rounded-full">
              Top deal: {topDeal.clientName || "Untitled deal"}
            </Badge>
          ) : null}

          <Button type="button" variant="secondary" className="rounded-full px-4" onClick={addDeal}>
            <Plus />
            Add Deal
          </Button>
        </div>
      </div>

      {sortedDeals.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
          <p className="text-sm font-semibold text-muted-foreground">No scored deals yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first opportunity to start ranking the pipeline.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {sortedDeals.map((deal, index) => (
            <article
              key={deal.id}
              className={cn("rounded-3xl border p-5 transition-colors", getCardClasses(deal.score))}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "size-2.5 shrink-0 rounded-full",
                        getTemperatureDotClasses(deal.temperature),
                      )}
                    />
                    <Input
                      value={deal.clientName}
                      placeholder="Client name"
                      className="w-full border-0 bg-transparent px-0 text-lg font-bold text-foreground placeholder:text-muted-foreground/60 shadow-none focus-visible:ring-0"
                      onChange={(event) =>
                        mutateDeal(deal.id, (target) => {
                          target.clientName = event.target.value.slice(0, 120);
                        })
                      }
                    />
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Badge variant="secondary" className="rounded-full">
                      #{index + 1} in stack
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {workspaceSalesTemperatureLabels[deal.temperature]}
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {workspaceSalesPipelineStageLabels[deal.stage]}
                    </Badge>
                    {deal.dueDate ? (
                      <Badge variant="secondary" className="rounded-full">
                        Due {deal.dueDate}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      Score
                    </p>
                    <p
                      className={cn(
                        "mt-1 text-2xl font-black tracking-tight sm:text-3xl",
                        getScoreTextClasses(deal.score),
                      )}
                    >
                      {deal.score}
                    </p>
                    <p
                      className={cn("mt-1 text-xs font-semibold", getScoreTextClasses(deal.score))}
                    >
                      {getPriorityLabel(deal.score)}
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-2xl hover:text-destructive"
                    aria-label={`Remove ${deal.clientName || "deal"}`}
                    onClick={() => removeDeal(deal.id)}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-4">
                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Deal Value (EGP)</BlockFieldLabel>
                  </Label>
                  <div className="relative">
                    <BadgeDollarSign className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      value={String(deal.valueEgp)}
                      type="number"
                      className="w-full rounded-2xl pl-9"
                      onChange={(event) =>
                        mutateDeal(deal.id, (target) => {
                          target.valueEgp = toCurrencyValue(event.target.value);
                        })
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Temperature</BlockFieldLabel>
                  </Label>
                  <BlockSelect
                    value={deal.temperature}
                    options={temperatureOptions}
                    className="rounded-2xl"
                    onValueChange={(value) =>
                      mutateDeal(deal.id, (target) => {
                        target.temperature =
                          value === "hot" || value === "warm" || value === "cold" ? value : "warm";
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Stage</BlockFieldLabel>
                  </Label>
                  <BlockSelect
                    value={deal.stage}
                    options={stageOptions}
                    className="rounded-2xl"
                    onValueChange={(value) =>
                      mutateDeal(deal.id, (target) => {
                        target.stage =
                          value === "lead" ||
                          value === "consultation" ||
                          value === "proposal" ||
                          value === "negotiation" ||
                          value === "closed"
                            ? value
                            : "lead";
                      })
                    }
                  />
                </div>

                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Due Date</BlockFieldLabel>
                  </Label>
                  <Input
                    value={deal.dueDate ?? ""}
                    type="date"
                    className="w-full rounded-2xl"
                    onChange={(event) =>
                      mutateDeal(deal.id, (target) => {
                        target.dueDate = event.target.value || null;
                      })
                    }
                  />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  <span>Priority Score</span>
                  <span className={getScoreTextClasses(deal.score)}>
                    {getPriorityLabel(deal.score)}
                  </span>
                </div>

                <BlockProgressBar value={deal.score} max={100} className="h-1.5" />

                <input
                  value={deal.score}
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-muted/20 accent-primary"
                  onChange={(event) =>
                    mutateDeal(deal.id, (target) => {
                      target.score = clampScore(event.target.value);
                    })
                  }
                />
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_14rem]">
                <div className="space-y-1.5">
                  <Label>
                    <BlockFieldLabel>Next Action</BlockFieldLabel>
                  </Label>
                  <Input
                    value={deal.nextAction}
                    className="w-full rounded-2xl"
                    placeholder="What needs to happen next?"
                    onChange={(event) =>
                      mutateDeal(deal.id, (target) => {
                        target.nextAction = event.target.value.slice(0, 240);
                      })
                    }
                  />
                </div>

                <div className="rounded-2xl border border-muted/20 bg-background/40 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                    Priority context
                  </p>
                  <p className="mt-2 text-sm font-semibold text-foreground">
                    {workspaceSalesPipelineStageLabels[deal.stage]}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {getPrioritySummary(deal.score)}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm text-muted-foreground">
                {formatCurrency(deal.valueEgp)} opportunity with{" "}
                {workspaceSalesTemperatureLabels[deal.temperature].toLowerCase()} urgency.
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
