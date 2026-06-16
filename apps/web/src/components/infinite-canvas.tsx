import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LayoutGrid,
  Link2,
  Minus,
  Pencil,
  Plus,
  Scan,
  ScanSearch,
  Trash2,
  Unlink,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useCanvas, type CanvasNodeModel, type CanvasRect } from "@/hooks/use-canvas";
import { dashboardEmptyPanelClass, dashboardFocusRingClass } from "@/lib/utils/dashboard-ui";
import {
  getCanonicalConnectionPair,
  getEligibleConnectionTargetIds,
} from "@/lib/utils/workspace-node-connections";
import { getWorkspaceNodeTintStyle } from "@/lib/utils/workspace-node-dashboard";
import { cn } from "@/lib/utils";

type InfiniteCanvasProps = {
  nodes: CanvasNodeModel[];
  selectedNodeIds?: string[];
  loading?: boolean;
  onNodesChange: (nodes: CanvasNodeModel[]) => void;
  onSelectedNodeIdsChange: (selectedNodeIds: string[]) => void;
  onCreateNode: (payload: { x: number; y: number }) => void;
  onEditNode: (payload: { nodeId: string }) => void;
  onConnectNodePair: (payload: { orchestratorNodeId: string; standardNodeId: string }) => void;
  onDisconnectNodePair: (payload: { orchestratorNodeId: string; standardNodeId: string }) => void;
  onRemoveNode: (payload: { nodeId: string }) => void;
  onOpenNode: (payload: { nodeId: string }) => void;
  renderNode: (node: CanvasNodeModel, selected: boolean, allNodes: CanvasNodeModel[]) => ReactNode;
};

export type InfiniteCanvasHandle = {
  fitAllNodes: () => void;
  createNodeAtViewportCenter: () => void;
};

const FIT_PADDING = 120;
const NODE_MIN_WIDTH = 260;
const NODE_MIN_HEIGHT = 180;
const DRAG_THRESHOLD_PX = 6;

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  function InfiniteCanvas(
    {
      nodes,
      selectedNodeIds = [],
      loading = false,
      onNodesChange,
      onSelectedNodeIdsChange,
      onCreateNode,
      onEditNode,
      onConnectNodePair,
      onDisconnectNodePair,
      onRemoveNode,
      onOpenNode,
      renderNode,
    },
    ref,
  ) {
    const shellRef = useRef<HTMLDivElement | null>(null);
    const viewportRef = useRef<HTMLDivElement | null>(null);
    const canvas = useCanvas(viewportRef);

    const selectedSet = useMemo(() => new Set(selectedNodeIds), [selectedNodeIds]);
    const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

    const connectionSegments = useMemo(() => {
      const segments: {
        orchestratorNodeId: string;
        standardNodeId: string;
        x1: number;
        y1: number;
        x2: number;
        y2: number;
      }[] = [];

      for (const node of nodes) {
        if (node.nodeType !== "orchestrator" || !node.connections?.length) continue;
        const x1 = node.x + node.width / 2;
        const y1 = node.y + node.height / 2;
        for (const connection of node.connections) {
          const target = nodeById.get(connection.targetNodeId);
          if (!target) continue;
          segments.push({
            orchestratorNodeId: node.id,
            standardNodeId: target.id,
            x1,
            y1,
            x2: target.x + target.width / 2,
            y2: target.y + target.height / 2,
          });
        }
      }

      return segments;
    }, [nodes, nodeById]);

    const connectCandidate = useMemo(() => {
      if (selectedNodeIds.length !== 2) return null;
      const [first, second] = selectedNodeIds;
      const sourceNode = first ? nodeById.get(first) : undefined;
      const targetNode = second ? nodeById.get(second) : undefined;
      const pair = getCanonicalConnectionPair(sourceNode, targetNode);
      if (!pair) return null;
      const eligible = getEligibleConnectionTargetIds(nodes, pair.orchestratorNodeId);
      return eligible.includes(pair.standardNodeId) ? pair : null;
    }, [nodes, nodeById, selectedNodeIds]);

    const [activeInteraction, setActiveInteraction] = useState<{
      mode: "drag" | "resize";
      nodeId: string;
      pointerId: number;
      startClientX: number;
      startClientY: number;
      selectedIds: string[];
      startNodes: Map<string, CanvasNodeModel>;
      handle?: "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
    } | null>(null);

    const [pendingDrag, setPendingDrag] = useState<{
      nodeId: string;
      pointerId: number;
      startClientX: number;
      startClientY: number;
      selectedIds: string[];
      startNodes: Map<string, CanvasNodeModel>;
    } | null>(null);

    const updateNodes = useCallback(
      (nextNodes: CanvasNodeModel[]) => {
        onNodesChange(
          nextNodes.map((node) => ({
            ...node,
            minWidth: node.minWidth ?? NODE_MIN_WIDTH,
            minHeight: node.minHeight ?? NODE_MIN_HEIGHT,
          })),
        );
      },
      [onNodesChange],
    );

    const setSelection = useCallback(
      (next: string[]) => onSelectedNodeIdsChange([...new Set(next)]),
      [onSelectedNodeIdsChange],
    );

    const selectNode = useCallback(
      (nodeId: string, toggle = false) => {
        if (toggle) {
          if (selectedSet.has(nodeId)) {
            setSelection(selectedNodeIds.filter((id) => id !== nodeId));
          } else {
            setSelection([...selectedNodeIds, nodeId]);
          }
          return;
        }

        if (selectedNodeIds.length !== 1 || selectedNodeIds[0] !== nodeId) {
          setSelection([nodeId]);
        }
      },
      [selectedNodeIds, selectedSet, setSelection],
    );

    const createRectUnion = useCallback((rects: CanvasRect[]) => {
      const [first, ...rest] = rects;
      if (!first) return null;
      let minX = first.x;
      let minY = first.y;
      let maxX = first.x + first.width;
      let maxY = first.y + first.height;
      for (const rect of rest) {
        minX = Math.min(minX, rect.x);
        minY = Math.min(minY, rect.y);
        maxX = Math.max(maxX, rect.x + rect.width);
        maxY = Math.max(maxY, rect.y + rect.height);
      }
      return { x: minX, y: minY, width: Math.max(maxX - minX, 1), height: Math.max(maxY - minY, 1) };
    }, []);

    const fitAllNodes = useCallback(() => {
      const bounds = createRectUnion(nodes);
      if (bounds) {
        canvas.fitToRect(bounds, FIT_PADDING);
        return;
      }
      canvas.resetView();
    }, [canvas, createRectUnion, nodes]);

    const createNodeAtViewportCenter = useCallback(() => {
      const viewport = viewportRef.current;
      if (!viewport) return;
      const rect = viewport.getBoundingClientRect();
      const worldPoint = canvas.screenToWorld(rect.left + rect.width / 2, rect.top + rect.height / 2);
      if (!worldPoint) return;
      onCreateNode(worldPoint);
    }, [canvas, onCreateNode]);

    useImperativeHandle(ref, () => ({ fitAllNodes, createNodeAtViewportCenter }), [
      createNodeAtViewportCenter,
      fitAllNodes,
    ]);

    useEffect(() => {
      const onMove = (event: PointerEvent) => {
        const pending = pendingDrag;
        if (pending && pending.pointerId === event.pointerId && !activeInteraction) {
          const dx = event.clientX - pending.startClientX;
          const dy = event.clientY - pending.startClientY;
          if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
            setActiveInteraction({
              mode: "drag",
              nodeId: pending.nodeId,
              pointerId: pending.pointerId,
              startClientX: pending.startClientX,
              startClientY: pending.startClientY,
              selectedIds: pending.selectedIds,
              startNodes: pending.startNodes,
            });
            setPendingDrag(null);
          }
        }

        const interaction = activeInteraction;
        if (!interaction || interaction.pointerId !== event.pointerId) return;

        const deltaX = (event.clientX - interaction.startClientX) / canvas.camera.zoom;
        const deltaY = (event.clientY - interaction.startClientY) / canvas.camera.zoom;

        if (interaction.mode === "drag") {
          updateNodes(
            nodes.map((node) => {
              const startNode = interaction.startNodes.get(node.id);
              if (!startNode) return node;
              return { ...node, x: startNode.x + deltaX, y: startNode.y + deltaY };
            }),
          );
        }
      };

      const onUp = (event: PointerEvent) => {
        if (pendingDrag?.pointerId === event.pointerId) {
          setPendingDrag(null);
        }
        if (activeInteraction?.pointerId === event.pointerId) {
          setActiveInteraction(null);
        }
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
      return () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
      };
    }, [activeInteraction, canvas.camera.zoom, nodes, pendingDrag, updateNodes]);

    const controlButtonClass = cn(
      "inline-flex size-10 items-center justify-center rounded-2xl border border-default bg-elevated text-highlighted transition hover:border-primary/60 hover:bg-default disabled:opacity-50",
      dashboardFocusRingClass,
    );

    return (
      <div ref={shellRef} className="workspace-shell relative h-full w-full overflow-hidden">
        <div
          ref={viewportRef}
          className={cn(
            "canvas-viewport absolute inset-0 bg-[radial-gradient(circle,rgba(120,120,120,0.08)_1px,transparent_1px)]",
            canvas.isPanning && "is-grabbing cursor-grabbing",
            !canvas.isPanning && canvas.isSpacePressed && "is-grab-ready cursor-grab",
            loading && "canvas-viewport-loading pointer-events-none",
          )}
          style={canvas.backgroundStyle}
          onContextMenu={(event) => {
            const worldPoint = canvas.screenToWorld(event.clientX, event.clientY);
            if (!worldPoint) return;
            if (event.target === event.currentTarget) {
              onCreateNode(worldPoint);
            }
          }}
          onWheel={(event) => canvas.onWheel(event.nativeEvent)}
          onPointerDown={(event) => {
            const target = event.target as HTMLElement;
            const onNode = Boolean(target.closest("[data-canvas-node]"));
            if (event.button === 0 && !canvas.isSpacePressed && !onNode) {
              setSelection([]);
            }
            canvas.onPointerDown(event.nativeEvent, {
              allowPrimaryPan: event.button === 0 && !canvas.isSpacePressed && !onNode,
            });
          }}
          onPointerMove={(event) => canvas.onPointerMove(event.nativeEvent)}
          onPointerUp={(event) => canvas.onPointerUp(event.nativeEvent)}
          onLostPointerCapture={() => canvas.onLostPointerCapture()}
        >
          <div className="canvas-plane absolute inset-0 origin-top-left" style={canvas.canvasStyle}>
            {connectionSegments.length > 0 ? (
              <svg
                className="pointer-events-none absolute inset-0 overflow-visible"
                style={{ width: 1, height: 1 }}
                aria-hidden="true"
              >
                {connectionSegments.map((segment) => (
                  <line
                    key={`${segment.orchestratorNodeId}:${segment.standardNodeId}`}
                    x1={segment.x1}
                    y1={segment.y1}
                    x2={segment.x2}
                    y2={segment.y2}
                    stroke="var(--color-primary)"
                    strokeWidth={2}
                    strokeOpacity={0.5}
                    strokeDasharray="6 6"
                  />
                ))}
              </svg>
            ) : null}

            {connectionSegments.map((segment) => (
              <button
                key={`disconnect:${segment.orchestratorNodeId}:${segment.standardNodeId}`}
                type="button"
                className="absolute z-10 inline-flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-default bg-default text-muted shadow-sm transition hover:border-error/60 hover:text-error"
                style={{ left: (segment.x1 + segment.x2) / 2, top: (segment.y1 + segment.y2) / 2 }}
                aria-label="Remove connection"
                title="Remove connection"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={(event) => {
                  event.stopPropagation();
                  onDisconnectNodePair({
                    orchestratorNodeId: segment.orchestratorNodeId,
                    standardNodeId: segment.standardNodeId,
                  });
                }}
              >
                <Unlink className="size-3" />
              </button>
            ))}

            {nodes.map((node) => (
              <article
                key={node.id}
                data-canvas-node
                data-canvas-node-id={node.id}
                className={cn("canvas-node absolute", selectedSet.has(node.id) && "is-selected")}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.width,
                  height: node.height,
                }}
              >
                <div
                  className="canvas-node-shell group relative flex h-full cursor-grab flex-col rounded-[2rem] border border-neutral-200/50 bg-white/80 shadow-2xl backdrop-blur-xl active:cursor-grabbing dark:border-neutral-800/50 dark:bg-neutral-950/80"
                  style={getWorkspaceNodeTintStyle(node.dashboard?.tint)}
                  onPointerDown={(event) => {
                    if (event.button !== 0 || canvas.isSpacePressed) return;
                    event.preventDefault();
                    event.stopPropagation();
                    const selectedIds = selectedSet.has(node.id) ? [...selectedNodeIds] : [node.id];
                    selectNode(node.id, event.shiftKey);
                    setPendingDrag({
                      nodeId: node.id,
                      pointerId: event.pointerId,
                      startClientX: event.clientX,
                      startClientY: event.clientY,
                      selectedIds,
                      startNodes: new Map(
                        nodes.filter((entry) => selectedIds.includes(entry.id)).map((entry) => [entry.id, { ...entry }]),
                      ),
                    });
                  }}
                  onDoubleClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    onOpenNode({ nodeId: node.id });
                  }}
                >
                  <div className="canvas-node-toolbar flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200/30 px-5 py-4 dark:border-neutral-800/30">
                    <h3 className="min-w-0 flex-1 truncate text-[13px] font-bold uppercase tracking-widest text-neutral-900 dark:text-neutral-100">
                      {node.title?.trim() || node.label?.trim() || "Untitled node"}
                    </h3>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 hover:text-primary dark:border-neutral-800 dark:hover:bg-neutral-800"
                        aria-label="Edit node"
                        title="Edit node"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditNode({ nodeId: node.id });
                        }}
                      >
                        <Pencil className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 hover:text-error dark:border-neutral-800 dark:hover:bg-neutral-800"
                        aria-label="Delete node"
                        title="Delete node"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          onRemoveNode({ nodeId: node.id });
                        }}
                      >
                        <Trash2 className="size-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex size-8 items-center justify-center rounded-full border border-neutral-200 text-neutral-500 transition hover:bg-neutral-100 hover:text-primary dark:border-neutral-800 dark:hover:bg-neutral-800"
                        aria-label="Focus node"
                        title="Focus node"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={(event) => {
                          event.stopPropagation();
                          canvas.fitToRect(node, FIT_PADDING);
                        }}
                      >
                        <ScanSearch className="size-4" />
                      </button>
                    </div>
                  </div>
                  <div className="canvas-node-content min-h-0 flex-1 overflow-hidden">
                    {renderNode(node, selectedSet.has(node.id), nodes)}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center pb-8">
            <span className="rounded-full border border-default bg-elevated px-3 py-1.5 text-[11px] font-bold text-muted">
              Loading workspace…
            </span>
          </div>
        ) : null}

        {!loading && nodes.length === 0 ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-6">
            <div className={cn(dashboardEmptyPanelClass, "pointer-events-auto max-w-sm text-center")}>
              <LayoutGrid className="mx-auto size-7 text-muted" />
              <h3 className="mt-4 text-lg font-bold text-highlighted">No nodes yet</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Right-click the canvas to add a node, or use the button below.
              </p>
              <Button className="mt-4" variant="secondary" size="sm" onClick={createNodeAtViewportCenter}>
                <Plus className="size-4" />
                Add node
              </Button>
            </div>
          </div>
        ) : null}

        {connectCandidate ? (
          <div className="pointer-events-none absolute bottom-24 left-1/2 flex -translate-x-1/2 items-center">
            <Button
              variant="default"
              size="sm"
              className="pointer-events-auto rounded-full shadow-lg"
              onClick={() => onConnectNodePair(connectCandidate)}
            >
              <Link2 className="size-4" />
              Connect nodes
            </Button>
          </div>
        ) : null}

        <div className="pointer-events-none absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center gap-3">
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-default bg-elevated p-1.5">
            <button type="button" className={controlButtonClass} aria-label="Zoom out" onClick={canvas.zoomOut}>
              <Minus className="size-4" />
            </button>
            <div className="w-12 px-3 text-center text-xs font-bold tabular-nums text-muted">
              {canvas.zoomPercent}%
            </div>
            <button type="button" className={controlButtonClass} aria-label="Zoom in" onClick={canvas.zoomIn}>
              <Plus className="size-4" />
            </button>
            <div className="mx-1 h-4 w-px bg-default" />
            <button type="button" className={controlButtonClass} aria-label="Fit all nodes" onClick={fitAllNodes}>
              <Scan className="size-4" />
            </button>
          </div>
        </div>
      </div>
    );
  },
);
