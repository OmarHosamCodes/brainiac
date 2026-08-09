import type { WorkspaceNode } from "@orch/workspace";
import { getSmoothStepPath, Position } from "@xyflow/react";
import { Minus, Pencil, Plus, Scan, ScanSearch, Trash2 } from "lucide-react";
import { useMemo, type ReactNode } from "react";

import { marketingWorkspaceNodes } from "@/components/marketing/marketing-demo-data";
import { shellChromePanelClass } from "@/features/app-shell/app-shell-ui";
import { getWorkspaceNodeTintStyle } from "@/features/workspace/utils/workspace-node-dashboard";
import { WorkspaceNodeCard } from "@/features/workspace/workspace-node-card";
import { cn } from "@/lib/utils";

const SCENE_WIDTH = 760;
const SCENE_HEIGHT = 520;
const SCENE_SCALE = 0.62;
const CHROME_HEADER = 56;

const NODE_LAYOUT = [
  { id: "marketing-launch", left: 24, top: 28 },
  { id: "marketing-research", left: 400, top: 12 },
  { id: "marketing-ops", left: 360, top: 268 },
] as const;

const EDGES = [
  { from: "marketing-launch", to: "marketing-research" },
  { from: "marketing-launch", to: "marketing-ops" },
] as const;

const chromeIconClass =
  "inline-flex size-8 items-center justify-center rounded-xl border border-default bg-default text-toned";

const zoomButtonClass = "inline-flex size-8 items-center justify-center rounded-full text-muted";

function nodeBox(nodeId: string) {
  const node = marketingWorkspaceNodes.find((entry) => entry.id === nodeId);
  const layout = NODE_LAYOUT.find((entry) => entry.id === nodeId);
  if (!node || !layout) return { x: 0, y: 0, w: 0, h: 0 };
  return {
    x: layout.left,
    y: layout.top,
    w: node.width,
    h: node.height + CHROME_HEADER,
  };
}

function MarketingFlowNodeChrome({
  title,
  selected,
  orchestrator,
  tint,
  children,
}: {
  title: string;
  selected: boolean;
  orchestrator: boolean;
  tint: WorkspaceNode["dashboard"]["tint"];
  children: ReactNode;
}) {
  return (
    <div className="relative h-full w-full">
      {orchestrator ? (
        <span className="absolute top-1/2 -right-1 z-10 size-2.5 -translate-y-1/2 rounded-full border border-primary bg-primary" />
      ) : (
        <span className="absolute top-1/2 -left-1 z-10 size-2.5 -translate-y-1/2 rounded-full border border-primary bg-default" />
      )}
      <div
        className={cn(
          "flex h-full w-full min-h-0 flex-col overflow-hidden rounded-2xl border border-default bg-default",
          selected && "ring-2 ring-primary/40",
        )}
        style={getWorkspaceNodeTintStyle(tint)}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-default bg-muted px-4 py-3">
          <h3 className="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
            {title}
          </h3>
          <div className="flex shrink-0 items-center gap-1">
            <span className={chromeIconClass}>
              <Pencil className="size-4" />
            </span>
            <span className={chromeIconClass}>
              <Trash2 className="size-4" />
            </span>
            <span className={chromeIconClass}>
              <ScanSearch className="size-4" />
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-hidden p-1">{children}</div>
      </div>
    </div>
  );
}

export function LandingWorkspaceVignette({ className }: { className?: string }) {
  const nodesById = useMemo(
    () => new Map(marketingWorkspaceNodes.map((node) => [node.id, node])),
    [],
  );

  return (
    <div
      className={cn(
        "relative h-[380px] w-full min-w-0 overflow-hidden rounded-2xl border border-default bg-background",
        className,
      )}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.55 0.01 285 / 0.28) 1px, transparent 0)",
          backgroundSize: "28px 28px",
        }}
      />

      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="relative shrink-0"
          style={{
            width: SCENE_WIDTH * SCENE_SCALE,
            height: SCENE_HEIGHT * SCENE_SCALE,
          }}
        >
          <div
            className="pointer-events-none absolute top-0 left-0 origin-top-left"
            style={{
              width: SCENE_WIDTH,
              height: SCENE_HEIGHT,
              transform: `scale(${SCENE_SCALE})`,
            }}
          >
            <svg
              className="absolute inset-0 overflow-visible"
              width={SCENE_WIDTH}
              height={SCENE_HEIGHT}
              aria-hidden
            >
              {EDGES.map((edge) => {
                const from = nodeBox(edge.from);
                const to = nodeBox(edge.to);
                const [path] = getSmoothStepPath({
                  sourceX: from.x + from.w,
                  sourceY: from.y + from.h / 2,
                  targetX: to.x,
                  targetY: to.y + to.h / 2,
                  sourcePosition: Position.Right,
                  targetPosition: Position.Left,
                  borderRadius: 12,
                });
                return (
                  <path
                    key={`${edge.from}-${edge.to}`}
                    d={path}
                    fill="none"
                    className="stroke-primary/50"
                    strokeWidth="2"
                    strokeDasharray="6 6"
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>

            {NODE_LAYOUT.map((layout) => {
              const node = nodesById.get(layout.id);
              if (!node) return null;
              const selected = layout.id === "marketing-launch";
              const box = nodeBox(layout.id);

              return (
                <div
                  key={layout.id}
                  className={cn("absolute", selected && "z-10")}
                  style={{
                    left: layout.left,
                    top: layout.top,
                    width: box.w,
                    height: box.h,
                  }}
                >
                  <MarketingFlowNodeChrome
                    title={node.title}
                    selected={selected}
                    orchestrator={node.nodeType === "orchestrator"}
                    tint={node.dashboard.tint}
                  >
                    <WorkspaceNodeCard
                      node={node}
                      selected={selected}
                      allNodes={marketingWorkspaceNodes}
                    />
                  </MarketingFlowNodeChrome>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="absolute bottom-3 left-3">
        <div
          className={cn(
            shellChromePanelClass,
            "flex flex-col items-center gap-1 rounded-[14px] p-1.5",
          )}
        >
          <span className={zoomButtonClass}>
            <Plus className="size-4" />
          </span>
          <span className={zoomButtonClass}>
            <Minus className="size-4" />
          </span>
          <span className={zoomButtonClass}>
            <Scan className="size-4" />
          </span>
        </div>
      </div>
    </div>
  );
}
