import { useMemo } from "react";

import { MarketingNodeCard } from "@/components/marketing/marketing-node-card";
import { marketingWorkspaceNodes } from "@/components/marketing/marketing-demo-data";
import { cn } from "@/lib/utils";

/** Logical canvas size before scale-to-fit */
const SCENE_WIDTH = 620;
const SCENE_HEIGHT = 428;
const SCENE_SCALE = 0.5;

const NODE_LAYOUT = [
  { id: "marketing-launch", left: 16, top: 20 },
  { id: "marketing-research", left: 328, top: 8 },
  { id: "marketing-ops", left: 288, top: 220 },
] as const;

const EDGES = [
  { from: "marketing-launch", to: "marketing-research" },
  { from: "marketing-launch", to: "marketing-ops" },
] as const;

function nodeCenter(nodeId: string) {
  const node = marketingWorkspaceNodes.find((entry) => entry.id === nodeId);
  const layout = NODE_LAYOUT.find((entry) => entry.id === nodeId);
  if (!node || !layout) return { x: 0, y: 0 };
  return {
    x: layout.left + node.width / 2,
    y: layout.top + node.height / 2,
  };
}

export function LandingWorkspaceVignette({ className }: { className?: string }) {
  const nodesById = useMemo(
    () => new Map(marketingWorkspaceNodes.map((node) => [node.id, node])),
    [],
  );

  return (
    <div
      className={cn(
        "relative h-[320px] w-full min-w-0 max-w-lg overflow-hidden rounded-2xl border border-default bg-default",
        className,
      )}
    >
      <div
        className="absolute inset-0 dark:opacity-60"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.55 0.01 285 / 0.28) 1px, transparent 0)",
          backgroundSize: "20px 20px",
        }}
        aria-hidden="true"
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
              aria-hidden="true"
            >
              {EDGES.map((edge) => {
                const from = nodeCenter(edge.from);
                const to = nodeCenter(edge.to);
                return (
                  <line
                    key={`${edge.from}-${edge.to}`}
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke="color-mix(in oklab, var(--chart-2) 50%, transparent)"
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

              return (
                <div
                  key={layout.id}
                  className={cn(
                    "absolute",
                    selected && "z-10 ring-2 ring-primary/35 ring-offset-2 ring-offset-default",
                  )}
                  style={{
                    left: layout.left,
                    top: layout.top,
                    width: node.width,
                    height: node.height,
                  }}
                >
                  <div className="h-full overflow-hidden">
                    <MarketingNodeCard node={node} selected={selected} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
