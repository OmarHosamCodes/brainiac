import type {
  WorkspaceNodeConnection,
  WorkspaceNodeTint,
  WorkspaceNodeType,
} from "@brainiac/workspace";
import {
  computed,
  onBeforeUnmount,
  onMounted,
  reactive,
  ref,
  type CSSProperties,
  type Ref,
} from "vue";

export interface CanvasRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CanvasNodeModel extends CanvasRect {
  id: string;
  label?: string;
  title?: string;
  content?: string;
  nodeType?: WorkspaceNodeType;
  connections?: WorkspaceNodeConnection[];
  minWidth?: number;
  minHeight?: number;
  dashboard?: {
    tint?: WorkspaceNodeTint;
  };
}

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const GRID_SPACING = 28;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;

export type CanvasPointerDownOptions = {
  /** Primary-button pan on empty canvas (caller decides what counts as empty). */
  allowPrimaryPan?: boolean;
};
const ZOOM_SENSITIVITY = 0.0014;
const ZOOM_STEP = 1.2;

export function useCanvas(viewportRef: Ref<HTMLElement | null>) {
  const camera = reactive<Camera>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  const viewportSize = reactive({
    width: 0,
    height: 0,
  });

  const isPanning = ref(false);
  const isSpacePressed = ref(false);

  let activePointerId: number | null = null;
  let lastPointerX = 0;
  let lastPointerY = 0;
  let pendingPanX = 0;
  let pendingPanY = 0;
  let panFrame = 0;
  let resizeObserver: ResizeObserver | null = null;

  function clampZoom(nextZoom: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  }

  function applyCamera(nextX: number, nextY: number, nextZoom = camera.zoom) {
    camera.x = nextX;
    camera.y = nextY;
    camera.zoom = clampZoom(nextZoom);
    pendingPanX = 0;
    pendingPanY = 0;
  }

  function flushPan() {
    panFrame = 0;

    if (!pendingPanX && !pendingPanY) {
      return;
    }

    camera.x += pendingPanX;
    camera.y += pendingPanY;
    pendingPanX = 0;
    pendingPanY = 0;
  }

  function queuePan(dx: number, dy: number) {
    pendingPanX += dx;
    pendingPanY += dy;

    if (!panFrame) {
      panFrame = window.requestAnimationFrame(flushPan);
    }
  }

  function updateViewportSize() {
    const viewport = viewportRef.value;

    if (!viewport) {
      return;
    }

    viewportSize.width = viewport.clientWidth;
    viewportSize.height = viewport.clientHeight;
  }

  function getViewportAnchor() {
    const viewport = viewportRef.value;

    if (!viewport) {
      return null;
    }

    const rect = viewport.getBoundingClientRect();

    return {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
  }

  function screenToWorld(clientX: number, clientY: number) {
    const viewport = viewportRef.value;

    if (!viewport) {
      return null;
    }

    const rect = viewport.getBoundingClientRect();
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    return {
      x: (pointerX - camera.x) / camera.zoom,
      y: (pointerY - camera.y) / camera.zoom,
    };
  }

  function centerOnWorldPoint(worldX: number, worldY: number, targetZoom = camera.zoom) {
    const nextZoom = clampZoom(targetZoom);

    applyCamera(
      viewportSize.width / 2 - worldX * nextZoom,
      viewportSize.height / 2 - worldY * nextZoom,
      nextZoom,
    );
  }

  function fitToRect(rect: CanvasRect, padding = 120) {
    if (!viewportSize.width || !viewportSize.height) {
      return;
    }

    const availableWidth = Math.max(viewportSize.width - padding * 2, 1);
    const availableHeight = Math.max(viewportSize.height - padding * 2, 1);
    const targetZoom = Math.min(
      availableWidth / Math.max(rect.width, 1),
      availableHeight / Math.max(rect.height, 1),
    );

    const centerX = rect.x + rect.width / 2;
    const centerY = rect.y + rect.height / 2;

    // Fit uses the rect center as the destination focal point, then derives the
    // zoom that allows the full rect to live inside the viewport padding.
    centerOnWorldPoint(centerX, centerY, targetZoom);
  }

  function zoomTo(clientX: number, clientY: number, targetZoom: number) {
    const viewport = viewportRef.value;

    if (!viewport) {
      return;
    }

    const rect = viewport.getBoundingClientRect();
    const nextZoom = clampZoom(targetZoom);
    const pointerX = clientX - rect.left;
    const pointerY = clientY - rect.top;

    // Convert the cursor's screen-space position back into world-space using the
    // current camera transform so we know which world point is being inspected.
    const worldX = (pointerX - camera.x) / camera.zoom;
    const worldY = (pointerY - camera.y) / camera.zoom;

    // After changing scale, translate the world so the exact same world point
    // stays under the cursor. This is the core zoom-to-cursor relationship.
    applyCamera(pointerX - worldX * nextZoom, pointerY - worldY * nextZoom, nextZoom);
  }

  function zoomBy(multiplier: number, anchor = getViewportAnchor()) {
    if (!anchor) {
      return;
    }

    zoomTo(anchor.clientX, anchor.clientY, camera.zoom * multiplier);
  }

  function zoomIn() {
    zoomBy(ZOOM_STEP);
  }

  function zoomOut() {
    zoomBy(1 / ZOOM_STEP);
  }

  function resetView() {
    applyCamera(0, 0, 1);
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();

    const zoomMultiplier = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
    zoomTo(event.clientX, event.clientY, camera.zoom * zoomMultiplier);
  }

  function onMouseDown(event: MouseEvent, options?: CanvasPointerDownOptions) {
    const shouldPrevent =
      event.button === 1 ||
      (event.button === 0 && isSpacePressed.value) ||
      (event.button === 0 && options?.allowPrimaryPan);

    if (shouldPrevent) {
      event.preventDefault();
    }
  }

  function onPointerDown(event: PointerEvent, options?: CanvasPointerDownOptions) {
    const shouldPan =
      event.button === 1 ||
      (event.button === 0 && isSpacePressed.value) ||
      (event.button === 0 && options?.allowPrimaryPan);

    if (!shouldPan) {
      return;
    }

    event.preventDefault();
    activePointerId = event.pointerId;
    isPanning.value = true;
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
    viewportRef.value?.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: PointerEvent) {
    if (!isPanning.value || event.pointerId !== activePointerId) {
      return;
    }

    queuePan(event.clientX - lastPointerX, event.clientY - lastPointerY);
    lastPointerX = event.clientX;
    lastPointerY = event.clientY;
  }

  function finishPanning(pointerId?: number | null) {
    if (pointerId != null && activePointerId !== pointerId) {
      return;
    }

    isPanning.value = false;
    activePointerId = null;
  }

  function onPointerUp(event: PointerEvent) {
    if (
      activePointerId === event.pointerId &&
      viewportRef.value?.hasPointerCapture(event.pointerId)
    ) {
      viewportRef.value?.releasePointerCapture(event.pointerId);
    }

    finishPanning(event.pointerId);
  }

  function onLostPointerCapture() {
    finishPanning();
  }

  function shouldIgnoreShortcut(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"),
    );
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.code !== "Space" || shouldIgnoreShortcut(event.target)) {
      return;
    }

    event.preventDefault();
    isSpacePressed.value = true;
  }

  function clearSpaceMode() {
    isSpacePressed.value = false;
  }

  function onKeyUp(event: KeyboardEvent) {
    if (event.code === "Space") {
      clearSpaceMode();
    }
  }

  onMounted(() => {
    updateViewportSize();

    resizeObserver = new ResizeObserver(updateViewportSize);

    if (viewportRef.value) {
      resizeObserver.observe(viewportRef.value);
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearSpaceMode);
  });

  onBeforeUnmount(() => {
    resizeObserver?.disconnect();

    if (panFrame) {
      window.cancelAnimationFrame(panFrame);
    }

    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
    window.removeEventListener("blur", clearSpaceMode);
  });

  const canvasStyle = computed<CSSProperties>(() => ({
    transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
    transformOrigin: "0 0",
    willChange: "transform",
  }));

  const backgroundStyle = computed<CSSProperties>(() => {
    const scaledGrid = GRID_SPACING * camera.zoom;
    const offsetX = ((camera.x % scaledGrid) + scaledGrid) % scaledGrid;
    const offsetY = ((camera.y % scaledGrid) + scaledGrid) % scaledGrid;

    return {
      backgroundPosition: `${offsetX}px ${offsetY}px`,
      backgroundSize: `${scaledGrid}px ${scaledGrid}px`,
    };
  });

  const visibleWorldRect = computed<CanvasRect>(() => ({
    // The camera transform is world -> screen. Inverting it gives the world-space
    // rectangle currently visible through the viewport, which the minimap reuses.
    x: -camera.x / camera.zoom,
    y: -camera.y / camera.zoom,
    width: viewportSize.width / camera.zoom,
    height: viewportSize.height / camera.zoom,
  }));

  return {
    camera,
    canvasStyle,
    backgroundStyle,
    isPanning,
    isSpacePressed,
    visibleWorldRect,
    viewportSize,
    zoomPercent: computed(() => Math.round(camera.zoom * 100)),
    centerOnWorldPoint,
    fitToRect,
    screenToWorld,
    onMouseDown,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onLostPointerCapture,
    onWheel,
    resetView,
    zoomIn,
    zoomOut,
  };
}
