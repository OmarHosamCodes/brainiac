<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  onUpdated,
  ref,
  useTemplateRef,
  type CSSProperties,
} from "vue";
import { useCanvas, type CanvasRect } from "~/composables/useCanvas";

const MINIMAP_WIDTH = 224;
const MINIMAP_HEIGHT = 160;
const MINIMAP_PADDING = 12;
const SCENE_PADDING = 160;

const shellRef = useTemplateRef<HTMLDivElement>("shellRef");
const viewportRef = useTemplateRef<HTMLElement>("viewportRef");
const worldRef = useTemplateRef<HTMLElement>("worldRef");

const {
  canvasStyle,
  backgroundStyle,
  isPanning,
  isSpacePressed,
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
const nodeRects = ref<CanvasRect[]>([]);

let fullscreenListener: (() => void) | null = null;
let mutationObserver: MutationObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let measureFrame = 0;

function getCanvasNodes() {
  const world = worldRef.value;

  if (!world) {
    return [] as HTMLElement[];
  }

  const taggedNodes = Array.from(world.querySelectorAll<HTMLElement>("[data-canvas-node]"));

  if (taggedNodes.length > 0) {
    return taggedNodes;
  }

  return Array.from(world.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );
}

function syncNodeObservers(nodes: HTMLElement[]) {
  if (!resizeObserver) {
    resizeObserver = new ResizeObserver(() => scheduleMeasure());
  }

  resizeObserver.disconnect();

  for (const node of nodes) {
    resizeObserver.observe(node);
  }
}

function measureNodes() {
  measureFrame = 0;

  const nodes = getCanvasNodes();
  syncNodeObservers(nodes);

  nodeRects.value = nodes
    .map((node) => ({
      x: node.offsetLeft,
      y: node.offsetTop,
      width: node.offsetWidth,
      height: node.offsetHeight,
    }))
    .filter((node) => node.width > 0 && node.height > 0);
}

function scheduleMeasure() {
  if (!import.meta.client || measureFrame) {
    return;
  }

  measureFrame = window.requestAnimationFrame(measureNodes);
}

function createRectUnion(rects: CanvasRect[]) {
  const [firstRect, ...rest] = rects;

  if (!firstRect) {
    return {
      x: -400,
      y: -300,
      width: 800,
      height: 600,
    } satisfies CanvasRect;
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

const minimapScene = computed(() => {
  const union = createRectUnion([...nodeRects.value, visibleWorldRect.value]);

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
  const bounds = minimapScene.value;
  const scale = minimapScale.value;

  // The minimap uses the scene's union bounds as its local origin, so every
  // world-space rectangle is translated into that frame and then scaled down.
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
  nodeRects.value.map((rect, index) => ({
    key: `node-${index}`,
    ...projectToMinimap(rect),
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

onMounted(async () => {
  await nextTick();
  scheduleMeasure();

  if (worldRef.value) {
    mutationObserver = new MutationObserver(() => scheduleMeasure());
    mutationObserver.observe(worldRef.value, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["style", "class"],
    });
  }

  fullscreenListener = () => syncFullscreenState();
  document.addEventListener("fullscreenchange", fullscreenListener);
  syncFullscreenState();
});

onUpdated(() => {
  scheduleMeasure();
});

onBeforeUnmount(() => {
  mutationObserver?.disconnect();
  resizeObserver?.disconnect();

  if (measureFrame) {
    window.cancelAnimationFrame(measureFrame);
  }

  if (fullscreenListener) {
    document.removeEventListener("fullscreenchange", fullscreenListener);
  }
});
</script>

<template>
  <div
    ref="shellRef"
    class="workspace-shell relative h-full min-h-0 overflow-hidden rounded-[2rem] border border-muted/60 bg-default"
  >
    <div
      ref="viewportRef"
      class="canvas-viewport absolute inset-0"
      :class="viewportClasses"
      :style="backgroundStyle"
      @mousedown="onMouseDown"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @lostpointercapture="onLostPointerCapture"
      @wheel="onWheel"
    >
      <div ref="worldRef" class="canvas-plane" :style="canvasStyle">
        <slot />
      </div>
    </div>

    <div class="pointer-events-none absolute inset-x-4 top-4 flex items-start justify-between gap-4">
      <div class="pointer-events-auto max-w-sm rounded-[1.75rem] border border-muted/70 bg-default/80 p-5 shadow-xl shadow-black/5 backdrop-blur-md">
        <p class="text-[0.65rem] font-semibold uppercase tracking-[0.35em] text-muted">
          Infinite Workspace
        </p>
        <h2 class="mt-3 font-serif text-2xl leading-tight text-highlighted">
          Navigate the dashboard like a living surface.
        </h2>
        <p class="mt-3 text-sm leading-6 text-toned">
          Pan with middle mouse or hold Space and drag. Mouse-wheel zoom stays anchored to the cursor,
          so inspection feels local instead of snapping toward the corner.
        </p>
      </div>

      <div class="pointer-events-auto flex items-center gap-2 rounded-[1.75rem] border border-muted/70 bg-default/80 p-2 shadow-xl shadow-black/5 backdrop-blur-md">
        <button type="button" :class="controlButtonClass" aria-label="Zoom out" @click="zoomOut">
          <UIcon name="i-lucide-minus" class="size-4" />
        </button>

        <div class="min-w-20 rounded-2xl border border-muted/70 bg-elevated/80 px-4 py-2 text-center">
          <div class="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">Zoom</div>
          <div class="mt-1 text-sm font-semibold text-highlighted">{{ zoomPercent }}%</div>
        </div>

        <button type="button" :class="controlButtonClass" aria-label="Zoom in" @click="zoomIn">
          <UIcon name="i-lucide-plus" class="size-4" />
        </button>

        <button type="button" :class="controlButtonClass" aria-label="Reset zoom to 100%" @click="resetView">
          <UIcon name="i-lucide-rotate-ccw" class="size-4" />
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

    <div class="pointer-events-none absolute bottom-4 right-4 overflow-hidden rounded-[1.75rem] border border-muted/70 bg-default/85 shadow-xl shadow-black/5 backdrop-blur-md">
      <div class="flex items-center justify-between gap-3 border-b border-muted/60 px-4 py-3">
        <div>
          <p class="text-[0.65rem] font-semibold uppercase tracking-[0.3em] text-muted">Mini-map</p>
          <p class="mt-1 text-xs text-toned">{{ minimapNodeRects.length }} nodes in view</p>
        </div>
        <div class="rounded-full border border-muted/60 bg-elevated/80 px-3 py-1 text-xs font-medium text-toned">
          {{ zoomPercent }}%
        </div>
      </div>

      <div class="minimap-surface relative overflow-hidden" :style="minimapSceneStyle">
        <div
          v-for="node in minimapNodeRects"
          :key="node.key"
          class="absolute rounded-md border border-primary/60 bg-primary/20"
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
    radial-gradient(circle at top left, color-mix(in srgb, var(--ui-primary) 8%, transparent), transparent 32%),
    linear-gradient(135deg, color-mix(in srgb, var(--ui-bg-elevated) 55%, transparent), transparent 45%);
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

.minimap-surface {
  background-color: color-mix(in srgb, var(--ui-bg-elevated) 82%, black 18%);
  background-image: radial-gradient(var(--ui-border) 1px, transparent 1px);
}
</style>
