import {
  WORKSPACE_SALES_PIPELINE_STAGES,
  createWorkspacePipelineFunnelDeal,
  getPipelineFunnelSummary,
  getSalesPipelineStageIndex,
  workspaceSalesPipelineStageLabels,
  workspaceSalesTemperatureLabels,
  type WorkspacePipelineFunnelBlock,
  type WorkspaceSalesPipelineStage,
  type WorkspaceSalesTemperature,
} from "@brainiac/workspace";
import { Filter, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { BlockSelect } from "@/components/workspace/node/blocks/shared/block-select";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const stageOptions = WORKSPACE_SALES_PIPELINE_STAGES.map((stage) => ({
  label: workspaceSalesPipelineStageLabels[stage],
  value: stage,
}));

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

function getStageRowClasses(stage: WorkspaceSalesPipelineStage) {
  switch (stage) {
    case "lead":
      return "border-primary/30 bg-primary/5";
    case "consultation":
      return "border-info/30 bg-info/5";
    case "proposal":
      return "border-warning/35 bg-warning/5";
    case "negotiation":
      return "border-secondary/35 bg-secondary/8";
    case "closed":
      return "border-success/35 bg-success/5";
    default:
      return "border-muted/30 bg-background/60";
  }
}

export function WorkspacePipelineFunnelBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspacePipelineFunnelBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();

  const summary = useMemo(() => getPipelineFunnelSummary(block), [block]);

  const sortedDeals = useMemo(
    () =>
      [...block.deals].sort((left, right) => {
        const stageDelta =
          getSalesPipelineStageIndex(left.stage) - getSalesPipelineStageIndex(right.stage);
        if (stageDelta !== 0) {
          return stageDelta;
        }
        return right.valueEgp - left.valueEgp;
      }),
    [block.deals],
  );

  function addDeal() {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "pipeline-funnel") {
        return;
      }
      entry.deals.unshift(createWorkspacePipelineFunnelDeal());
    });
  }

  function removeDeal(dealId: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "pipeline-funnel") {
        return;
      }
      entry.deals = entry.deals.filter((deal) => deal.id !== dealId);
    });
  }

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Pipeline Value
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-primary sm:text-2xl">
            {formatCurrency(summary.totalValue)}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            {summary.dealCount} deals
          </p>
        </div>

        <div className="rounded-2xl border border-warning/10 bg-warning/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Open Value
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-warning sm:text-2xl">
            {formatCurrency(summary.openValue)}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            In progress
          </p>
        </div>

        <div className="rounded-2xl border border-success/10 bg-success/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Closed Value
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-success sm:text-2xl">
            {formatCurrency(summary.closedValue)}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Converted
          </p>
        </div>

        <div className="rounded-2xl border border-destructive/10 bg-destructive/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Top of Funnel
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-destructive sm:text-2xl">
            {summary.stageSummaries[0]?.dealCount ?? 0}
          </p>
          <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
            Leads qualified
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-black tracking-tight text-foreground">
            Sales Pipeline Funnel
          </h2>
          <p className="text-xs text-muted-foreground">
            Track deal progression and conversion at each stage.
          </p>
        </div>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="rounded-full"
          onClick={addDeal}
        >
          <Plus />
          Add Deal
        </Button>
      </div>

      <div className="rounded-2xl border border-muted/20 bg-background/40 p-4">
        <div className="space-y-2.5">
          {summary.stageSummaries.map((stage) => (
            <div key={stage.stage} className="flex justify-center">
              <div
                className={cn(
                  "w-full rounded-xl border px-4 py-3 transition-colors",
                  getStageRowClasses(stage.stage),
                )}
                style={{ width: `${stage.widthPercent}%` }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      {stage.label}
                    </p>
                    <p className="mt-0.5 text-sm font-bold text-foreground">
                      {stage.dealCount} deal{stage.dealCount !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <p className="font-mono text-lg font-black tracking-tight text-foreground sm:text-xl">
                    {formatCurrency(stage.totalValue)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="mb-3 px-1">
          <h3 className="text-sm font-black tracking-tight text-foreground">Deals</h3>
          <p className="text-xs text-muted-foreground">
            Update stage and value directly from the list.
          </p>
        </div>

        {sortedDeals.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-muted/20 bg-muted/5 py-10 text-center">
            <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-muted/10 text-muted-foreground/30">
              <Filter className="size-6" />
            </div>
            <p className="mt-3 text-xs font-bold text-muted-foreground">No deals yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDeals.map((deal) => (
              <article
                key={deal.id}
                className="rounded-2xl border border-muted/20 bg-background/40 p-4"
              >
                <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,1fr)_12rem_12rem_auto]">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={cn(
                          "size-2 shrink-0 rounded-full",
                          getTemperatureDotClasses(deal.temperature),
                        )}
                      />
                      <Input
                        value={deal.clientName}
                        placeholder="Client name"
                        className="border-0 bg-transparent px-0 text-base font-black shadow-none focus-visible:ring-0"
                        onChange={(event) =>
                          mutateBlock(tabId, block.id, (entry) => {
                            if (entry.type !== "pipeline-funnel") {
                              return;
                            }
                            const target = entry.deals.find(
                              (candidate) => candidate.id === deal.id,
                            );
                            if (!target) {
                              return;
                            }
                            target.clientName = event.target.value.slice(0, 120);
                          })
                        }
                      />
                    </div>

                    <p className="mt-1.5 pl-3.5 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      {workspaceSalesTemperatureLabels[deal.temperature]} temperature
                    </p>
                  </div>

                  <div>
                    <Label
                      htmlFor={`value-${deal.id}`}
                      className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                    >
                      Value (EGP)
                    </Label>
                    <Input
                      id={`value-${deal.id}`}
                      type="number"
                      value={String(deal.valueEgp)}
                      className="rounded-xl font-mono"
                      onChange={(event) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "pipeline-funnel") {
                            return;
                          }
                          const target = entry.deals.find((candidate) => candidate.id === deal.id);
                          if (!target) {
                            return;
                          }
                          target.valueEgp = toCurrencyValue(event.target.value);
                        })
                      }
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor={`stage-${deal.id}`}
                      className="mb-1.5 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                    >
                      Stage
                    </Label>
                    <BlockSelect
                      value={deal.stage}
                      options={stageOptions}
                      className="rounded-xl"
                      aria-label="Deal stage"
                      onValueChange={(value) =>
                        mutateBlock(tabId, block.id, (entry) => {
                          if (entry.type !== "pipeline-funnel") {
                            return;
                          }
                          const target = entry.deals.find((candidate) => candidate.id === deal.id);
                          if (!target) {
                            return;
                          }
                          target.stage = value as WorkspaceSalesPipelineStage;
                        })
                      }
                    />
                  </div>

                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove deal"
                      onClick={() => removeDeal(deal.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
