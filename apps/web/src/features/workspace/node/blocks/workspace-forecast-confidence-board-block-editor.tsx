import {
  WORKSPACE_SALES_FORECAST_BUCKETS,
  createWorkspaceForecastConfidenceItem,
  getForecastConfidenceBoardSummary,
  getForecastDealWeightedValue,
  workspaceSalesForecastBucketLabels,
  type WorkspaceForecastConfidenceBoardBlock,
  type WorkspaceSalesForecastBucket,
} from "@brainiac/workspace";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  Banknote,
  Calculator,
  ListTodo,
  Plus,
  ShieldAlert,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function formatCurrency(value: number) {
  return currencyFormatter.format(value);
}

function toCurrencyValue(value: string, fallback = 0) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return Math.max(0, Math.min(1_000_000_000, Math.round(numeric)));
}

function getBucketClasses(bucket: WorkspaceSalesForecastBucket) {
  switch (bucket) {
    case "commit":
      return {
        column: "border-success/10 bg-success/5",
        text: "text-success",
        icon: Award,
      };
    case "likely":
      return {
        column: "border-primary/10 bg-primary/5",
        text: "text-primary",
        icon: TrendingUp,
      };
    case "upside":
      return {
        column: "border-warning/10 bg-warning/5",
        text: "text-warning",
        icon: Sparkles,
      };
    case "at-risk":
      return {
        column: "border-destructive/10 bg-destructive/5",
        text: "text-destructive",
        icon: AlertTriangle,
      };
    default: {
      const _exhaustive: never = bucket;
      return _exhaustive;
    }
  }
}

function getCoverageTextClasses(coverage: number) {
  if (coverage >= 100) {
    return "text-success";
  }
  if (coverage >= 70) {
    return "text-warning";
  }
  return "text-destructive";
}

export function WorkspaceForecastConfidenceBoardBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceForecastConfidenceBoardBlock>) {
  const { mutateTypedBlock } = useWorkspaceNodeEditorContext();
  const [draggingDealId, setDraggingDealId] = useState<string | null>(null);
  const [dragOverBucket, setDragOverBucket] = useState<WorkspaceSalesForecastBucket | null>(null);

  const summary = useMemo(() => getForecastConfidenceBoardSummary(block), [block]);

  const dealsByBucket = useMemo(
    () =>
      Object.fromEntries(
        WORKSPACE_SALES_FORECAST_BUCKETS.map((bucket) => [
          bucket,
          block.deals
            .filter((deal) => deal.bucket === bucket)
            .sort(
              (left, right) => right.confidence - left.confidence || right.valueEgp - left.valueEgp,
            ),
        ]),
      ) as Record<WorkspaceSalesForecastBucket, WorkspaceForecastConfidenceBoardBlock["deals"]>,
    [block.deals],
  );

  const bucketSummaryById = useMemo(
    () => new Map(summary.bucketSummaries.map((entry) => [entry.bucket, entry])),
    [summary.bucketSummaries],
  );

  function mutateDeal(
    dealId: string,
    mutator: (deal: WorkspaceForecastConfidenceBoardBlock["deals"][number]) => void,
  ) {
    mutateTypedBlock(tabId, block.id, "forecast-confidence-board", (entry) => {
      const target = entry.deals.find((candidate) => candidate.id === dealId);
      if (!target) {
        return;
      }
      mutator(target);
    });
  }

  function clearDragState() {
    setDraggingDealId(null);
    setDragOverBucket(null);
  }

  function moveDeal(dealId: string, bucket: WorkspaceSalesForecastBucket) {
    mutateDeal(dealId, (deal) => {
      deal.bucket = bucket;
    });
  }

  function addDeal() {
    mutateTypedBlock(tabId, block.id, "forecast-confidence-board", (entry) => {
      entry.deals.unshift(createWorkspaceForecastConfidenceItem());
    });
  }

  function removeDeal(dealId: string) {
    mutateTypedBlock(tabId, block.id, "forecast-confidence-board", (entry) => {
      entry.deals = entry.deals.filter((deal) => deal.id !== dealId);
    });
  }

  function moveDealByOffset(dealId: string, offset: -1 | 1) {
    const currentBucket = block.deals.find((deal) => deal.id === dealId)?.bucket;
    if (!currentBucket) {
      return;
    }

    const currentIndex = WORKSPACE_SALES_FORECAST_BUCKETS.indexOf(currentBucket);
    if (currentIndex === -1) {
      return;
    }

    const nextBucket = WORKSPACE_SALES_FORECAST_BUCKETS[currentIndex + offset];
    if (!nextBucket) {
      return;
    }

    moveDeal(dealId, nextBucket);
  }

  function canMoveDeal(bucket: WorkspaceSalesForecastBucket, offset: -1 | 1) {
    const currentIndex = WORKSPACE_SALES_FORECAST_BUCKETS.indexOf(bucket);
    return (
      currentIndex + offset >= 0 && currentIndex + offset < WORKSPACE_SALES_FORECAST_BUCKETS.length
    );
  }

  function getBucketSummary(bucket: WorkspaceSalesForecastBucket) {
    return (
      bucketSummaryById.get(bucket) ?? {
        bucket,
        label: workspaceSalesForecastBucketLabels[bucket],
        dealCount: 0,
        totalValue: 0,
        weightedValue: 0,
      }
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="group relative overflow-hidden rounded-[24px] border border-success/10 bg-success/5 p-5 transition-all hover:bg-success/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/60">
                Commit Revenue
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-success">
                {formatCurrency(summary.commitRevenue)}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-success/10">
              <Banknote className="size-5 text-success" />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-success/60">Guaranteed closing value</p>
        </div>

        <div className="group relative overflow-hidden rounded-[24px] border border-primary/10 bg-primary/5 p-5 transition-all hover:bg-primary/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">
                Weighted Forecast
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-primary">
                {formatCurrency(summary.weightedForecast)}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-primary/10">
              <Calculator className="size-5 text-primary" />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-primary/60">Adjusted for confidence</p>
        </div>

        <div className="group relative overflow-hidden rounded-[24px] border border-destructive/10 bg-destructive/5 p-5 transition-all hover:bg-destructive/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-destructive/60">
                At-Risk Value
              </p>
              <p className="mt-2 text-3xl font-black tracking-tight text-destructive">
                {formatCurrency(summary.atRiskValue)}
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-destructive/10">
              <ShieldAlert className="size-5 text-destructive" />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-destructive/60">Low confidence deals</p>
        </div>

        <div className="group relative overflow-hidden rounded-[24px] border border-warning/10 bg-warning/5 p-5 transition-all hover:bg-warning/10">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/60">
                Coverage vs Target
              </p>
              <p
                className={cn(
                  "mt-2 text-3xl font-black tracking-tight",
                  getCoverageTextClasses(summary.coveragePercent),
                )}
              >
                {summary.coveragePercent}%
              </p>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-warning/10">
              <Target className="size-5 text-warning" />
            </div>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-warning/60">
            Avg. Confidence {summary.averageConfidence}%
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6 px-1">
        <div className="max-w-md">
          <h3 className="text-base font-bold text-foreground">Forecast Board</h3>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Manage your sales pipeline by deal confidence and track performance against targets.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-6">
          <div className="flex items-center gap-3 rounded-2xl border border-muted/10 bg-muted/5 p-1.5">
            <label className="ml-3 whitespace-nowrap text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40">
              Target
            </label>
            <Input
              type="number"
              value={String(block.targetRevenueEgp)}
              className="w-32 border-0 bg-transparent font-bold shadow-none focus-visible:ring-0"
              onChange={(event) =>
                mutateTypedBlock(tabId, block.id, "forecast-confidence-board", (entry) => {
                  entry.targetRevenueEgp = toCurrencyValue(event.target.value, 50000);
                })
              }
            />
          </div>

          <Button
            type="button"
            className="rounded-full px-5 py-2.5 font-bold shadow-lg shadow-primary/20"
            onClick={addDeal}
          >
            <Plus />
            Add Deal
          </Button>
        </div>
      </div>

      <div className="-mx-1 overflow-x-auto px-1 pb-6">
        <div className="flex gap-6">
          {WORKSPACE_SALES_FORECAST_BUCKETS.map((bucket) => {
            const bucketClasses = getBucketClasses(bucket);
            const BucketIcon = bucketClasses.icon;

            return (
              <section
                key={bucket}
                className={cn(
                  "flex w-[320px] shrink-0 snap-start flex-col rounded-[32px] border p-4 transition-all duration-300",
                  bucketClasses.column,
                  dragOverBucket === bucket
                    ? "shadow-xl ring-2 ring-primary/30 brightness-110"
                    : "",
                )}
                onDragOver={(event) => {
                  if (!draggingDealId) {
                    return;
                  }
                  event.preventDefault();
                  if (event.dataTransfer) {
                    event.dataTransfer.dropEffect = "move";
                  }
                  setDragOverBucket(bucket);
                }}
                onDragLeave={(event) => {
                  const currentTarget = event.currentTarget;
                  const nextTarget = event.relatedTarget;
                  if (
                    currentTarget instanceof HTMLElement &&
                    nextTarget instanceof Node &&
                    currentTarget.contains(nextTarget)
                  ) {
                    return;
                  }
                  if (dragOverBucket === bucket) {
                    setDragOverBucket(null);
                  }
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const dealId =
                    draggingDealId ||
                    event.dataTransfer?.getData("application/x-workspace-forecast-deal") ||
                    "";

                  if (!dealId) {
                    clearDragState();
                    return;
                  }

                  moveDeal(dealId, bucket);
                  clearDragState();
                }}
              >
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-8 items-center justify-center rounded-xl border border-muted/10 bg-background/80 shadow-sm">
                        <BucketIcon className={cn("size-4", bucketClasses.text)} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black uppercase leading-none tracking-[0.2em] text-muted-foreground/50">
                          {workspaceSalesForecastBucketLabels[bucket]}
                        </p>
                        <p className="mt-1 text-xs font-bold leading-none text-foreground/60">
                          {getBucketSummary(bucket).dealCount} deals
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-baseline justify-between">
                    <p className="text-2xl font-black tracking-tight text-foreground">
                      {formatCurrency(getBucketSummary(bucket).totalValue)}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">
                      Wgt: {formatCurrency(getBucketSummary(bucket).weightedValue)}
                    </p>
                  </div>
                </div>

                <div className="min-h-[400px] flex-1 space-y-3 p-2">
                  {dealsByBucket[bucket].map((deal) => (
                    <article
                      key={deal.id}
                      draggable
                      className={cn(
                        "group relative rounded-[24px] border border-muted/10 bg-background/80 p-5 shadow-sm transition-all hover:border-primary/30 hover:bg-background hover:shadow-md",
                        draggingDealId === deal.id
                          ? "pointer-events-none scale-95 opacity-40 grayscale"
                          : "cursor-grab active:cursor-grabbing",
                      )}
                      onDragStart={(event) => {
                        setDraggingDealId(deal.id);
                        if (!event.dataTransfer) {
                          return;
                        }
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData(
                          "application/x-workspace-forecast-deal",
                          deal.id,
                        );
                        event.dataTransfer.setData("text/plain", deal.id);
                      }}
                      onDragEnd={clearDragState}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <Input
                            value={deal.clientName}
                            placeholder="Client Name"
                            className="border-0 bg-transparent p-0 text-base font-black shadow-none focus-visible:ring-0"
                            onChange={(event) =>
                              mutateDeal(deal.id, (entry) => {
                                entry.clientName = event.target.value.slice(0, 120);
                              })
                            }
                          />
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/40">
                            <Badge variant="secondary" className="rounded-full">
                              {workspaceSalesForecastBucketLabels[deal.bucket]}
                            </Badge>
                            <span>
                              Weighted {formatCurrency(getForecastDealWeightedValue(deal))}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-lg"
                            disabled={!canMoveDeal(deal.bucket, -1)}
                            aria-label={`Move ${deal.clientName || "forecast deal"} to the previous bucket`}
                            onClick={() => moveDealByOffset(deal.id, -1)}
                          >
                            <ArrowLeft />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-lg"
                            disabled={!canMoveDeal(deal.bucket, 1)}
                            aria-label={`Move ${deal.clientName || "forecast deal"} to the next bucket`}
                            onClick={() => moveDealByOffset(deal.id, 1)}
                          >
                            <ArrowRight />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="rounded-lg hover:text-destructive"
                            aria-label={`Remove ${deal.clientName || "forecast deal"}`}
                            onClick={() => removeDeal(deal.id)}
                          >
                            <Trash2 />
                          </Button>
                        </div>
                      </div>

                      <div className="mt-6 space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                              VALUE (EGP)
                            </label>
                            <Input
                              type="number"
                              value={String(deal.valueEgp)}
                              className="rounded-xl border-muted/10 bg-muted/5 font-bold"
                              onChange={(event) =>
                                mutateDeal(deal.id, (entry) => {
                                  entry.valueEgp = toCurrencyValue(event.target.value);
                                })
                              }
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                              CLOSE MONTH
                            </label>
                            <Input
                              type="month"
                              value={deal.expectedCloseMonth ?? ""}
                              className="rounded-xl border-muted/10 bg-muted/5"
                              onChange={(event) =>
                                mutateDeal(deal.id, (entry) => {
                                  entry.expectedCloseMonth = event.target.value || null;
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="ml-1 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            OWNER
                          </label>
                          <div className="relative">
                            <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/40" />
                            <Input
                              value={deal.owner}
                              placeholder="Owner Name"
                              className="rounded-xl border-muted/10 bg-muted/5 pl-9"
                              onChange={(event) =>
                                mutateDeal(deal.id, (entry) => {
                                  entry.owner = event.target.value.slice(0, 120);
                                })
                              }
                            />
                          </div>
                        </div>

                        <div className="pt-2">
                          <div className="mb-2 flex items-center justify-between px-1">
                            <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                              Confidence
                            </span>
                            <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-black text-foreground">
                              {deal.confidence}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={10}
                            max={100}
                            step={1}
                            value={deal.confidence}
                            className="h-1.5 w-full appearance-none rounded-full bg-muted/20 accent-primary"
                            aria-label={`Confidence for ${deal.clientName || "forecast deal"}`}
                            onChange={(event) =>
                              mutateDeal(deal.id, (entry) => {
                                entry.confidence = Math.max(
                                  10,
                                  Math.min(100, Math.round(Number(event.target.value))),
                                );
                              })
                            }
                          />
                        </div>

                        <div className="space-y-1.5 rounded-2xl border border-muted/5 bg-muted/5 p-3">
                          <label className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                            <ListTodo className="size-3" />
                            Next Action
                          </label>
                          <Textarea
                            value={deal.nextAction}
                            placeholder="Define next steps..."
                            rows={1}
                            className="min-h-0 resize-none border-0 bg-transparent p-0 text-[11px] leading-relaxed shadow-none focus-visible:ring-0"
                            onChange={(event) =>
                              mutateDeal(deal.id, (entry) => {
                                entry.nextAction = event.target.value.slice(0, 240);
                              })
                            }
                          />
                        </div>
                      </div>
                    </article>
                  ))}

                  {dealsByBucket[bucket].length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center rounded-[32px] border-2 border-dashed border-muted/5 bg-background/10 p-8 text-center">
                      <div className="mb-3 flex size-12 items-center justify-center rounded-full bg-muted/5">
                        <BucketIcon className="size-6 text-muted-foreground/20" />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/30">
                        Empty {bucket}
                      </p>
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
