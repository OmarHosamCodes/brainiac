import { reactive, computed, onMounted, onBeforeUnmount, type Ref } from "vue";

interface Camera {
  x: number;
  y: number;
  zoom: number;
}

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const ZOOM_SENSITIVITY = 0.001;

export function useCanvas(viewportRef: Ref<HTMLElement | null>) {
  const camera = reactive<Camera>({
    x: 0,
    y: 0,
    zoom: 1,
  });

  let isDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  // --- Pan handlers ---

  function onPointerDown(e: PointerEvent) {
    // Only pan on primary button (left click) or touch
    if (e.button !== 0) return;
    isDragging = true;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;
    viewportRef.value?.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const dx = e.clientX - lastPointerX;
    const dy = e.clientY - lastPointerY;
    lastPointerX = e.clientX;
    lastPointerY = e.clientY;

    camera.x += dx;
    camera.y += dy;
  }

  function onPointerUp(e: PointerEvent) {
    if (!isDragging) return;
    isDragging = false;
    viewportRef.value?.releasePointerCapture(e.pointerId);
  }

  // --- Zoom handler (zoom toward cursor) ---

  function onWheel(e: WheelEvent) {
    e.preventDefault();

    const viewport = viewportRef.value;
    if (!viewport) return;

    const rect = viewport.getBoundingClientRect();

    // Mouse position relative to the viewport
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Point on the canvas under the cursor before zoom
    const canvasX = (mouseX - camera.x) / camera.zoom;
    const canvasY = (mouseY - camera.y) / camera.zoom;

    // Compute new zoom
    const delta = -e.deltaY * ZOOM_SENSITIVITY;
    const newZoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, camera.zoom * (1 + delta)));

    // Adjust camera so the point under the cursor stays put
    camera.x = mouseX - canvasX * newZoom;
    camera.y = mouseY - canvasY * newZoom;
    camera.zoom = newZoom;
  }

  // --- Computed styles ---

  const canvasStyle = computed(() => ({
    transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
    transformOrigin: "0 0",
    willChange: "transform",
  }));

  const gridSize = computed(() => 20 * camera.zoom);

  const backgroundStyle = computed(() => ({
    backgroundPosition: `${camera.x}px ${camera.y}px`,
    backgroundSize: `${gridSize.value}px ${gridSize.value}px`,
  }));

  // --- Lifecycle: attach / detach listeners ---

  onMounted(() => {
    const el = viewportRef.value;
    if (!el) return;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointercancel", onPointerUp);
    el.addEventListener("wheel", onWheel, { passive: false });
  });

  onBeforeUnmount(() => {
    const el = viewportRef.value;
    if (!el) return;
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", onPointerUp);
    el.removeEventListener("pointercancel", onPointerUp);
    el.removeEventListener("wheel", onWheel);
  });

  return {
    camera,
    isDragging: computed(() => isDragging),
    canvasStyle,
    backgroundStyle,
  };
}
