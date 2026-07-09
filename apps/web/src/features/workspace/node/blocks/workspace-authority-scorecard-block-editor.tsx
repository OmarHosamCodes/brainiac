import {
  WORKSPACE_AUTHORITY_SCORECARD_METRICS,
  getAuthorityScorecardSummary,
  workspaceAuthorityScoreMetricLabels,
  type WorkspaceAuthorityScoreMetricKey,
  type WorkspaceAuthorityScorecardBlock,
} from "@brainiac/workspace";
import {
  Headphones,
  Mic2,
  Newspaper,
  PenSquare,
  Plus,
  Users,
  Video,
  type LucideIcon,
} from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { BlockProgressBar } from "@/features/workspace/node/blocks/shared/block-progress-bar";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { cn } from "@/lib/utils";

const metricIcons: Record<WorkspaceAuthorityScoreMetricKey, LucideIcon> = {
  posts: PenSquare,
  videos: Video,
  speakingGigs: Mic2,
  podcastAppearances: Headphones,
  mediaFeatures: Newspaper,
  followers: Users,
};

function formatValue(value: number) {
  return value.toLocaleString("en-US");
}

function toInteger(value: string, fallback: number) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.max(0, Math.round(numeric));
}

function getProgressTone(progress: number) {
  if (progress >= 75) {
    return {
      badge: "text-success",
      surface: "border-success/25 bg-success/5",
      progressClass: "bg-success",
    };
  }

  if (progress >= 40) {
    return {
      badge: "text-warning",
      surface: "border-warning/25 bg-warning/5",
      progressClass: "bg-warning",
    };
  }

  return {
    badge: "text-destructive",
    surface: "border-destructive/25 bg-destructive/5",
    progressClass: "bg-destructive",
  };
}

export function WorkspaceAuthorityScorecardBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceAuthorityScorecardBlock>) {
  const { mutateBlock } = useWorkspaceNodeEditorContext();
  const summary = useMemo(() => getAuthorityScorecardSummary(block), [block]);

  function incrementMetric(metricKey: WorkspaceAuthorityScoreMetricKey) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "authority-scorecard") {
        return;
      }
      entry.metrics[metricKey].value += 1;
    });
  }

  function updateMetricValue(metricKey: WorkspaceAuthorityScoreMetricKey, value: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "authority-scorecard") {
        return;
      }
      entry.metrics[metricKey].value = toInteger(value, entry.metrics[metricKey].value);
    });
  }

  function updateMetricTarget(metricKey: WorkspaceAuthorityScoreMetricKey, value: string) {
    mutateBlock(tabId, block.id, (entry) => {
      if (entry.type !== "authority-scorecard") {
        return;
      }
      entry.metrics[metricKey].target = Math.max(
        1,
        toInteger(value, entry.metrics[metricKey].target),
      );
    });
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-primary/20 bg-primary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
            On Target
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-primary sm:text-2xl">
            {summary.atTargetCount}/{summary.metricCount}
          </p>
        </div>

        <div className="rounded-2xl border border-secondary/20 bg-secondary/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary/80">
            Avg Progress
          </p>
          <p className="mt-2 text-xl font-black tracking-tight text-secondary sm:text-2xl">
            {summary.averageProgress}%
          </p>
        </div>

        <div className="rounded-2xl border border-success/20 bg-success/10 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-success/70">
            Strongest
          </p>
          <p className="mt-2 text-lg font-black tracking-tight text-success sm:text-xl">
            {summary.strongestMetric
              ? workspaceAuthorityScoreMetricLabels[summary.strongestMetric]
              : "None"}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="text-sm font-black tracking-tight text-foreground">Authority Metrics</h2>
          <p className="text-xs text-muted-foreground">
            Track key authority indicators with quick increments and precise editing.
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {WORKSPACE_AUTHORITY_SCORECARD_METRICS.map((metricKey) => {
          const tone = getProgressTone(summary.metrics[metricKey].progress);
          const Icon = metricIcons[metricKey];

          return (
            <div
              key={metricKey}
              className={cn("rounded-2xl border p-4 transition-all", tone.surface)}
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-muted/20 bg-background/80 text-muted-foreground">
                    <Icon className="size-4.5" />
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                      {workspaceAuthorityScoreMetricLabels[metricKey]}
                    </p>
                    <p
                      className={cn(
                        "mt-0.5 truncate text-xl font-black tracking-tight sm:text-2xl",
                        tone.badge,
                      )}
                    >
                      {formatValue(block.metrics[metricKey].value)}
                    </p>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  <Badge variant="secondary" className="rounded-xl px-2.5 py-0.5">
                    {summary.metrics[metricKey].progress}%
                  </Badge>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="rounded-lg"
                    aria-label={`Increment ${workspaceAuthorityScoreMetricLabels[metricKey]}`}
                    onClick={() => incrementMetric(metricKey)}
                  >
                    <Plus />
                  </Button>
                </div>
              </div>

              <div className="mb-4 space-y-2">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                  <span>Progress</span>
                  <span>Target: {formatValue(block.metrics[metricKey].target)}</span>
                </div>
                <BlockProgressBar
                  value={summary.metrics[metricKey].progress}
                  max={100}
                  className={tone.progressClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label
                    htmlFor={`current-${metricKey}`}
                    className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                  >
                    Current
                  </Label>
                  <Input
                    id={`current-${metricKey}`}
                    type="number"
                    value={String(block.metrics[metricKey].value)}
                    className="rounded-xl"
                    onChange={(event) => updateMetricValue(metricKey, event.target.value)}
                  />
                </div>

                <div>
                  <Label
                    htmlFor={`target-${metricKey}`}
                    className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60"
                  >
                    Target
                  </Label>
                  <Input
                    id={`target-${metricKey}`}
                    type="number"
                    value={String(block.metrics[metricKey].target)}
                    className="rounded-xl"
                    onChange={(event) => updateMetricTarget(metricKey, event.target.value)}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
