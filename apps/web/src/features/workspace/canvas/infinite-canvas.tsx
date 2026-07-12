import "@xyflow/react/dist/style.css";
import "@/styles/workspace-flow.css";

import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useViewport,
  type Connection,
  type NodeChange,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { LayoutGrid, Link2, Minus, Plus, Scan } from "lucide-react";

import { CanvasFlowProvider } from "@/features/workspace/canvas/canvas-flow-context";
import { WorkspaceFlowEdge } from "@/features/workspace/canvas/workspace-flow-edge";
import { WorkspaceFlowNode } from "@/features/workspace/canvas/workspace-flow-node";
import { Button } from "@/ui/button";
import { useCanvasKeyboard } from "@/features/workspace/canvas/use-canvas-keyboard";
import { useTheme } from "@/stores/theme";
import type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
import {
  applyFlowChangesToWorkspaceNodes,
  flowConnectToPair,
  isValidWorkspaceConnection,
  workspaceNodesToFlow,
  WORKSPACE_FLOW_EDGE_TYPE,
  WORKSPACE_FLOW_NODE_TYPE,
} from "@/features/workspace/canvas/workspace-flow-adapter";
import {
  dashboardEmptyPanelClass,
  dashboardFocusRingClass,
} from "@/features/dashboard/dashboard-ui";
import {
  getCanonicalConnectionPair,
  getEligibleConnectionTargetIds,
} from "@/features/workspace/utils/workspace-node-connections";
import { cn } from "@/lib/utils";

export type InfiniteCanvasProps = {
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

const FIT_PADDING = 0.15;

const nodeTypes = {
  [WORKSPACE_FLOW_NODE_TYPE]: WorkspaceFlowNode,
};

const edgeTypes = {
  [WORKSPACE_FLOW_EDGE_TYPE]: WorkspaceFlowEdge,
};

type InfiniteCanvasInnerProps = InfiniteCanvasProps;

const InfiniteCanvasInner = forwardRef<InfiniteCanvasHandle, InfiniteCanvasInnerProps>(
  function InfiniteCanvasInner(
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
    const hasFittedRef = useRef(false);
    const { isDark } = useTheme();
    const reactFlow = useReactFlow();
    const { zoom } = useViewport();
    const { zoomIn, zoomOut, fitView, screenToFlowPosition } = reactFlow;

    const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);

    const { flowNodes, flowEdges } = useMemo(
      () => workspaceNodesToFlow(nodes, selectedNodeIds),
      [nodes, selectedNodeIds],
    );

    const connectCandidate = useMemo(() => {
      if (selectedNodeIds.length !== 2) {
        return null;
      }

      const [first, second] = selectedNodeIds;
      const sourceNode = first ? nodeById.get(first) : undefined;
      const targetNode = second ? nodeById.get(second) : undefined;
      const pair = getCanonicalConnectionPair(sourceNode, targetNode);
      if (!pair) {
        return null;
      }

      const eligible = getEligibleConnectionTargetIds(nodes, pair.orchestratorNodeId);
      return eligible.includes(pair.standardNodeId) ? pair : null;
    }, [nodeById, nodes, selectedNodeIds]);

    const zoomPercent = Math.round(zoom * 100);

    const fitAllNodes = useCallback(() => {
      if (nodes.length === 0) {
        reactFlow.setViewport({ x: 0, y: 0, zoom: 1 });
        return;
      }

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      void fitView({ padding: FIT_PADDING, duration: reducedMotion ? 0 : 200 });
    }, [fitView, nodes.length, reactFlow]);

    const createNodeAtViewportCenter = useCallback(() => {
      const shell = shellRef.current;
      if (!shell) {
        return;
      }

      const rect = shell.getBoundingClientRect();
      const worldPoint = screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
      onCreateNode(worldPoint);
    }, [onCreateNode, screenToFlowPosition]);

    const fitNode = useCallback(
      (nodeId: string) => {
        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        void fitView({
          nodes: [{ id: nodeId }],
          padding: FIT_PADDING,
          duration: reducedMotion ? 0 : 200,
        });
      },
      [fitView],
    );

    useImperativeHandle(ref, () => ({ fitAllNodes, createNodeAtViewportCenter }), [
      createNodeAtViewportCenter,
      fitAllNodes,
    ]);

    useEffect(() => {
      if (loading) {
        return;
      }

      if (nodes.length === 0) {
        hasFittedRef.current = false;
        return;
      }

      if (hasFittedRef.current) {
        return;
      }

      const frame = window.requestAnimationFrame(() => {
        fitAllNodes();
        hasFittedRef.current = true;
      });

      return () => window.cancelAnimationFrame(frame);
    }, [fitAllNodes, loading, nodes.length]);

    const propagateGeometryChanges = useCallback(
      (changes: NodeChange[]) => {
        const geometryChanges = changes.filter(
          (change) => change.type === "position" || change.type === "dimensions",
        );
        if (geometryChanges.length === 0) {
          return;
        }

        const updated = applyFlowChangesToWorkspaceNodes(nodes, geometryChanges);
        if (updated) {
          onNodesChange(updated);
        }
      },
      [nodes, onNodesChange],
    );

    const handleNodesChange = useCallback(
      (changes: NodeChange[]) => {
        propagateGeometryChanges(changes);
      },
      [propagateGeometryChanges],
    );

    const handleSelectionChange = useCallback(
      ({ nodes: selectedNodes }: OnSelectionChangeParams) => {
        onSelectedNodeIdsChange(selectedNodes.map((node) => node.id));
      },
      [onSelectedNodeIdsChange],
    );

    const handleConnect = useCallback(
      (connection: Connection) => {
        const pair = flowConnectToPair(connection, nodes);
        if (pair) {
          onConnectNodePair(pair);
        }
      },
      [nodes, onConnectNodePair],
    );

    const handlePaneContextMenu = useCallback(
      (event: MouseEvent | React.MouseEvent) => {
        event.preventDefault();
        const worldPoint = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        onCreateNode(worldPoint);
      },
      [onCreateNode, screenToFlowPosition],
    );

    const handleNudgeNodes = useCallback(
      (deltaX: number, deltaY: number) => {
        if (selectedNodeIds.length === 0) {
          return;
        }

        const selectedSet = new Set(selectedNodeIds);
        onNodesChange(
          nodes.map((node) =>
            selectedSet.has(node.id) ? { ...node, x: node.x + deltaX, y: node.y + deltaY } : node,
          ),
        );
      },
      [nodes, onNodesChange, selectedNodeIds],
    );

    useCanvasKeyboard({
      containerRef: shellRef,
      reactFlow,
      selectedNodeIds,
      onSelectedNodeIdsChange,
      onRemoveNode,
      onFitAll: fitAllNodes,
      onNudgeNodes: handleNudgeNodes,
    });

    const flowContextValue = useMemo(
      () => ({
        nodes,
        renderNode,
        onEditNode,
        onRemoveNode,
        onOpenNode,
        onFitNode: fitNode,
        onDisconnectNodePair,
      }),
      [fitNode, nodes, onDisconnectNodePair, onEditNode, onOpenNode, onRemoveNode, renderNode],
    );

    const controlButtonClass = cn(
      "inline-flex size-10 items-center justify-center rounded-2xl border border-default bg-elevated text-highlighted transition hover:border-primary/60 hover:bg-default disabled:opacity-50",
      dashboardFocusRingClass,
    );

    return (
      <CanvasFlowProvider value={flowContextValue}>
        <div
          ref={shellRef}
          className="workspace-shell relative h-full w-full overflow-hidden bg-default"
          tabIndex={0}
          role="application"
          aria-label="Workspace canvas"
          onPointerDown={() => shellRef.current?.focus({ preventScroll: true })}
        >
          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            colorMode={isDark ? "dark" : "light"}
            onNodesChange={handleNodesChange}
            onSelectionChange={handleSelectionChange}
            onConnect={handleConnect}
            onNodeDoubleClick={(_event, node) => onOpenNode({ nodeId: node.id })}
            onPaneContextMenu={handlePaneContextMenu}
            isValidConnection={(connection) =>
              isValidWorkspaceConnection(
                {
                  source: connection.source,
                  target: connection.target,
                  sourceHandle: connection.sourceHandle ?? null,
                  targetHandle: connection.targetHandle ?? null,
                },
                nodes,
              )
            }
            fitView={false}
            minZoom={0.25}
            maxZoom={3}
            panOnScroll={false}
            zoomOnScroll
            zoomOnPinch
            zoomOnDoubleClick={false}
            panOnDrag={[1, 2]}
            panActivationKeyCode="Space"
            selectionOnDrag={false}
            multiSelectionKeyCode="Shift"
            onlyRenderVisibleElements={nodes.length > 40}
            nodesDraggable={!loading}
            nodesConnectable={!loading}
            elementsSelectable={!loading}
            edgesFocusable={false}
            edgesReconnectable={false}
            deleteKeyCode={null}
            proOptions={{ hideAttribution: true }}
            className={cn(
              "workspace-flow h-full w-full",
              loading && "pointer-events-none opacity-60",
            )}
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={28}
              size={1}
              color={isDark ? "oklch(0.55 0.01 285 / 0.35)" : "oklch(0.55 0.01 285 / 0.2)"}
            />

            <Panel position="bottom-center" className="!mb-8 flex items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full border border-default bg-elevated p-1.5 shadow-sm">
                <button
                  type="button"
                  className={controlButtonClass}
                  aria-label="Zoom out"
                  onClick={() => {
                    const reducedMotion = window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches;
                    void zoomOut({ duration: reducedMotion ? 0 : 150 });
                  }}
                >
                  <Minus className="size-4" />
                </button>
                <div className="w-12 px-3 text-center text-xs font-bold tabular-nums text-muted">
                  {zoomPercent}%
                </div>
                <button
                  type="button"
                  className={controlButtonClass}
                  aria-label="Zoom in"
                  onClick={() => {
                    const reducedMotion = window.matchMedia(
                      "(prefers-reduced-motion: reduce)",
                    ).matches;
                    void zoomIn({ duration: reducedMotion ? 0 : 150 });
                  }}
                >
                  <Plus className="size-4" />
                </button>
                <div className="mx-1 h-4 w-px bg-default" />
                <button
                  type="button"
                  className={controlButtonClass}
                  aria-label="Fit all nodes"
                  onClick={fitAllNodes}
                >
                  <Scan className="size-4" />
                </button>
              </div>
            </Panel>

            <Panel position="bottom-right" className="!mb-8 !mr-4">
              <MiniMap
                aria-label="Board overview"
                className="!rounded-2xl !border !border-default !bg-elevated/95 !shadow-sm"
                maskColor="oklch(0.488 0.243 264.376 / 0.12)"
                nodeColor={() => "oklch(0.488 0.243 264.376 / 0.45)"}
                nodeStrokeColor="oklch(0.488 0.243 264.376 / 0.65)"
                pannable
                zoomable
              />
            </Panel>
          </ReactFlow>

          {loading ? (
            <div className="pointer-events-none absolute inset-0 z-50 flex items-end justify-center pb-8">
              <span className="rounded-full border border-default bg-elevated px-3 py-1.5 text-[11px] font-bold text-muted">
                Loading workspace…
              </span>
            </div>
          ) : null}

          {!loading && nodes.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center px-6">
              <div
                className={cn(dashboardEmptyPanelClass, "pointer-events-auto max-w-sm text-center")}
              >
                <LayoutGrid className="mx-auto size-7 text-muted" />
                <h3 className="mt-4 text-lg font-bold text-highlighted">No nodes yet</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Right-click the canvas to add a node, or use the button below.
                </p>
                <Button
                  className="mt-4"
                  variant="secondary"
                  size="sm"
                  onClick={createNodeAtViewportCenter}
                >
                  <Plus className="size-4" />
                  Add node
                </Button>
              </div>
            </div>
          ) : null}

          {connectCandidate ? (
            <div className="pointer-events-none absolute bottom-24 left-1/2 z-20 flex -translate-x-1/2 items-center">
              <Button
                variant="default"
                size="sm"
                className="pointer-events-auto rounded-full"
                onClick={() => onConnectNodePair(connectCandidate)}
              >
                <Link2 className="size-4" />
                Connect nodes
              </Button>
            </div>
          ) : null}
        </div>
      </CanvasFlowProvider>
    );
  },
);

export const InfiniteCanvas = forwardRef<InfiniteCanvasHandle, InfiniteCanvasProps>(
  function InfiniteCanvas(props, ref) {
    return (
      <ReactFlowProvider>
        <InfiniteCanvasInner ref={ref} {...props} />
      </ReactFlowProvider>
    );
  },
);

// Re-export for consumers that imported from use-canvas
export type { CanvasNodeModel } from "@/features/workspace/canvas/canvas-types";
