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
  nodeId: string | null;
  worldX: number;
  worldY: number;
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
const contextTarget = ref<ContextTarget>({
  nodeId: null,
  worldX: 0,
  worldY: 0,
});
let handleWindowBlur: (() => void) | null = null;

const selectedNodeIdSet = computed(() => new Set(props.selectedNodeIds));
const selectedNodes = computed(() =>
  props.nodes.filter((node) => selectedNodeIdSet.value.has(node.id)),
);

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

function frameSelection() {
  const bounds = createRectUnion(selectedNodes.value);

  if (bounds) {
    fitToRect(bounds, FIT_PADDING);
  }
}

function fitAllNodes() {
  const bounds = createRectUnion(props.nodes);

  if (bounds) {
    fitToRect(bounds, FIT_PADDING);
    return;
  }

  resetView();
}

function getNodeStyle(node: CanvasNodeModel): CSSProperties {
  return {
    left: `${node.x}px`,
    top: `${node.y}px`,
    width: `${node.width}px`,
    height: `${node.height}px`,
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
    openOnRelease: !event.shiftKey && !event.metaKey && !event.ctrlKey && !event.altKey,
  };
}

function beginResize(event: PointerEvent, node: CanvasNodeModel, handle: ResizeHandle) {
  if (event.button !== 0 || isSpacePressed.value) {
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
  const allowPrimaryPan = event.button === 0 && !isSpacePressed.value && !onNode;

  onMouseDown(event, allowPrimaryPan ? { allowPrimaryPan: true } : undefined);
}

function onViewportPointerDown(event: PointerEvent) {
  const target = event.target as HTMLElement | null;
  const onNode = Boolean(target?.closest("[data-canvas-node]"));
  const allowPrimaryPan = event.button === 0 && !isSpacePressed.value && !onNode;

  if (event.button === 0 && !isSpacePressed.value && !onNode) {
    clearSelection();
  }

  if (activeInteraction.value) {
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

  const nodeElement = (event.target as HTMLElement | null)?.closest<HTMLElement>(
    "[data-canvas-node-id]",
  );
  const nodeId = nodeElement?.dataset.canvasNodeId ?? null;

  contextTarget.value = {
    nodeId,
    worldX: worldPoint.x,
    worldY: worldPoint.y,
  };

  if (nodeId) {
    selectNode(nodeId);
    return;
  }

  if (!isSpacePressed.value) {
    clearSelection();
  }
}

const contextMenuItems = computed<ContextMenuItem[][]>(() => {
  const items: ContextMenuItem[][] = [
    [
      {
        label: "Add node here",
        icon: "i-lucide-plus",
        onSelect: () => {
          emit("create-node", {
            x: contextTarget.value.worldX,
            y: contextTarget.value.worldY,
          });
        },
      },
    ],
  ];

  if (contextTarget.value.nodeId) {
    items.push([
      {
        label: "Edit node",
        icon: "i-lucide-pencil",
        onSelect: () => {
          emit("edit-node", { nodeId: contextTarget.value.nodeId! });
        },
      },
      {
        label: "Remove node",
        icon: "i-lucide-trash-2",
        color: "error",
        onSelect: () => {
          emit("remove-node", {
            nodeId: contextTarget.value.nodeId!,
          });
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
    ...projectToMinimap(node),
  })),
);

const minimapViewfinder = computed(() => projectToMinimap(visibleWorldRect.value, 24, 24));

const minimapSceneStyle = computed<CSSProperties>(() => ({
  width: `${MINIMAP_WIDTH}px`,
  height: `${MINIMAP_HEIGHT}px`,
  backgroundSize: "18px 18px",
  backgroundPosition: `${MINIMAP_PADDING}px ${MINIMAP_PADDING}px`,
}));

const viewportClasses = computed(() => ({
  "is-grabbing": isPanning.value,
  "is-grab-ready": !isPanning.value && isSpacePressed.value,
}));

const controlButtonClass =
  "inline-flex size-10 items-center justify-center rounded-2xl border border-muted/70 bg-elevated/90 text-highlighted transition hover:border-primary/60 hover:bg-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50";

const canFrameSelection = computed(() => selectedNodes.value.length > 0);

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

watch(
  () => props.nodes.map((node) => node.id),
  (nodeIds) => {
    const nextSelection = props.selectedNodeIds.filter((nodeId) => nodeIds.includes(nodeId));

    if (nextSelection.length !== props.selectedNodeIds.length) {
      setSelection(nextSelection);
    }
  },
);

onMounted(() => {
  document.addEventListener("fullscreenchange", syncFullscreenState);
  window.addEventListener("pointermove", onWindowPointerMove);
  window.addEventListener("pointerup", onWindowPointerUp);
  window.addEventListener("pointercancel", onWindowPointerUp);
  handleWindowBlur = () => {
    pendingNodeDrag.value = null;
    endInteraction();
  };
  window.addEventListener("blur", handleWindowBlur);
  syncFullscreenState();
});

onBeforeUnmount(() => {
  document.removeEventListener("fullscreenchange", syncFullscreenState);
  window.removeEventListener("pointermove", onWindowPointerMove);
  window.removeEventListener("pointerup", onWindowPointerUp);
  window.removeEventListener("pointercancel", onWindowPointerUp);
  if (handleWindowBlur) {
    window.removeEventListener("blur", handleWindowBlur);
  }
});
</script>

<template>
  <div
    ref="shellRef"
    class="workspace-shell relative h-full min-h-0 overflow-hidden rounded-[2rem] border border-muted/60 bg-default"
  >
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
              class="canvas-node-shell relative flex h-full cursor-grab flex-col rounded-[1.5rem] border border-muted/60 bg-default/85 shadow-[0_24px_80px_rgba(15,23,42,0.14)] backdrop-blur-sm active:cursor-grabbing"
              :class="{
                'is-dragging':
                  activeInteraction?.mode === 'drag' && activeInteraction.nodeId === node.id,
              }"
              @pointerdown="onNodeShellPointerDown($event, node)"
            >
              <div
                class="canvas-node-toolbar flex shrink-0 items-center justify-between gap-3 border-b border-muted/60 px-4 py-2.5"
              >
                <h3 class="min-w-0 flex-1 truncate text-sm font-semibold text-highlighted">
                  {{ getNodeHeading(node) }}
                </h3>

                <button
                  type="button"
                  class="inline-flex shrink-0 items-center gap-1 rounded-full border border-transparent px-2 py-1 text-xs text-muted transition hover:border-muted/70 hover:bg-elevated/70 hover:text-highlighted"
                  @pointerdown.stop
                  @click.stop="focusNode(node.id)"
                >
                  <UIcon name="i-lucide-scan-search" class="size-3.5" />
                  Focus
                </button>
              </div>

              <div class="canvas-node-content min-h-0 flex-1 p-1.5">
                <slot name="node" :node="node" :selected="selectedNodeIdSet.has(node.id)" />
              </div>

              <button
                v-for="handle in resizeHandles"
                v-show="selectedNodeIdSet.has(node.id)"
                :key="`${node.id}-${handle.edge}`"
                type="button"
                class="resize-handle absolute z-20 size-4 rounded-full border border-primary/70 bg-default shadow-sm"
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
      class="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
    >
      <div
        class="max-w-md rounded-4xl border border-muted/70 bg-default/85 p-8 text-center shadow-xl shadow-black/5 backdrop-blur-md"
      >
        <div
          class="mx-auto inline-flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary"
        >
          <UIcon name="i-lucide-loader-2" class="size-6 animate-spin" />
        </div>
        <h3 class="mt-5 text-2xl font-semibold text-highlighted">Loading workspace</h3>
        <p class="mt-3 text-sm leading-6 text-toned">
          Pulling your latest nodes and layout from the database.
        </p>
      </div>
    </div>

    <div
      v-else-if="!props.nodes.length"
      class="pointer-events-none absolute inset-0 flex items-center justify-center px-6"
    >
      <div
        class="empty-state max-w-md rounded-4xl border border-dashed border-muted/70 bg-default/80 p-8 text-center shadow-xl shadow-black/5 backdrop-blur-md"
      >
        <div
          class="mx-auto inline-flex size-14 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-primary"
        >
          <UIcon name="i-lucide-layout-panel-top" class="size-6" />
        </div>
        <h3 class="mt-5 text-2xl font-semibold text-highlighted">Start with an empty workspace</h3>
        <p class="mt-3 text-sm leading-6 text-toned">
          Right-click anywhere on the canvas to add your first node. Every card is user-defined, so
          each workspace can evolve independently.
        </p>
      </div>
    </div>

    <div
      class="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-4"
    >
      <div
        class="pointer-events-auto flex items-center gap-2 rounded-[1.75rem] border border-muted/70 bg-default/80 p-2 shadow-xl shadow-black/5 backdrop-blur-md"
      >
        <button type="button" :class="controlButtonClass" aria-label="Zoom out" @click="zoomOut">
          <UIcon name="i-lucide-minus" class="size-4" />
        </button>

        <div
          class="min-w-20 rounded-2xl border border-muted/70 bg-elevated/80 px-4 py-2 text-center"
        >
          <div class="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">Zoom</div>
          <div class="mt-1 text-sm font-semibold text-highlighted">{{ zoomPercent }}%</div>
        </div>

        <button type="button" :class="controlButtonClass" aria-label="Zoom in" @click="zoomIn">
          <UIcon name="i-lucide-plus" class="size-4" />
        </button>

        <button
          type="button"
          :class="controlButtonClass"
          aria-label="Reset zoom to 100%"
          @click="resetView"
        >
          <UIcon name="i-lucide-rotate-ccw" class="size-4" />
        </button>

        <button
          type="button"
          :class="controlButtonClass"
          aria-label="Fit all nodes"
          @click="fitAllNodes"
        >
          <UIcon name="i-lucide-scan" class="size-4" />
        </button>

        <button
          type="button"
          :class="controlButtonClass"
          :disabled="!canFrameSelection"
          aria-label="Frame selection"
          @click="frameSelection"
        >
          <UIcon name="i-lucide-focus" class="size-4" />
        </button>

        <button
          type="button"
          :class="controlButtonClass"
          :aria-label="isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'"
          @click="toggleFullscreen"
        >
          <UIcon :name="isFullscreen ? 'i-lucide-minimize' : 'i-lucide-expand'" class="size-4" />
        </button>
      </div>
    </div>

    <div
      class="pointer-events-none absolute bottom-4 right-4 overflow-hidden rounded-[1.75rem] border border-muted/70 bg-default/85 shadow-xl shadow-black/5 backdrop-blur-md"
    >
      <div class="flex items-center justify-between gap-3 border-b border-muted/60 px-4 py-3">
        <div>
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">Mini-map</p>
          <p class="mt-1 text-xs text-toned">
            {{ props.nodes.length }} nodes, {{ selectedNodes.length || 0 }} selected
          </p>
        </div>
        <div
          class="rounded-full border border-muted/60 bg-elevated/80 px-3 py-1 text-xs font-medium text-toned"
        >
          {{ zoomPercent }}%
        </div>
      </div>

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
          class="absolute rounded-md border bg-primary/20"
          :class="node.selected ? 'border-primary bg-primary/35' : 'border-primary/60'"
          :style="{
            left: `${node.left}px`,
            top: `${node.top}px`,
            width: `${node.width}px`,
            height: `${node.height}px`,
          }"
        />

        <div
          class="absolute rounded-lg border-2 border-primary bg-primary/10 shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"
          :style="{
            left: `${minimapViewfinder.left}px`,
            top: `${minimapViewfinder.top}px`,
            width: `${minimapViewfinder.width}px`,
            height: `${minimapViewfinder.height}px`,
          }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.workspace-shell {
  background-image:
    radial-gradient(
      circle at top left,
      color-mix(in srgb, var(--ui-primary) 8%, transparent),
      transparent 32%
    ),
    linear-gradient(
      135deg,
      color-mix(in srgb, var(--ui-bg-elevated) 55%, transparent),
      transparent 45%
    );
}

.canvas-viewport {
  overflow: hidden;
  touch-action: none;
  user-select: none;
  background-color: color-mix(in srgb, var(--ui-bg) 92%, black 8%);
  background-image: radial-gradient(var(--ui-border) 1px, transparent 1px);
  cursor: default;
}

.canvas-viewport.is-grab-ready {
  cursor: grab;
}

.canvas-viewport.is-grabbing {
  cursor: grabbing;
}

.canvas-plane {
  position: absolute;
  inset: 0;
  width: 0;
  height: 0;
}

.canvas-node {
  will-change: transform, width, height;
}

.canvas-node-shell {
  height: 100%;
}

.canvas-node.is-selected .canvas-node-shell {
  border-color: color-mix(in srgb, var(--ui-primary) 55%, var(--ui-border));
  box-shadow:
    0 28px 100px rgba(16, 24, 40, 0.18),
    0 0 0 1px color-mix(in srgb, var(--ui-primary) 35%, transparent);
}

.canvas-node-shell.is-dragging {
  cursor: grabbing;
}

.resize-handle {
  opacity: 0;
  transition: opacity 0.18s ease;
}

.canvas-node.is-selected .resize-handle {
  opacity: 1;
}

.minimap-surface {
  cursor: crosshair;
  background-color: color-mix(in srgb, var(--ui-bg-elevated) 82%, black 18%);
  background-image: radial-gradient(var(--ui-border) 1px, transparent 1px);
}

.empty-state {
  background-image:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--ui-bg-elevated) 72%, transparent),
      transparent
    ),
    radial-gradient(
      circle at top,
      color-mix(in srgb, var(--ui-primary) 10%, transparent),
      transparent 60%
    );
}
</style>
