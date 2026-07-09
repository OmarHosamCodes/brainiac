import {
  getPricingSimulatorSummary,
  type WorkspacePricingSimulatorBlock,
} from "@brainiac/workspace";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

const controls = [
  {
    key: "hoursPerClientPerMonth" as const,
    label: "Hours / Client / Month",
    min: 5,
    max: 100,
    suffix: "h",
  },
  {
    key: "hourlyRateEgp" as const,
    label: "Hourly Rate",
    min: 100,
    max: 2_000,
    suffix: "EGP",
  },
  {
    key: "monthlyOverheadEgp" as const,
    label: "Monthly Overhead",
    min: 10_000,
    max: 200_000,
    suffix: "EGP",
  },
  {
    key: "targetMarginPercent" as const,
    label: "Target Margin",
    min: 10,
    max: 80,
    suffix: "%",
  },
];

function formatCurrency(value: number) {
  return `${Math.round(value).toLocaleString("en-US")} EGP`;
}

function toInteger(value: string, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.round(numeric);
}

export function WorkspacePricingSimulatorBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspacePricingSimulatorBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getPricingSimulatorSummary(block), [block]);

  function updateControl(
    key: (typeof controls)[number]["key"],
    value: number,
    min: number,
    max: number,
  ) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "pricing-simulator") {
        return;
      }
      entry[key] = Math.min(max, Math.max(min, value));
    });
  }

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <section className="space-y-4 rounded-2xl border border-muted/20 bg-background/40 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-black tracking-tight text-foreground">Pricing Simulator</h2>
            <p className="text-xs text-muted-foreground">
              Monthly retainer model for executive decisions.
            </p>
          </div>

          <div className="rounded-xl border border-primary/10 bg-primary/5 px-4 py-2.5 text-right">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Active Clients
            </p>
            <p className="mt-1 text-xl font-black tracking-tight text-primary sm:text-2xl">
              {block.activeClients}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            className="rounded-xl border border-muted/20 bg-muted/10 px-4 py-2.5 text-left transition hover:border-primary/30"
            onClick={() =>
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== "pricing-simulator") {
                  return;
                }
                entry.activeClients = Math.max(1, entry.activeClients - 1);
              })
            }
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Adjust
            </p>
            <p className="mt-1 text-base font-bold text-foreground">-1 Client</p>
          </button>

          <button
            type="button"
            className="rounded-xl border border-muted/20 bg-muted/10 px-4 py-2.5 text-left transition hover:border-primary/30"
            onClick={() =>
              mutateBlock(tabId, block.id, (entry) => {
                if (entry.type !== "pricing-simulator") {
                  return;
                }
                entry.activeClients = Math.min(50, entry.activeClients + 1);
              })
            }
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Adjust
            </p>
            <p className="mt-1 text-base font-bold text-foreground">+1 Client</p>
          </button>
        </div>

        {controls.map((control) => (
          <article key={control.key} className="rounded-xl border border-muted/20 bg-muted/10 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label
                htmlFor={control.key}
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
              >
                {control.label}
              </label>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-foreground sm:text-xl">
                  {block[control.key]}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  {control.suffix}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input
                id={control.key}
                value={block[control.key]}
                min={control.min}
                max={control.max}
                type="range"
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-muted/35 accent-primary"
                onChange={(event) =>
                  updateControl(
                    control.key,
                    toInteger(event.target.value, block[control.key]),
                    control.min,
                    control.max,
                  )
                }
              />
              <Input
                type="number"
                value={String(block[control.key])}
                className="w-20 rounded-xl"
                onChange={(event) =>
                  updateControl(
                    control.key,
                    toInteger(event.target.value, block[control.key]),
                    control.min,
                    control.max,
                  )
                }
              />
            </div>

            <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/50">
              <span>{control.min}</span>
              <span>{control.max}</span>
            </div>
          </article>
        ))}
      </section>

      <section className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-success/10 bg-success/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Projected Revenue
            </p>
            <p className="mt-2 font-mono text-xl font-black tracking-tight text-success sm:text-2xl">
              {formatCurrency(summary.projectedRevenue)}
            </p>
          </div>

          <div className="rounded-2xl border border-primary/10 bg-primary/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Min Retainer / Client
            </p>
            <p className="mt-2 font-mono text-xl font-black tracking-tight text-primary sm:text-2xl">
              {formatCurrency(summary.minimumRetainerPerClient)}
            </p>
          </div>

          <div className="rounded-2xl border border-secondary/10 bg-secondary/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Projected Profit
            </p>
            <p
              className={cn(
                "mt-2 font-mono text-xl font-black tracking-tight sm:text-2xl",
                summary.projectedProfit >= 0 ? "text-success" : "text-destructive",
              )}
            >
              {formatCurrency(summary.projectedProfit)}
            </p>
          </div>

          <div className="rounded-2xl border border-warning/10 bg-warning/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Required Revenue
            </p>
            <p className="mt-2 font-mono text-xl font-black tracking-tight text-warning sm:text-2xl">
              {formatCurrency(summary.requiredRevenue)}
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-muted/20 bg-background/40 p-4">
          <h3 className="text-sm font-black tracking-tight text-foreground">Scenario Readout</h3>
          <div className="mt-3 space-y-2 text-sm text-muted-foreground">
            <p>
              At <strong>{block.activeClients}</strong> active clients, the team carries{" "}
              <strong>{summary.monthlyClientHours}</strong> monthly delivery hours.
            </p>
            <p>
              To hit a <strong>{block.targetMarginPercent}%</strong> margin with current overhead,
              each client should clear at least{" "}
              <strong>{formatCurrency(summary.minimumRetainerPerClient)}</strong> per month.
            </p>
            <p className="text-xs text-muted-foreground">
              Use this to pressure-test rate increases, hiring decisions, and minimum retainers.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
