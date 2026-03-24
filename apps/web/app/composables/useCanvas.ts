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

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const GRID_SPACING = 28;
const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
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
    camera.zoom = nextZoom;
    camera.x = pointerX - worldX * nextZoom;
    camera.y = pointerY - worldY * nextZoom;
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
    camera.x = 0;
    camera.y = 0;
    camera.zoom = 1;
    pendingPanX = 0;
    pendingPanY = 0;
  }

  function onWheel(event: WheelEvent) {
    event.preventDefault();

    const zoomMultiplier = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
    zoomTo(event.clientX, event.clientY, camera.zoom * zoomMultiplier);
  }

  function onMouseDown(event: MouseEvent) {
    if (event.button === 1 || (event.button === 0 && isSpacePressed.value)) {
      event.preventDefault();
    }
  }

  function onPointerDown(event: PointerEvent) {
    const shouldPan = event.button === 1 || (event.button === 0 && isSpacePressed.value);

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
    if (activePointerId === event.pointerId && viewportRef.value?.hasPointerCapture(event.pointerId)) {
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
