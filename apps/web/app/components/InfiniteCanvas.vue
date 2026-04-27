<script setup lang="ts">
import type { ContextMenuItem } from "@nuxt/ui";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  useTemplateRef,
  watch,
  type CSSProperties,
} from "vue";
import {
  useCanvas,
  type CanvasNodeModel,
  type CanvasPointerDownOptions,
  type CanvasRect,
} from "~/composables/useCanvas";
import {
  getWorkspaceNodeTintOption,
  getWorkspaceNodeTintStyle,
} from "~/utils/workspace-node-dashboard";
import {
  getCanonicalConnectionPair,
  getEligibleConnectionTargetIds,
} from "~/utils/workspace-node-connections";

type ResizeHandle = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";

type NodeInteraction = {
  mode: "drag" | "resize";
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  selectedIds: string[];
  startNodes: Map<string, CanvasNodeModel>;
  handle?: ResizeHandle;
};

type PendingNodeDrag = {
  nodeId: string;
  pointerId: number;
  startClientX: number;
  startClientY: number;
  selectedIds: string[];
  startNodes: Map<string, CanvasNodeModel>;
  /** False when Shift/Ctrl/Meta — avoid navigating on modifier clicks. */
  openOnRelease: boolean;
};

type CreateNodePayload = {
  x: number;
  y: number;
};

type ContextTarget = {
  kind: "canvas";
  worldX: number;
  worldY: number;
};
type NodeContextTarget = {
  kind: "node";
  nodeId: string;
  worldX: number;
  worldY: number;
};
type ConnectionContextTarget = {
  kind: "connection";
  orchestratorNodeId: string;
  standardNodeId: string;
  worldX: number;
  worldY: number;
};
type CanvasContextTarget = ContextTarget | NodeContextTarget | ConnectionContextTarget;
type CanvasPoint = {
  x: number;
  y: number;
};
type CanvasConnectionEdge = {
  key: string;
  orchestratorNodeId: string;
  standardNodeId: string;
  colorRgb: string;
  path: string;
  hitPath: string;
};
type ConnectState =
  | {
      mode: "idle";
    }
  | {
      mode: "armed";
      sourceNodeId: string;
      eligibleTargetIds: string[];
    }
  | {
      mode: "dragging";
      sourceNodeId: string;
      eligibleTargetIds: string[];
      pointerId: number;
      pointerWorldX: number;
      pointerWorldY: number;
      hoveredTargetId: string | null;
    };

const MINIMAP_WIDTH = 224;
const MINIMAP_HEIGHT = 160;
const MINIMAP_PADDING = 12;
const SCENE_PADDING = 160;
const FIT_PADDING = 120;
const NODE_MIN_WIDTH = 260;
const NODE_MIN_HEIGHT = 180;
/** Screen pixels before a pointer gesture counts as a drag (below this → treated as a click). */
const DRAG_THRESHOLD_PX = 6;

const props = withDefaults(
  defineProps<{
    nodes: CanvasNodeModel[];
    selectedNodeIds?: string[];
    loading?: boolean;
  }>(),
  {
    selectedNodeIds: () => [],
    loading: false,
  },
);

const emit = defineEmits<{
  "update:nodes": [nodes: CanvasNodeModel[]];
  "update:selectedNodeIds": [selectedNodeIds: string[]];
  "create-node": [payload: CreateNodePayload];
  "edit-node": [payload: { nodeId: string }];
  "connect-node-pair": [payload: { orchestratorNodeId: string; standardNodeId: string }];
  "disconnect-node-pair": [payload: { orchestratorNodeId: string; standardNodeId: string }];
  "remove-node": [payload: { nodeId: string }];
  "open-node": [payload: { nodeId: string }];
}>();

const shellRef = useTemplateRef<HTMLDivElement>("shellRef");
const viewportRef = useTemplateRef<HTMLElement>("viewportRef");

const {
  camera,
  canvasStyle,
  backgroundStyle,
  centerOnWorldPoint,
  fitToRect,
  isPanning,
  isSpacePressed,
  screenToWorld,
  visibleWorldRect,
  zoomPercent,
  onLostPointerCapture,
  onMouseDown,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
  resetView,
  zoomIn,
  zoomOut,
} = useCanvas(viewportRef);

const isFullscreen = ref(false);
const activeInteraction = ref<NodeInteraction | null>(null);
const pendingNodeDrag = ref<PendingNodeDrag | null>(null);
const minimapPointerId = ref<number | null>(null);
/** Frozen during minimap drag so bounds/scale do not shift with the camera. */
const minimapSnapshotScene = ref<CanvasRect | null>(null);
const minimapSnapshotScale = ref<number | null>(null);
const contextTarget = ref<CanvasContextTarget>({
  kind: "canvas",
  worldX: 0,
  worldY: 0,
});
const connectState = ref<ConnectState>({
  mode: "idle",
});
let handleWindowBlur: (() => void) | null = null;

const selectedNodeIdSet = computed(() => new Set(props.selectedNodeIds));
const nodeById = computed(() => new Map(props.nodes.map((node) => [node.id, node])));
const isConnectModeActive = computed(() => connectState.value.mode !== "idle");
const connectSourceNodeId = computed(() =>
  connectState.value.mode === "idle" ? null : connectState.value.sourceNodeId,
);
const connectModeTargetIdSet = computed(
  () => new Set(connectState.value.mode === "idle" ? [] : connectState.value.eligibleTargetIds),
);
const hoveredConnectTargetId = computed(() =>
  connectState.value.mode === "dragging" ? connectState.value.hoveredTargetId : null,
);
const connectSourceNode = computed(() =>
  connectSourceNodeId.value ? (nodeById.value.get(connectSourceNodeId.value) ?? null) : null,
);
const connectModeInstruction = computed(() => {
  const sourceNode = connectSourceNode.value;

  if (!sourceNode || connectState.value.mode === "idle") {
    return "";
  }

  const targetLabel = sourceNode.nodeType === "orchestrator" ? "standard" : "orchestrator";

  if (connectState.value.mode === "dragging") {
    return `Release over a highlighted ${targetLabel} node to connect`;
  }

  return `Click a highlighted ${targetLabel} node or drag from ${getNodeHeading(sourceNode)}`;
});

const resizeHandles = [
  {
    edge: "nw",
    className: "left-0 top-0 -translate-x-1/2 -translate-y-1/2 cursor-nwse-resize",
  },
  {
    edge: "n",
    className: "left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 cursor-ns-resize",
  },
  {
    edge: "ne",
    className: "right-0 top-0 translate-x-1/2 -translate-y-1/2 cursor-nesw-resize",
  },
  {
    edge: "e",
    className: "right-0 top-1/2 translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  },
  {
    edge: "se",
    className: "bottom-0 right-0 translate-x-1/2 translate-y-1/2 cursor-nwse-resize",
  },
  {
    edge: "s",
    className: "bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 cursor-ns-resize",
  },
  {
    edge: "sw",
    className: "bottom-0 left-0 -translate-x-1/2 translate-y-1/2 cursor-nesw-resize",
  },
  {
    edge: "w",
    className: "left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 cursor-ew-resize",
  },
] satisfies Array<{ edge: ResizeHandle; className: string }>;

function setSelection(nextSelection: string[]) {
  emit("update:selectedNodeIds", [...new Set(nextSelection)]);
}

function clearSelection() {
  if (props.selectedNodeIds.length > 0) {
    setSelection([]);
  }
}

function selectNode(nodeId: string, isToggle = false) {
  if (isToggle) {
    if (selectedNodeIdSet.value.has(nodeId)) {
      setSelection(props.selectedNodeIds.filter((id) => id !== nodeId));
      return;
    }

    setSelection([...props.selectedNodeIds, nodeId]);
    return;
  }

  if (props.selectedNodeIds.length !== 1 || props.selectedNodeIds[0] !== nodeId) {
    setSelection([nodeId]);
  }
}

function getNodeHeading(node: CanvasNodeModel) {
  return node.title?.trim() || node.label?.trim() || "Untitled node";
}

function createRectUnion(rects: CanvasRect[]) {
  const [firstRect, ...rest] = rects;

  if (!firstRect) {
    return null;
  }

  let minX = firstRect.x;
  let minY = firstRect.y;
  let maxX = firstRect.x + firstRect.width;
  let maxY = firstRect.y + firstRect.height;

  for (const rect of rest) {
    minX = Math.min(minX, rect.x);
    minY = Math.min(minY, rect.y);
    maxX = Math.max(maxX, rect.x + rect.width);
    maxY = Math.max(maxY, rect.y + rect.height);
  }

  return {
    x: minX,
    y: minY,
    width: Math.max(maxX - minX, 1),
    height: Math.max(maxY - minY, 1),
  } satisfies CanvasRect;
}

function fitAllNodes() {
  const bounds = createRectUnion(props.nodes);

  if (bounds) {
    fitToRect(bounds, FIT_PADDING);
    return;
  }

  resetView();
}

defineExpose({
  fitAllNodes,
});

function getNodeCenter(node: CanvasNodeModel): CanvasPoint {
  return {
    x: node.x + node.width / 2,
    y: node.y + node.height / 2,
  };
}

function getNodeAnchorTowardsPoint(node: CanvasNodeModel, point: CanvasPoint): CanvasPoint {
  const center = getNodeCenter(node);
  const deltaX = point.x - center.x;
  const deltaY = point.y - center.y;

  if (Math.abs(deltaX) >= Math.abs(deltaY)) {
    return {
      x: deltaX >= 0 ? node.x + node.width : node.x,
      y: center.y,
    };
  }

  return {
    x: center.x,
    y: deltaY >= 0 ? node.y + node.height : node.y,
  };
}

function toSvgPoint(point: CanvasPoint, bounds: CanvasRect): CanvasPoint {
  return {
    x: point.x - bounds.x,
    y: point.y - bounds.y,
  };
}

function buildConnectionPath(startPoint: CanvasPoint, endPoint: CanvasPoint, bounds: CanvasRect) {
  const start = toSvgPoint(startPoint, bounds);
  const end = toSvgPoint(endPoint, bounds);
  const deltaX = end.x - start.x;
  const deltaY = end.y - start.y;
  const controlOffsetX = Math.max(72, Math.min(220, Math.abs(deltaX) * 0.48));
  const controlOffsetY = Math.min(96, Math.abs(deltaY) * 0.2);
  const directionX = deltaX >= 0 ? 1 : -1;
  const directionY = deltaY >= 0 ? 1 : -1;

  return [
    `M ${start.x} ${start.y}`,
    `C ${start.x + controlOffsetX * directionX} ${start.y + controlOffsetY * directionY}`,
    `${end.x - controlOffsetX * directionX} ${end.y - controlOffsetY * directionY}`,
    `${end.x} ${end.y}`,
  ].join(" ");
}

function getConnectionKey(orchestratorNodeId: string, standardNodeId: string) {
  return `${orchestratorNodeId}:${standardNodeId}`;
}

function findHoveredConnectTargetId(point: CanvasPoint, eligibleTargetIds: string[]) {
  for (const nodeId of eligibleTargetIds) {
    const node = nodeById.value.get(nodeId);

    if (
      node &&
      point.x >= node.x &&
      point.x <= node.x + node.width &&
      point.y >= node.y &&
      point.y <= node.y + node.height
    ) {
      return node.id;
    }
  }

  return null;
}

function cancelConnectMode() {
  connectState.value = {
    mode: "idle",
  };
}

function armConnectMode(sourceNodeId: string) {
  const eligibleTargetIds = getEligibleConnectionTargetIds(props.nodes, sourceNodeId);

  if (eligibleTargetIds.length === 0) {
    cancelConnectMode();
    return;
  }

  selectNode(sourceNodeId);
  connectState.value = {
    mode: "armed",
    sourceNodeId,
    eligibleTargetIds,
  };
}

function restoreConnectMode(sourceNodeId: string, eligibleTargetIds: string[]) {
  if (eligibleTargetIds.length === 0) {
    cancelConnectMode();
    return;
  }

  connectState.value = {
    mode: "armed",
    sourceNodeId,
    eligibleTargetIds,
  };
}

function refreshConnectMode() {
  if (connectState.value.mode === "idle") {
    return;
  }

  const sourceNodeId = connectState.value.sourceNodeId;
  const sourceNode = nodeById.value.get(sourceNodeId);

  if (!sourceNode) {
    cancelConnectMode();
    return;
  }

  const eligibleTargetIds = getEligibleConnectionTargetIds(props.nodes, sourceNodeId);

  if (eligibleTargetIds.length === 0) {
    cancelConnectMode();
    return;
  }

  if (connectState.value.mode === "dragging") {
    connectState.value = {
      ...connectState.value,
      eligibleTargetIds,
      hoveredTargetId: findHoveredConnectTargetId(
        {
          x: connectState.value.pointerWorldX,
          y: connectState.value.pointerWorldY,
        },
        eligibleTargetIds,
      ),
    };
    return;
  }

  restoreConnectMode(sourceNodeId, eligibleTargetIds);
}

function startConnectionDrag(event: PointerEvent, node: CanvasNodeModel) {
  const worldPoint = screenToWorld(event.clientX, event.clientY);

  if (
    !worldPoint ||
    connectState.value.mode !== "armed" ||
    connectState.value.sourceNodeId !== node.id
  ) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectNode(node.id);
  connectState.value = {
    mode: "dragging",
    sourceNodeId: node.id,
    eligibleTargetIds: connectState.value.eligibleTargetIds,
    pointerId: event.pointerId,
    pointerWorldX: worldPoint.x,
    pointerWorldY: worldPoint.y,
    hoveredTargetId: findHoveredConnectTargetId(worldPoint, connectState.value.eligibleTargetIds),
  };
}

const previewWorldPoint = computed<CanvasPoint | null>(() =>
  connectState.value.mode === "dragging"
    ? {
        x: connectState.value.pointerWorldX,
        y: connectState.value.pointerWorldY,
      }
    : null,
);

const canvasSvgBounds = computed(() => {
  const previewRect = previewWorldPoint.value
    ? [
        {
          x: previewWorldPoint.value.x,
          y: previewWorldPoint.value.y,
          width: 1,
          height: 1,
        } satisfies CanvasRect,
      ]
    : [];

  return (
    createRectUnion([...props.nodes, visibleWorldRect.value, ...previewRect]) ?? {
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    }
  );
});

const canvasSvgStyle = computed<CSSProperties>(() => ({
  left: `${canvasSvgBounds.value.x}px`,
  top: `${canvasSvgBounds.value.y}px`,
  width: `${canvasSvgBounds.value.width}px`,
  height: `${canvasSvgBounds.value.height}px`,
}));

const canvasConnectionEdges = computed<CanvasConnectionEdge[]>(() =>
  props.nodes.flatMap((orchestratorNode) => {
    if (orchestratorNode.nodeType !== "orchestrator") {
      return [];
    }

    return (orchestratorNode.connections ?? []).flatMap((connection) => {
      const standardNode = nodeById.value.get(connection.targetNodeId);

      if (!standardNode || standardNode.nodeType !== "standard") {
        return [];
      }

      const startPoint = getNodeAnchorTowardsPoint(standardNode, getNodeCenter(orchestratorNode));
      const endPoint = getNodeAnchorTowardsPoint(orchestratorNode, getNodeCenter(standardNode));

      return [
        {
          key: getConnectionKey(orchestratorNode.id, standardNode.id),
          orchestratorNodeId: orchestratorNode.id,
          standardNodeId: standardNode.id,
          colorRgb: getWorkspaceNodeTintOption(orchestratorNode.dashboard?.tint).rgb,
          path: buildConnectionPath(startPoint, endPoint, canvasSvgBounds.value),
          hitPath: buildConnectionPath(startPoint, endPoint, canvasSvgBounds.value),
        },
      ];
    });
  }),
);

const previewConnectionPath = computed(() => {
  if (connectState.value.mode !== "dragging") {
    return null;
  }

  const sourceNode = nodeById.value.get(connectState.value.sourceNodeId);
  const previewPoint = previewWorldPoint.value;

  if (!sourceNode || !previewPoint) {
    return null;
  }

  const startPoint = getNodeAnchorTowardsPoint(sourceNode, previewPoint);

  return buildConnectionPath(startPoint, previewPoint, canvasSvgBounds.value);
});

function getNodeStyle(node: CanvasNodeModel): CSSProperties {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
  };
}

function getNodeTintStyle(node: CanvasNodeModel): CSSProperties {
  return getWorkspaceNodeTintStyle(node.dashboard?.tint);
}

function isConnectSourceNode(nodeId: string) {
  return connectSourceNodeId.value === nodeId;
}

function isEligibleConnectTarget(nodeId: string) {
  return connectModeTargetIdSet.value.has(nodeId);
}

function isDimmedByConnectMode(nodeId: string) {
  return (
    isConnectModeActive.value && !isConnectSourceNode(nodeId) && !isEligibleConnectTarget(nodeId)
  );
}

function getNodeShellClasses(node: CanvasNodeModel) {
  return {
    "is-dragging":
      activeInteraction.value?.mode === "drag" && activeInteraction.value.nodeId === node.id,
    "is-source": isConnectSourceNode(node.id),
    "is-target": isEligibleConnectTarget(node.id),
    "is-hovered-target": hoveredConnectTargetId.value === node.id,
    "is-dimmed": isDimmedByConnectMode(node.id),
    "is-orchestrator": node.nodeType === "orchestrator",
    "ring-2 ring-primary-500/50 dark:ring-primary-400/50 shadow-primary-500/10":
      selectedNodeIdSet.value.has(node.id),
  };
}

function updateNodes(nextNodes: CanvasNodeModel[]) {
  emit(
    "update:nodes",
    nextNodes.map((node) => ({
      ...node,
      minWidth: node.minWidth ?? NODE_MIN_WIDTH,
      minHeight: node.minHeight ?? NODE_MIN_HEIGHT,
    })),
  );
}

function snapshotNodes(ids: string[]) {
  return new Map(
    props.nodes.filter((node) => ids.includes(node.id)).map((node) => [node.id, { ...node }]),
  );
}

function onNodeShellPointerDown(event: PointerEvent, node: CanvasNodeModel) {
  if (event.button !== 0 || isSpacePressed.value) {
    return;
  }

  if (connectState.value.mode === "armed") {
    const sourceNode = nodeById.value.get(connectState.value.sourceNodeId) ?? null;

    if (connectState.value.sourceNodeId === node.id) {
      startConnectionDrag(event, node);
      return;
    }

    if (connectState.value.eligibleTargetIds.includes(node.id)) {
      const pair = getCanonicalConnectionPair(sourceNode, node);

      event.preventDefault();
      event.stopPropagation();

      if (pair) {
        emit("connect-node-pair", pair);
        cancelConnectMode();
      }

      return;
    }

    event.preventDefault();
    event.stopPropagation();
    return;
  }

  if (connectState.value.mode === "dragging") {
    event.preventDefault();
    event.stopPropagation();
    return;
  }

  event.preventDefault();
  event.stopPropagation();

  const selectedIds = selectedNodeIdSet.value.has(node.id) ? [...props.selectedNodeIds] : [node.id];
  selectNode(node.id, event.shiftKey);

  pendingNodeDrag.value = {
    nodeId: node.id,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    selectedIds,
    startNodes: snapshotNodes(selectedIds),
    openOnRelease: false, // Disabling single click navigation
  };
}

function onNodeShellDblClick(event: MouseEvent, node: CanvasNodeModel) {
  if (isConnectModeActive.value) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  emit("open-node", { nodeId: node.id });
}

function beginResize(event: PointerEvent, node: CanvasNodeModel, handle: ResizeHandle) {
  if (event.button !== 0 || isSpacePressed.value || isConnectModeActive.value) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  selectNode(node.id);

  activeInteraction.value = {
    mode: "resize",
    nodeId: node.id,
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    selectedIds: [node.id],
    startNodes: snapshotNodes([node.id]),
    handle,
  };
}

function resizeNodeRect(
  node: CanvasNodeModel,
  deltaX: number,
  deltaY: number,
  handle: ResizeHandle,
) {
  const minWidth = node.minWidth ?? NODE_MIN_WIDTH;
  const minHeight = node.minHeight ?? NODE_MIN_HEIGHT;

  let nextX = node.x;
  let nextY = node.y;
  let nextWidth = node.width;
  let nextHeight = node.height;

  if (handle.includes("e")) {
    nextWidth = Math.max(minWidth, node.width + deltaX);
  }

  if (handle.includes("s")) {
    nextHeight = Math.max(minHeight, node.height + deltaY);
  }

  if (handle.includes("w")) {
    const widthFromWest = Math.max(minWidth, node.width - deltaX);
    nextX = node.x + node.width - widthFromWest;
    nextWidth = widthFromWest;
  }

  if (handle.includes("n")) {
    const heightFromNorth = Math.max(minHeight, node.height - deltaY);
    nextY = node.y + node.height - heightFromNorth;
    nextHeight = heightFromNorth;
  }

  return {
    ...node,
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  } satisfies CanvasNodeModel;
}

function onWindowPointerMove(event: PointerEvent) {
  if (connectState.value.mode === "dragging" && connectState.value.pointerId === event.pointerId) {
    const worldPoint = screenToWorld(event.clientX, event.clientY);

    if (!worldPoint) {
      return;
    }

    connectState.value = {
      ...connectState.value,
      pointerWorldX: worldPoint.x,
      pointerWorldY: worldPoint.y,
      hoveredTargetId: findHoveredConnectTargetId(worldPoint, connectState.value.eligibleTargetIds),
    };
    return;
  }

  const pending = pendingNodeDrag.value;

  if (pending && pending.pointerId === event.pointerId && !activeInteraction.value) {
    const dx = event.clientX - pending.startClientX;
    const dy = event.clientY - pending.startClientY;

    if (Math.hypot(dx, dy) >= DRAG_THRESHOLD_PX) {
      activeInteraction.value = {
        mode: "drag",
        nodeId: pending.nodeId,
        pointerId: pending.pointerId,
        startClientX: pending.startClientX,
        startClientY: pending.startClientY,
        selectedIds: pending.selectedIds,
        startNodes: pending.startNodes,
      };
      pendingNodeDrag.value = null;
    }
  }

  const interaction = activeInteraction.value;

  if (!interaction || interaction.pointerId !== event.pointerId) {
    return;
  }

  const deltaX = (event.clientX - interaction.startClientX) / camera.zoom;
  const deltaY = (event.clientY - interaction.startClientY) / camera.zoom;

  if (interaction.mode === "drag") {
    updateNodes(
      props.nodes.map((node) => {
        const startNode = interaction.startNodes.get(node.id);

        if (!startNode) {
          return node;
        }

        return {
          ...node,
          x: startNode.x + deltaX,
          y: startNode.y + deltaY,
        };
      }),
    );

    return;
  }

  const startNode = interaction.startNodes.get(interaction.nodeId);
  const handle = interaction.handle;

  if (!startNode || !handle) {
    return;
  }

  updateNodes(
    props.nodes.map((node) =>
      node.id === interaction.nodeId ? resizeNodeRect(startNode, deltaX, deltaY, handle) : node,
    ),
  );
}

function endInteraction(pointerId?: number | null) {
  if (!activeInteraction.value) {
    return;
  }

  if (pointerId != null && activeInteraction.value.pointerId !== pointerId) {
    return;
  }

  activeInteraction.value = null;
}

function onWindowPointerUp(event: PointerEvent) {
  if (connectState.value.mode === "dragging" && connectState.value.pointerId === event.pointerId) {
    if (event.type === "pointercancel") {
      restoreConnectMode(connectState.value.sourceNodeId, connectState.value.eligibleTargetIds);
      return;
    }

    const sourceNode = nodeById.value.get(connectState.value.sourceNodeId);
    const targetNode = connectState.value.hoveredTargetId
      ? (nodeById.value.get(connectState.value.hoveredTargetId) ?? null)
      : null;
    const pair = getCanonicalConnectionPair(sourceNode, targetNode);

    if (pair) {
      emit("connect-node-pair", pair);
      cancelConnectMode();
      return;
    }

    restoreConnectMode(connectState.value.sourceNodeId, connectState.value.eligibleTargetIds);
    return;
  }

  const pending = pendingNodeDrag.value;

  if (pending && pending.pointerId === event.pointerId) {
    if (event.type !== "pointercancel") {
      const dx = event.clientX - pending.startClientX;
      const dy = event.clientY - pending.startClientY;

      if (pending.openOnRelease && Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) {
        emit("open-node", { nodeId: pending.nodeId });
      }
    }

    pendingNodeDrag.value = null;
  }

  endInteraction(event.pointerId);
}

function onViewportMouseDown(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const onNode = Boolean(target?.closest("[data-canvas-node]"));
  const onConnection = Boolean(target?.closest("[data-canvas-connection]"));
  const allowPrimaryPan = event.button === 0 && !isSpacePressed.value && !onNode && !onConnection;

  onMouseDown(event, allowPrimaryPan ? { allowPrimaryPan: true } : undefined);
}

function onViewportPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement | null;
  const onNode = Boolean(target?.closest("[data-canvas-node]"));
  const onConnection = Boolean(target?.closest("[data-canvas-connection]"));
  const allowPrimaryPan = event.button === 0 && !isSpacePressed.value && !onNode && !onConnection;

  if (event.button === 0 && !isSpacePressed.value && !onNode && !onConnection) {
    if (connectState.value.mode === "armed") {
      cancelConnectMode();
    }

    clearSelection();
  }

  if (activeInteraction.value || connectState.value.mode === "dragging") {
    return;
  }

  const shouldPan =
    event.button === 1 || (event.button === 0 && isSpacePressed.value) || allowPrimaryPan;

  if (shouldPan) {
    const currentTarget = event.currentTarget as HTMLElement | null;

    currentTarget?.setPointerCapture(event.pointerId);
  }

  const pointerDownOptions: CanvasPointerDownOptions | undefined = allowPrimaryPan
    ? { allowPrimaryPan: true }
    : undefined;

  if (shouldPan || event.target === event.currentTarget) {
    onPointerDown(event, pointerDownOptions);
  }
}

function captureContextMenu(event: MouseEvent) {
  const worldPoint = screenToWorld(event.clientX, event.clientY);

  if (!worldPoint) {
    return;
  }

  const connectionElement = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-canvas-connection]",
  );
  const orchestratorNodeId = connectionElement?.dataset.canvasConnectionOrchestratorId;
  const standardNodeId = connectionElement?.dataset.canvasConnectionStandardId;

  if (orchestratorNodeId && standardNodeId) {
    contextTarget.value = {
      kind: "connection",
      orchestratorNodeId,
      standardNodeId,
      worldX: worldPoint.x,
      worldY: worldPoint.y,
    };
    return;
  }

  const nodeElement = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-canvas-node-id]",
  );
  const nodeId = nodeElement?.dataset.canvasNodeId;

  if (nodeId) {
    contextTarget.value = {
      kind: "node",
      nodeId,
      worldX: worldPoint.x,
      worldY: worldPoint.y,
    };
    selectNode(nodeId);
    return;
  }

  contextTarget.value = {
    kind: "canvas",
    worldX: worldPoint.x,
    worldY: worldPoint.y,
  };

  if (!isSpacePressed.value) {
    clearSelection();
  }
}

const contextMenuItems = computed<ContextMenuItem[][]>(() => {
  const items: ContextMenuItem[][] = [];

  if (contextTarget.value.kind === "canvas") {
    const { worldX, worldY } = contextTarget.value;

    items.push([
      {
        label: "Add node here",
        icon: "i-lucide-plus",
        onSelect: () => {
          emit("create-node", {
            x: worldX,
            y: worldY,
          });
        },
      },
    ]);
  }

  if (contextTarget.value.kind === "node") {
    const nodeId = contextTarget.value.nodeId;
    const eligibleTargetIds = getEligibleConnectionTargetIds(props.nodes, nodeId);
    const isConnectSource = connectSourceNodeId.value === nodeId;

    items.push([
      {
        label: "Edit node",
        icon: "i-lucide-pencil",
        onSelect: () => {
          emit("edit-node", { nodeId });
        },
      },
      ...(eligibleTargetIds.length > 0
        ? [
            {
              label: isConnectSource && isConnectModeActive.value ? "Cancel connect" : "Connect",
              icon:
                isConnectSource && isConnectModeActive.value ? "i-lucide-x" : "i-lucide-waypoints",
              onSelect: () => {
                if (isConnectSource && isConnectModeActive.value) {
                  cancelConnectMode();
                  return;
                }

                armConnectMode(nodeId);
              },
            } satisfies ContextMenuItem,
          ]
        : []),
      {
        label: "Remove node",
        icon: "i-lucide-trash-2",
        color: "error",
        onSelect: () => {
          emit("remove-node", {
            nodeId,
          });
        },
      },
    ]);
  }

  if (contextTarget.value.kind === "connection") {
    const { orchestratorNodeId, standardNodeId } = contextTarget.value;

    items.push([
      {
        label: "Disconnect",
        icon: "i-lucide-unlink",
        color: "error",
        onSelect: () => {
          emit("disconnect-node-pair", {
            orchestratorNodeId,
            standardNodeId,
          });
          cancelConnectMode();
        },
      },
    ]);
  }

  if (
    isConnectModeActive.value &&
    !(
      contextTarget.value.kind === "node" &&
      connectSourceNodeId.value === contextTarget.value.nodeId
    )
  ) {
    items.push([
      {
        label: "Cancel connect",
        icon: "i-lucide-x",
        onSelect: () => {
          cancelConnectMode();
        },
      },
    ]);
  }

  return items;
});

const minimapScene = computed(() => {
  const union = createRectUnion([...props.nodes, visibleWorldRect.value]);

  if (!union) {
    return {
      x: -400,
      y: -300,
      width: 800,
      height: 600,
    } satisfies CanvasRect;
  }

  return {
    x: union.x - SCENE_PADDING,
    y: union.y - SCENE_PADDING,
    width: union.width + SCENE_PADDING * 2,
    height: union.height + SCENE_PADDING * 2,
  } satisfies CanvasRect;
});

const minimapScale = computed(() => {
  const bounds = minimapScene.value;

  return Math.min(
    (MINIMAP_WIDTH - MINIMAP_PADDING * 2) / bounds.width,
    (MINIMAP_HEIGHT - MINIMAP_PADDING * 2) / bounds.height,
  );
});

function projectToMinimap(rect: CanvasRect, minimumWidth = 6, minimumHeight = 6) {
  const bounds = minimapSnapshotScene.value ?? minimapScene.value;
  const scale = minimapSnapshotScale.value ?? minimapScale.value;

  const left = MINIMAP_PADDING + (rect.x - bounds.x) * scale;
  const top = MINIMAP_PADDING + (rect.y - bounds.y) * scale;
  const width = Math.max(rect.width * scale, minimumWidth);
  const height = Math.max(rect.height * scale, minimumHeight);

  return {
    left,
    top,
    width,
    height,
  };
}

const minimapNodeRects = computed(() =>
  props.nodes.map((node) => ({
    key: node.id,
    selected: selectedNodeIdSet.value.has(node.id),
    rgb: getWorkspaceNodeTintOption(node.dashboard?.tint).rgb,
    ...projectToMinimap(node),
  })),
);

const minimapViewfinder = computed(() => projectToMinimap(visibleWorldRect.value, 24, 24));

const minimapSceneStyle = computed<CSSProperties>(() => ({
  width: `${MINIMAP_WIDTH}px`,
  height: `${MINIMAP_HEIGHT}px`,
  backgroundSize: "auto, auto, 18px 18px",
  backgroundPosition: `center, center, ${MINIMAP_PADDING}px ${MINIMAP_PADDING}px`,
}));

function getMinimapNodeStyle(nodeRect: (typeof minimapNodeRects.value)[number]): CSSProperties {
  return {
    left: `${nodeRect.left}px`,
    top: `${nodeRect.top}px`,
    width: `${nodeRect.width}px`,
    height: `${nodeRect.height}px`,
    zIndex: nodeRect.selected ? 2 : 1,
    borderColor: `rgb(${nodeRect.rgb} / ${nodeRect.selected ? "0.8" : "0.42"})`,
    background: `linear-gradient(180deg, rgb(${nodeRect.rgb} / ${nodeRect.selected ? "0.52" : "0.2"}), rgb(${nodeRect.rgb} / ${nodeRect.selected ? "0.22" : "0.08"}))`,
  };
}

const minimapViewfinderStyle = computed<CSSProperties>(() => ({
  left: `${minimapViewfinder.value.left}px`,
  top: `${minimapViewfinder.value.top}px`,
  width: `${minimapViewfinder.value.width}px`,
  height: `${minimapViewfinder.value.height}px`,
  borderColor: "rgb(255 255 255 / 0.92)",
  background: "linear-gradient(180deg, rgb(255 255 255 / 0.08), rgb(255 255 255 / 0.02))",
}));

const viewportClasses = computed(() => ({
  "is-grabbing": isPanning.value,
  "is-grab-ready": !isPanning.value && isSpacePressed.value,
}));

const controlButtonClass =
  "inline-flex size-10 items-center justify-center rounded-2xl border border-muted/70 bg-elevated/90 text-highlighted transition hover:border-primary/60 hover:bg-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

function focusNode(nodeId: string) {
  const node = props.nodes.find((item) => item.id === nodeId);

  if (node) {
    fitToRect(node, FIT_PADDING);
  }
}

function navigateFromMinimap(event: PointerEvent) {
  const target = event.currentTarget as HTMLElement | null;

  if (!target) {
    return;
  }

  const rect = target.getBoundingClientRect();
  const localX = Math.min(
    Math.max(event.clientX - rect.left, MINIMAP_PADDING),
    rect.width - MINIMAP_PADDING,
  );
  const localY = Math.min(
    Math.max(event.clientY - rect.top, MINIMAP_PADDING),
    rect.height - MINIMAP_PADDING,
  );
  const bounds = minimapSnapshotScene.value ?? minimapScene.value;
  const scale = minimapSnapshotScale.value ?? minimapScale.value;
  const worldX = bounds.x + (localX - MINIMAP_PADDING) / scale;
  const worldY = bounds.y + (localY - MINIMAP_PADDING) / scale;

  centerOnWorldPoint(worldX, worldY);
}

function onMinimapPointerDown(event: PointerEvent) {
  if (event.button !== 0) {
    return;
  }

  event.preventDefault();
  minimapSnapshotScene.value = { ...minimapScene.value };
  minimapSnapshotScale.value = minimapScale.value;
  minimapPointerId.value = event.pointerId;
  (event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId);
  navigateFromMinimap(event);
}

function onMinimapPointerMove(event: PointerEvent) {
  if (minimapPointerId.value !== event.pointerId) {
    return;
  }

  navigateFromMinimap(event);
}

function releaseMinimapPointer(event: PointerEvent) {
  if (minimapPointerId.value !== event.pointerId) {
    return;
  }

  const target = event.currentTarget as HTMLElement | null;

  if (target?.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId);
  }

  minimapPointerId.value = null;
  minimapSnapshotScene.value = null;
  minimapSnapshotScale.value = null;
}

async function toggleFullscreen() {
  if (!import.meta.client || !shellRef.value) {
    return;
  }

  try {
    if (document.fullscreenElement === shellRef.value) {
      await document.exitFullscreen();
      return;
    }

    if (document.fullscreenElement) {
      await document.exitFullscreen();
    }

    await shellRef.value.requestFullscreen();
  } catch {
    // Ignore unsupported or user-blocked fullscreen requests.
  }
}

function syncFullscreenState() {
  isFullscreen.value = document.fullscreenElement === shellRef.value;
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (event.key !== "Escape" || !isConnectModeActive.value) {
    return;
  }

  event.preventDefault();
  cancelConnectMode();
}

watch(
  () => props.nodes.map((node) => node.id),
  (nodeIds) => {
    const nextSelection = props.selectedNodeIds.filter((nodeId) => nodeIds.includes(nodeId));

    if (nextSelection.length !== props.selectedNodeIds.length) {
      setSelection(nextSelection);
    }
  },
);

watch(
  () =>
    props.nodes.map((node) =>
      [
        node.id,
        node.nodeType ?? "standard",
        (node.connections ?? []).map((connection) => connection.targetNodeId).join(","),
      ].join(":"),
    ),
  () => {
    refreshConnectMode();
  },
  { deep: true },
);

onMounted(() => {
  document.addEventListener("fullscreenchange", syncFullscreenState);
  window.addEventListener("keydown", onWindowKeyDown);
  window.addEventListener("pointermove", onWindowPointerMove);
  window.addEventListener("pointerup", onWindowPointerUp);
  window.addEventListener("pointercancel", onWindowPointerUp);
  handleWindowBlur = () => {
    pendingNodeDrag.value = null;
    cancelConnectMode();
    endInteraction();
  };
  window.addEventListener("blur", handleWindowBlur);
  syncFullscreenState();
});

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", syncFullscreenState);
  window.removeEventListener("keydown", onWindowKeyDown);
  window.removeEventListener("pointermove", onWindowPointerMove);
  window.removeEventListener("pointerup", onWindowPointerUp);
  window.removeEventListener("pointercancel", onWindowPointerUp);
  if (handleWindowBlur) {
    window.removeEventListener("blur", handleWindowBlur);
  }
});
</script>

<template>
  <div ref="shellRef" class="workspace-shell relative h-full w-full overflow-hidden">
    <UContextMenu :items="contextMenuItems" :modal="false">
      <div
        ref="viewportRef"
        class="canvas-viewport absolute inset-0"
        :class="[viewportClasses, props.loading ? 'pointer-events-none opacity-60' : '']"
        :style="backgroundStyle"
        @contextmenu.capture="captureContextMenu"
        @mousedown="onViewportMouseDown"
        @pointerdown="onViewportPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @lostpointercapture="onLostPointerCapture"
        @wheel="onWheel"
      >
        <div class="canvas-plane" :style="canvasStyle">
          <svg class="canvas-connections absolute overflow-visible" :style="canvasSvgStyle">
            <defs>
              <marker
                v-for="edge in canvasConnectionEdges"
                :id="`canvas-connection-arrow-${edge.key}`"
                :key="`marker-${edge.key}`"
                markerWidth="12"
                markerHeight="12"
                refX="10"
                refY="6"
                orient="auto"
                markerUnits="userSpaceOnUse"
              >
                <path :fill="`rgb(${edge.colorRgb})`" d="M 0 0 L 12 6 L 0 12 z" />
              </marker>
            </defs>

            <g
              v-for="edge in canvasConnectionEdges"
              :key="edge.key"
              class="canvas-connection"
              data-canvas-connection
              :data-canvas-connection-orchestrator-id="edge.orchestratorNodeId"
              :data-canvas-connection-standard-id="edge.standardNodeId"
            >
              <path
                class="canvas-connection-path"
                :d="edge.path"
                :marker-end="`url(#canvas-connection-arrow-${edge.key})`"
                :stroke="`rgb(${edge.colorRgb})`"
              />
              <path class="canvas-connection-hit" :d="edge.hitPath" stroke="transparent" />
            </g>

            <path
              v-if="previewConnectionPath"
              class="canvas-connection-preview"
              :d="previewConnectionPath"
            />
          </svg>

          <article
            v-for="node in props.nodes"
            :key="node.id"
            class="canvas-node absolute"
            :class="{
              'is-selected': selectedNodeIdSet.has(node.id),
            }"
            :style="getNodeStyle(node)"
            :data-canvas-node-id="node.id"
            data-canvas-node
          >
            <div
              class="canvas-node-shell group relative flex h-full cursor-grab flex-col rounded-[2rem] border border-neutral-200/50 dark:border-neutral-800/50 bg-white/80 dark:bg-neutral-950/80 shadow-2xl shadow-black/5 backdrop-blur-xl active:cursor-grabbing transition-shadow duration-300"
              :class="getNodeShellClasses(node)"
              :style="getNodeTintStyle(node)"
              @pointerdown="onNodeShellPointerDown($event, node)"
              @dblclick="onNodeShellDblClick($event, node)"
            >
              <div
                v-if="node.nodeType === 'orchestrator'"
                class="pointer-events-none absolute inset-[10px] rounded-[1.6rem] border border-[rgb(var(--workspace-node-rgb)/0.28)] bg-[radial-gradient(circle_at_top,rgb(var(--workspace-node-rgb)/0.18),transparent_55%),linear-gradient(135deg,rgb(var(--workspace-node-rgb)/0.08),transparent_62%)] shadow-[inset_0_0_0_1px_rgb(var(--workspace-node-rgb)/0.18)]"
              />

              <div
                class="canvas-node-toolbar flex shrink-0 items-center justify-between gap-3 border-b border-neutral-200/30 dark:border-neutral-800/30 px-5 py-4"
              >
                <h3
                  class="min-w-0 flex-1 truncate text-[13px] font-bold text-neutral-900 dark:text-neutral-100 uppercase tracking-widest"
                >
                  {{ getNodeHeading(node) }}
                </h3>

                <button
                  type="button"
                  class="inline-flex shrink-0 items-center justify-center size-8 rounded-full border border-neutral-200 dark:border-neutral-800 text-neutral-500 transition hover:bg-neutral-100 dark:hover:bg-neutral-800 hover:text-primary-500"
                  @pointerdown.stop
                  @click.stop="focusNode(node.id)"
                >
                  <UIcon name="i-lucide-scan-search" class="size-4" />
                </button>
              </div>

              <div class="canvas-node-content min-h-0 flex-1 overflow-hidden">
                <slot
                  name="node"
                  :node="node"
                  :selected="selectedNodeIdSet.has(node.id)"
                  :all-nodes="props.nodes"
                />
              </div>

              <button
                v-for="handle in resizeHandles"
                v-show="selectedNodeIdSet.has(node.id) && !isConnectModeActive"
                :key="`${node.id}-${handle.edge}`"
                type="button"
                class="resize-handle absolute z-20 size-4 rounded-full border-2 border-white dark:border-neutral-900 bg-primary-500 shadow-lg transition-transform hover:scale-125"
                :class="handle.className"
                :aria-label="`Resize ${getNodeHeading(node)} from ${handle.edge}`"
                @pointerdown.stop="beginResize($event, node, handle.edge)"
              />
            </div>
          </article>
        </div>
      </div>
    </UContextMenu>

    <div
      v-if="props.loading"
      class="pointer-events-none absolute inset-0 flex items-center justify-center px-6 bg-white/50 dark:bg-neutral-950/50 backdrop-blur-sm z-50"
    >
      <div class="flex flex-col items-center gap-4">
        <UIcon name="i-lucide-loader-2" class="size-8 animate-spin text-primary-500" />
        <p class="text-[10px] font-bold uppercase tracking-[0.3em] text-neutral-500">
          Loading Workspace
        </p>
      </div>
    </div>

    <div
      v-if="isConnectModeActive && connectSourceNode"
      class="pointer-events-none absolute left-1/2 top-6 z-40 -translate-x-1/2 px-4"
    >
      <div
        class="flex items-center gap-3 rounded-full border border-neutral-200/70 bg-white/88 px-4 py-2 text-xs font-medium text-neutral-700 shadow-xl backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/88 dark:text-neutral-200"
      >
        <span
          class="inline-flex size-2.5 rounded-full bg-primary-500 shadow-[0_0_14px_rgba(59,130,246,0.55)]"
        />
        <span>{{ connectModeInstruction }}</span>
        <span
          class="rounded-full border border-neutral-200/80 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.22em] text-neutral-400 dark:border-neutral-800/80"
        >
          Esc
        </span>
      </div>
    </div>

    <div
      v-if="!props.loading && !props.nodes.length"
      class="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
    >
      <div
        class="max-w-md rounded-[2.5rem] border border-dashed border-neutral-300 dark:border-neutral-700 p-12 text-center"
      >
        <div
          class="mx-auto inline-flex size-16 items-center justify-center rounded-[1.5rem] bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 shadow-2xl mb-6"
        >
          <UIcon name="i-lucide-plus" class="size-8" />
        </div>
        <h3 class="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
          Empty Canvas
        </h3>
        <p class="mt-4 text-sm leading-relaxed text-neutral-500 max-w-xs mx-auto">
          Right-click anywhere to begin. Your nodes will appear here in your infinite workspace.
        </p>
      </div>
    </div>

    <!-- Floating Canvas Controls -->
    <div
      class="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3"
    >
      <div
        class="pointer-events-auto flex items-center gap-1.5 p-1.5 rounded-full border border-neutral-200/50 dark:border-neutral-800/50 bg-white/70 dark:bg-neutral-950/70 backdrop-blur-xl shadow-2xl"
      >
        <button type="button" :class="controlButtonClass" @click="zoomOut">
          <UIcon name="i-lucide-minus" class="size-4" />
        </button>

        <div class="px-3 text-xs font-bold text-neutral-500 w-12 text-center tabular-nums">
          {{ zoomPercent }}%
        </div>

        <button type="button" :class="controlButtonClass" @click="zoomIn">
          <UIcon name="i-lucide-plus" class="size-4" />
        </button>

        <div class="w-px h-4 bg-neutral-200 dark:bg-neutral-800 mx-1" />

        <button type="button" :class="controlButtonClass" @click="fitAllNodes">
          <UIcon name="i-lucide-scan" class="size-4" />
        </button>

        <button type="button" :class="controlButtonClass" @click="toggleFullscreen">
          <UIcon :name="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-expand'" class="size-4" />
        </button>
      </div>
    </div>

    <!-- Mini-map -->
    <div
      class="pointer-events-none absolute top-24 right-6 overflow-hidden rounded-3xl border border-neutral-200/50 dark:border-neutral-800/50 bg-white/55 dark:bg-neutral-950/60 backdrop-blur-xl transition-all duration-300 hover:opacity-100 opacity-75 group/minimap"
    >
      <div
        class="minimap-surface relative overflow-hidden"
        :style="minimapSceneStyle"
        @pointerdown="onMinimapPointerDown"
        @pointermove="onMinimapPointerMove"
        @pointerup="releaseMinimapPointer"
        @pointercancel="releaseMinimapPointer"
        @lostpointercapture="releaseMinimapPointer"
      >
        <div
          v-for="node in minimapNodeRects"
          :key="node.key"
          class="absolute rounded-[5px] border transition-all duration-200"
          :style="getMinimapNodeStyle(node)"
        />
        <div class="absolute rounded-[7px] border-2" :style="minimapViewfinderStyle" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.workspace-shell {
  background-color: var(--ui-bg);
}

.canvas-viewport {
  overflow: hidden;
  touch-action: none;
  user-select: none;
  background-color: color-mix(in srgb, var(--ui-bg) 95%, black 5%);
  background-image: radial-gradient(circle at 2px 2px, var(--ui-border) 1px, transparent 0);
  background-size: 24px 24px;
}

.canvas-plane {
  position: absolute;
  inset: 0;
  width: 0;
  height: 0;
}

.canvas-connection-path {
  fill: none;
  stroke-width: 2.5px;
  opacity: 0.82;
  pointer-events: none;
}

.canvas-connection-hit {
  fill: none;
  stroke-width: 18px;
  pointer-events: stroke;
}

.canvas-connection-preview {
  fill: none;
  stroke: rgb(59 130 246 / 0.9);
  stroke-width: 2.5px;
  stroke-dasharray: 8 8;
  stroke-linecap: round;
  opacity: 0.95;
}

.canvas-node {
  will-change: transform, width, height;
}

.canvas-node-shell {
  transition:
    transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.2s ease,
    opacity 0.2s ease,
    filter 0.2s ease,
    border-color 0.2s ease;
}

.canvas-node.is-selected .canvas-node-shell {
  transform: scale(1.02);
}

.canvas-node-shell.is-orchestrator {
  border-color: rgb(var(--workspace-node-rgb) / 0.28);
  box-shadow:
    0 26px 60px rgb(15 23 42 / 0.12),
    0 0 0 1px rgb(var(--workspace-node-rgb) / 0.18);
}

.canvas-node-shell.is-source {
  opacity: 1;
  filter: saturate(1.06);
  box-shadow:
    0 28px 70px rgb(var(--workspace-node-rgb) / 0.18),
    0 0 0 2px rgb(var(--workspace-node-rgb) / 0.3);
}

.canvas-node-shell.is-target {
  opacity: 1;
  filter: saturate(1.08);
  box-shadow:
    0 24px 60px rgb(var(--workspace-node-rgb) / 0.14),
    0 0 0 2px rgb(var(--workspace-node-rgb) / 0.28);
}

.canvas-node-shell.is-hovered-target {
  transform: translateY(-3px) scale(1.02);
  box-shadow:
    0 32px 72px rgb(var(--workspace-node-rgb) / 0.2),
    0 0 0 3px rgb(var(--workspace-node-rgb) / 0.38);
}

.canvas-node-shell.is-dimmed {
  opacity: 0.24;
  filter: grayscale(0.92) saturate(0.45);
}

.resize-handle {
  opacity: 0;
  transition: opacity 0.2s ease;
}

.canvas-node.is-selected .resize-handle {
  opacity: 1;
}

.minimap-surface {
  cursor: crosshair;
  background-color: color-mix(in srgb, var(--ui-bg) 95%, black 5%);
  background-image: radial-gradient(circle at 2px 2px, var(--ui-border) 1px, transparent 0);
}
</style>
