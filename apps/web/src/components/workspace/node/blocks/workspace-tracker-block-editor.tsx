import { getTrackerTrend, type WorkspaceTrackerBlock } from "@brainiac/workspace";
import { Minus, Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/components/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/components/workspace/node/context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils/format-date-time";
import { cn } from "@/lib/utils";

function toNumber(value: string, fallback = 0) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function formatStatValue(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return "None";
  }
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export function WorkspaceTrackerBlockEditor({
  block,
  tabId,
}: WorkspaceBlockEditorProps<WorkspaceTrackerBlock>) {
  const { addTrackerEntry, mutateTypedBlock, mutateTrackerEntry, removeTrackerEntry } =
    useWorkspaceNodeEditorContext();

  const trend = useMemo(() => getTrackerTrend(block), [block]);
  const latestEntry = block.entries[block.entries.length - 1] ?? null;
  const averageValue = useMemo(() => {
    if (block.entries.length === 0) {
      return 0;
    }
    return Number(
      (block.entries.reduce((sum, entry) => sum + entry.value, 0) / block.entries.length).toFixed(1),
    );
  }, [block.entries]);

  const chartHeights = useMemo(() => {
    const values = block.entries.map((entry) => entry.value);
    if (values.length === 0) {
      return [];
    }
    const min = Math.min(...values, block.goal ?? Number.POSITIVE_INFINITY);
    const max = Math.max(...values, block.goal ?? Number.NEGATIVE_INFINITY);
    if (max === min) {
      return values.map(() => 56);
    }
    return values.map((value) => Math.max(8, Math.round(((value - min) / (max - min)) * 100)));
  }, [block.entries, block.goal]);

  const goalPosition = useMemo(() => {
    if (block.goal === null || block.goal === undefined || block.entries.length === 0) {
      return null;
    }
    const values = block.entries.map((entry) => entry.value);
    const min = Math.min(...values, block.goal);
    const max = Math.max(...values, block.goal);
    if (max === min) {
      return 56;
    }
    return Math.max(0, Math.min(100, Math.round(((block.goal - min) / (max - min)) * 100)));
  }, [block.entries, block.goal]);

  const TrendIcon =
    trend.direction === "up" ? TrendingUp : trend.direction === "down" ? TrendingDown : Minus;

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
              Performance Tracker
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Track progress over time, compare against a goal, and keep key entries easy to scan.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            aria-label="Add tracker entry"
            onClick={() => addTrackerEntry(tabId, block.id)}
          >
            <Plus />
            Add Entry
          </Button>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-2xl">
            {block.entries.length} entries
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {block.goal === null || block.goal === undefined ? "No goal" : formatStatValue(block.goal)}
          </Badge>
          <Badge variant="secondary" className="rounded-2xl">
            {latestEntry?.label || "No entries yet"}
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-3xl border border-primary/20 bg-primary/5 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/60">Latest</p>
          <p className="mt-2 text-2xl font-black tracking-tight text-primary sm:text-3xl">
            {latestEntry ? formatStatValue(latestEntry.value) : "0"}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            {latestEntry?.label || "No entries yet"}
          </p>
        </div>
        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Average
          </p>
          <p className="mt-2 text-2xl font-black tracking-tight text-foreground sm:text-3xl">
            {formatStatValue(averageValue)}
          </p>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            {block.entries.length} data points
          </p>
        </div>
        <div className="rounded-3xl border border-muted/20 bg-muted/10 p-5">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Trend
          </p>
          <div className="mt-2 flex items-center gap-2">
            <TrendIcon
              className={cn(
                "size-6",
                trend.direction === "up"
                  ? "text-success"
                  : trend.direction === "down"
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            />
            <p className="text-2xl font-black tracking-tight text-foreground sm:text-3xl">
              {trend.delta > 0 ? "+" : ""}
              {formatStatValue(trend.delta)}
            </p>
          </div>
          <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40">
            {trend.percentChange === null ? "No baseline yet" : `${trend.percentChange}% change`}
          </p>
        </div>
        <div className="rounded-3xl border border-warning/20 bg-warning/5 p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-warning/70">Goal</p>
            {block.goal !== null ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="rounded-lg"
                aria-label="Clear tracker goal"
                onClick={() =>
                  mutateTypedBlock(tabId, block.id, "tracker", (entry) => {
                    entry.goal = null;
                  })
                }
              >
                <X />
              </Button>
            ) : null}
          </div>
          <Input
            type="number"
            value={block.goal === null || block.goal === undefined ? "" : String(block.goal)}
            placeholder="Set target"
            className="mt-3 rounded-2xl font-mono font-bold"
            aria-label="Tracker goal"
            onChange={(event) =>
              mutateTypedBlock(tabId, block.id, "tracker", (entry) => {
                const nextValue = event.target.value;
                entry.goal = nextValue === "" ? null : toNumber(nextValue, 0);
              })
            }
          />
        </div>
      </div>

      {chartHeights.length > 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-muted/20 bg-background/40 p-8 shadow-inner">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-50" />
          <div className="relative flex h-36 items-end gap-2 lg:gap-3">
            {chartHeights.map((point, index) => (
              <div
                key={`${block.id}-chart-${index}`}
                className="group relative min-w-2 flex-1 rounded-t-full bg-primary/20 transition-all hover:bg-primary/60"
                style={{ height: `${point}%` }}
              >
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {block.entries[index]?.value}
                </div>
              </div>
            ))}
          </div>
          {goalPosition !== null ? (
            <div
              className="pointer-events-none absolute inset-x-8"
              style={{ bottom: `calc(2rem + ${goalPosition}%)` }}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-warning px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.2em] text-white">
                  Goal {formatStatValue(block.goal)}
                </span>
                <div className="h-px flex-1 border-t border-dashed border-warning/70" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-4">
        <div className="flex items-center justify-between px-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
            Data Log
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/40">
            {block.entries.length} entries
          </p>
        </div>
        <div className="space-y-2">
          {block.entries.map((entry) => (
            <div
              key={entry.id}
              className="group flex items-center gap-4 rounded-2xl border border-muted/20 bg-background/40 p-3 transition-all hover:border-primary/20 hover:bg-background/60"
            >
              <div className="min-w-0 flex-1">
                <Input
                  value={entry.label}
                  placeholder="Entry context..."
                  className="w-full border-0 bg-transparent px-0 text-sm leading-tight font-bold shadow-none focus-visible:ring-0"
                  onChange={(event) =>
                    mutateTrackerEntry(tabId, block.id, entry.id, (item) => {
                      item.label = event.target.value.slice(0, 120);
                    })
                  }
                />
                <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground/40">
                  {formatDateTime(entry.createdAt)}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  step={0.1}
                  value={String(entry.value)}
                  className="w-24 rounded-xl font-mono font-bold"
                  aria-label="Entry value"
                  onChange={(event) =>
                    mutateTrackerEntry(tabId, block.id, entry.id, (item) => {
                      item.value = toNumber(event.target.value);
                    })
                  }
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="rounded-lg text-muted-foreground/70 hover:text-destructive"
                  aria-label={`Remove ${entry.label || "tracker"} entry`}
                  onClick={() => removeTrackerEntry(tabId, block.id, entry.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
          ))}
          {block.entries.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-muted/20 bg-muted/5 py-12 text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/60">
                No data entries
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
