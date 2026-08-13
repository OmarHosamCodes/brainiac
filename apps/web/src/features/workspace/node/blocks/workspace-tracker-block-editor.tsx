import { getTrackerTrend, type WorkspaceTrackerBlock } from "@orch/workspace";
import { Minus, Plus, Trash2, TrendingDown, TrendingUp, X } from "lucide-react";
import { useMemo } from "react";

import type { WorkspaceBlockEditorProps } from "@/features/workspace/node/block-editor-props";
import { useWorkspaceNodeEditorContext } from "@/features/workspace/node/context";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
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
      (block.entries.reduce((sum, entry) => sum + entry.value, 0) / block.entries.length).toFixed(
        1,
      ),
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
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-toned">
          <span>Latest {latestEntry ? formatStatValue(latestEntry.value) : "None"}</span>
          <span>Avg {formatStatValue(averageValue)}</span>
          <span className="inline-flex items-center gap-1">
            <TrendIcon
              className={cn(
                "size-4",
                trend.direction === "up"
                  ? "text-success"
                  : trend.direction === "down"
                    ? "text-destructive"
                    : "text-muted-foreground",
              )}
            />
            {trend.delta > 0 ? "+" : ""}
            {formatStatValue(trend.delta)}
          </span>
          <label className="inline-flex items-center gap-2">
            <span>Goal</span>
            <Input
              type="number"
              value={block.goal === null || block.goal === undefined ? "" : String(block.goal)}
              placeholder="Set target"
              className="h-8 w-24 rounded-xl"
              aria-label="Tracker goal"
              onChange={(event) =>
                mutateTypedBlock(tabId, block.id, "tracker", (entry) => {
                  const nextValue = event.target.value;
                  entry.goal = nextValue === "" ? null : toNumber(nextValue, 0);
                })
              }
            />
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
          </label>
        </div>
        {block.entries.length > 0 ? (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="rounded-full px-4"
            aria-label="Add tracker entry"
            onClick={() => addTrackerEntry(tabId, block.id)}
          >
            <Plus />
            Add entry
          </Button>
        ) : null}
      </div>

      {chartHeights.length > 0 ? (
        <div className="relative overflow-hidden rounded-xl border border-muted p-6">
          <div className="relative flex h-36 items-end gap-2 lg:gap-3">
            {chartHeights.map((point, index) => (
              <div
                key={`${block.id}-chart-${index}`}
                className="flex min-w-2 flex-1 flex-col items-center justify-end gap-1"
                style={{ height: "100%" }}
              >
                <span className="text-xs font-semibold text-foreground">
                  {block.entries[index]?.value}
                </span>
                <div
                  className="w-full rounded-t-md bg-primary/30"
                  style={{ height: `${point}%` }}
                />
              </div>
            ))}
          </div>
          {goalPosition !== null ? (
            <div
              className="pointer-events-none absolute inset-x-6"
              style={{ bottom: `calc(1.5rem + ${goalPosition}%)` }}
            >
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-warning/40 bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
                  Goal {formatStatValue(block.goal)}
                </span>
                <div className="h-px flex-1 border-t border-dashed border-warning/70" />
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2">
        {block.entries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center gap-4 rounded-xl border border-muted p-3"
          >
            <div className="min-w-0 flex-1">
              <Input
                value={entry.label}
                placeholder="Entry context..."
                className="w-full border-0 bg-transparent px-0 text-sm leading-tight font-semibold shadow-none focus-visible:ring-0"
                onChange={(event) =>
                  mutateTrackerEntry(tabId, block.id, entry.id, (item) => {
                    item.label = event.target.value.slice(0, 120);
                  })
                }
              />
              <p className="text-xs text-muted-foreground">{formatDateTime(entry.createdAt)}</p>
            </div>
            <div className="flex items-center gap-3">
              <Input
                type="number"
                step={0.1}
                value={String(entry.value)}
                className="w-24 rounded-xl font-mono font-semibold"
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
                className="rounded-lg text-toned hover:text-destructive"
                aria-label={`Remove ${entry.label || "tracker"} entry`}
                onClick={() => removeTrackerEntry(tabId, block.id, entry.id)}
              >
                <Trash2 />
              </Button>
            </div>
          </div>
        ))}
        {block.entries.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">No entries yet.</p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="mt-3 rounded-full px-4"
              aria-label="Add tracker entry"
              onClick={() => addTrackerEntry(tabId, block.id)}
            >
              <Plus />
              Add entry
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
