import type { WorkspaceScorecardBlock } from "@brainiac/workspace";
import { BarChart3, Plus, Trash2 } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/components/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function toNumber(value: string, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function getMetricProgress(value: number, target: number) {
  if (target === 0) {
    return value > 0 ? 100 : 0;
  }
  return Math.max(0, Math.min(100, Math.round((value / target) * 100)));
}

function getMetricStatus(value: number, target: number) {
  const progress = getMetricProgress(value, target);

  if (progress >= 100) {
    return {
      label: "At target",
      textClass: "text-success",
      badgeVariant: "success" as const,
      cardClass: "border-success/20 bg-success/5",
    };
  }

  if (progress >= 50) {
    return {
      label: "On track",
      textClass: "text-warning",
      badgeVariant: "secondary" as const,
      cardClass: "border-warning/20 bg-warning/5",
    };
  }

  return {
    label: "Behind",
    textClass: "text-destructive",
    badgeVariant: "destructive" as const,
    cardClass: "border-destructive/20 bg-destructive/5",
  };
}

export function WorkspaceScorecardBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceScorecardBlock>) {
  const { addScorecardMetric, mutateScorecardMetric, removeScorecardMetric } =
    useWorkspaceNodeEditorContext();

  const summary = useMemo(() => {
    const metricCount = block.metrics.length;
    const atTarget = block.metrics.filter((metric) => metric.value >= metric.target).length;
    const avgProgress =
      metricCount === 0
        ? 0
        : Math.round(
            block.metrics.reduce(
              (sum, metric) => sum + getMetricProgress(metric.value, metric.target),
              0,
            ) / metricCount,
          );

    return {
      metricCount,
      atTarget,
      behindTarget: Math.max(metricCount - atTarget, 0),
      avgProgress,
    };
  }, [block.metrics]);

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Total Metrics", summary.metricCount, "border-primary/10 bg-primary/5 text-primary"],
          ["At Target", summary.atTarget, "border-success/10 bg-success/5 text-success"],
          [
            "Needs Attention",
            summary.behindTarget,
            "border-destructive/10 bg-destructive/5 text-destructive",
          ],
          [
            "Avg Progress",
            `${summary.avgProgress}%`,
            "border-warning/10 bg-warning/5 text-warning",
          ],
        ].map(([label, value, className]) => (
          <div
            key={String(label)}
            className={cn(
              "flex flex-col items-center justify-center rounded-3xl border p-5 text-center",
              className,
            )}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              {label}
            </p>
            <p className={cn("mt-1 text-2xl font-black tracking-tight sm:text-3xl")}>{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 px-2">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Key Performance Indicators
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Track the current value, target, and unit for each metric in one place.
            </p>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            aria-label="Add scorecard metric"
            onClick={() => addScorecardMetric(tabId, block.id)}
          >
            <Plus />
            Add Metric
          </Button>
        </div>

        {block.metrics.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2">
            {block.metrics.map((metric) => {
              const status = getMetricStatus(metric.value, metric.target);
              const progress = getMetricProgress(metric.value, metric.target);

              return (
                <article
                  key={metric.id}
                  className={cn("rounded-3xl border p-5 transition-colors", status.cardClass)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <Input
                        value={metric.label}
                        placeholder="Metric title"
                        className="w-full border-0 bg-transparent px-0 text-lg font-bold shadow-none focus-visible:ring-0"
                        aria-label={`Metric title for ${metric.label || "scorecard metric"}`}
                        onChange={(event) =>
                          mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                            entry.label = event.target.value.slice(0, 120);
                          })
                        }
                      />

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={status.badgeVariant} className="rounded-2xl">
                          {status.label}
                        </Badge>
                        <Badge variant="secondary" className="rounded-2xl">
                          {progress}% progress
                        </Badge>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-xl hover:text-destructive"
                      aria-label={`Remove ${metric.label || "scorecard"} metric`}
                      onClick={() => removeScorecardMetric(tabId, block.id, metric.id)}
                    >
                      <Trash2 />
                    </Button>
                  </div>

                  <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                        Current vs Target
                      </p>
                      <div className="mt-2 flex items-end gap-2">
                        <span
                          className={cn(
                            "text-3xl font-black tracking-tight sm:text-4xl",
                            status.textClass,
                          )}
                        >
                          {metric.value}
                        </span>
                        <span className="pb-1 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                          / {metric.target} {metric.unit || "units"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em]">
                      <span className="text-muted-foreground/60">Progress</span>
                      <span className={status.textClass}>{progress}%</span>
                    </div>
                    <BlockProgressBar value={progress} max={100} />
                  </div>

                  <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                    {(
                      [
                        [
                          "Current",
                          String(metric.value),
                          "number",
                          (value: string) =>
                            mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                              entry.value = toNumber(value, 0);
                            }),
                        ],
                        [
                          "Target",
                          String(metric.target),
                          "number",
                          (value: string) =>
                            mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                              entry.target = toNumber(value, 100);
                            }),
                        ],
                        [
                          "Unit",
                          metric.unit,
                          "text",
                          (value: string) =>
                            mutateScorecardMetric(tabId, block.id, metric.id, (entry) => {
                              entry.unit = value.slice(0, 24);
                            }),
                        ],
                      ] as const
                    ).map(([label, value, type, onChange]) => (
                      <div key={label} className="space-y-1">
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                          {label}
                        </p>
                        <Input
                          type={type}
                          value={value}
                          placeholder={label === "Unit" ? "%" : undefined}
                          className="rounded-xl"
                          aria-label={`${label} for ${metric.label || "scorecard metric"}`}
                          onChange={(event) => onChange(event.target.value)}
                        />
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
            <BarChart3 className="mx-auto mb-4 size-8 text-muted-foreground/40" />
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              No metrics defined
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Add a metric to track performance against a target.
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-4 rounded-full px-4"
              aria-label="Add first scorecard metric"
              onClick={() => addScorecardMetric(tabId, block.id)}
            >
              <Plus />
              Add Metric
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
