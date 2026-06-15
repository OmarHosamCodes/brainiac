import type {
  WorkspaceNodeConnection,
  WorkspaceNodeTint,
  WorkspaceNodeType,
} from "@brainiac/workspace";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";

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
const ZOOM_SENSITIVITY = 0.0014;
const ZOOM_STEP = 1.2;

export type CanvasPointerDownOptions = {
  allowPrimaryPan?: boolean;
};

export function useCanvas(viewportRef: RefObject<HTMLElement | null>) {
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [, forceRender] = useState(0);

  const cameraRef = useRef(camera);
  cameraRef.current = camera;

  const activePointerIdRef = useRef<number | null>(null);
  const lastPointerRef = useRef({ x: 0, y: 0 });
  const pendingPanRef = useRef({ x: 0, y: 0 });
  const panFrameRef = useRef(0);

  const clampZoom = useCallback((nextZoom: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  }, []);

  const applyCamera = useCallback(
    (nextX: number, nextY: number, nextZoom = cameraRef.current.zoom) => {
      pendingPanRef.current = { x: 0, y: 0 };
      setCamera({ x: nextX, y: nextY, zoom: clampZoom(nextZoom) });
    },
    [clampZoom],
  );

  const flushPan = useCallback(() => {
    panFrameRef.current = 0;
    const { x, y } = pendingPanRef.current;

    if (!x && !y) {
      return;
    }

    pendingPanRef.current = { x: 0, y: 0 };
    setCamera((current) => ({ ...current, x: current.x + x, y: current.y + y }));
  }, []);

  const queuePan = useCallback(
    (dx: number, dy: number) => {
      pendingPanRef.current.x += dx;
      pendingPanRef.current.y += dy;

      if (!panFrameRef.current) {
        panFrameRef.current = window.requestAnimationFrame(flushPan);
      }
    },
    [flushPan],
  );

  const updateViewportSize = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    setViewportSize({ width: viewport.clientWidth, height: viewport.clientHeight });
  }, [viewportRef]);

  const getViewportAnchor = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return null;
    }

    const rect = viewport.getBoundingClientRect();

    return {
      clientX: rect.left + rect.width / 2,
      clientY: rect.top + rect.height / 2,
    };
  }, [viewportRef]);

  const screenToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return null;
      }

      const rect = viewport.getBoundingClientRect();
      const pointerX = clientX - rect.left;
      const pointerY = clientY - rect.top;
      const current = cameraRef.current;

      return {
        x: (pointerX - current.x) / current.zoom,
        y: (pointerY - current.y) / current.zoom,
      };
    },
    [viewportRef],
  );

  const centerOnWorldPoint = useCallback(
    (worldX: number, worldY: number, targetZoom = cameraRef.current.zoom) => {
      const nextZoom = clampZoom(targetZoom);

      applyCamera(
        viewportSize.width / 2 - worldX * nextZoom,
        viewportSize.height / 2 - worldY * nextZoom,
        nextZoom,
      );
    },
    [applyCamera, clampZoom, viewportSize.height, viewportSize.width],
  );

  const fitToRect = useCallback(
    (rect: CanvasRect, padding = 120) => {
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

      centerOnWorldPoint(centerX, centerY, targetZoom);
    },
    [centerOnWorldPoint, viewportSize.height, viewportSize.width],
  );

  const zoomTo = useCallback(
    (clientX: number, clientY: number, targetZoom: number) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const rect = viewport.getBoundingClientRect();
      const nextZoom = clampZoom(targetZoom);
      const pointerX = clientX - rect.left;
      const pointerY = clientY - rect.top;
      const current = cameraRef.current;
      const worldX = (pointerX - current.x) / current.zoom;
      const worldY = (pointerY - current.y) / current.zoom;

      applyCamera(pointerX - worldX * nextZoom, pointerY - worldY * nextZoom, nextZoom);
    },
    [applyCamera, clampZoom, viewportRef],
  );

  const zoomBy = useCallback(
    (multiplier: number, anchor = getViewportAnchor()) => {
      if (!anchor) {
        return;
      }

      zoomTo(anchor.clientX, anchor.clientY, cameraRef.current.zoom * multiplier);
    },
    [getViewportAnchor, zoomTo],
  );

  const zoomIn = useCallback(() => {
    zoomBy(ZOOM_STEP);
  }, [zoomBy]);

  const zoomOut = useCallback(() => {
    zoomBy(1 / ZOOM_STEP);
  }, [zoomBy]);

  const resetView = useCallback(() => {
    applyCamera(0, 0, 1);
  }, [applyCamera]);

  const onWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const zoomMultiplier = Math.exp(-event.deltaY * ZOOM_SENSITIVITY);
      zoomTo(event.clientX, event.clientY, cameraRef.current.zoom * zoomMultiplier);
    },
    [zoomTo],
  );

  const shouldIgnoreShortcut = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) {
      return false;
    }

    return Boolean(
      target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"),
    );
  };

  const onMouseDown = useCallback(
    (event: MouseEvent, options?: CanvasPointerDownOptions) => {
      const shouldPrevent =
        event.button === 1 ||
        (event.button === 0 && isSpacePressed) ||
        (event.button === 0 && options?.allowPrimaryPan);

      if (shouldPrevent) {
        event.preventDefault();
      }
    },
    [isSpacePressed],
  );

  const finishPanning = useCallback((pointerId?: number | null) => {
    if (pointerId != null && activePointerIdRef.current !== pointerId) {
      return;
    }

    setIsPanning(false);
    activePointerIdRef.current = null;
  }, []);

  const onPointerDown = useCallback(
    (event: PointerEvent, options?: CanvasPointerDownOptions) => {
      const shouldPan =
        event.button === 1 ||
        (event.button === 0 && isSpacePressed) ||
        (event.button === 0 && options?.allowPrimaryPan);

      if (!shouldPan) {
        return;
      }

      event.preventDefault();
      activePointerIdRef.current = event.pointerId;
      setIsPanning(true);
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
      viewportRef.current?.setPointerCapture(event.pointerId);
    },
    [isSpacePressed, viewportRef],
  );

  const onPointerMove = useCallback(
    (event: PointerEvent) => {
      if (!isPanning || event.pointerId !== activePointerIdRef.current) {
        return;
      }

      queuePan(
        event.clientX - lastPointerRef.current.x,
        event.clientY - lastPointerRef.current.y,
      );
      lastPointerRef.current = { x: event.clientX, y: event.clientY };
    },
    [isPanning, queuePan],
  );

  const onPointerUp = useCallback(
    (event: PointerEvent) => {
      if (
        activePointerIdRef.current === event.pointerId &&
        viewportRef.current?.hasPointerCapture(event.pointerId)
      ) {
        viewportRef.current.releasePointerCapture(event.pointerId);
      }

      finishPanning(event.pointerId);
    },
    [finishPanning, viewportRef],
  );

  const onLostPointerCapture = useCallback(() => {
    finishPanning();
  }, [finishPanning]);

  useEffect(() => {
    updateViewportSize();

    const resizeObserver = new ResizeObserver(updateViewportSize);
    const viewport = viewportRef.current;

    if (viewport) {
      resizeObserver.observe(viewport);
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || shouldIgnoreShortcut(event.target)) {
        return;
      }

      event.preventDefault();
      setIsSpacePressed(true);
    };

    const clearSpaceMode = () => {
      setIsSpacePressed(false);
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        clearSpaceMode();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", clearSpaceMode);

    return () => {
      resizeObserver.disconnect();

      if (panFrameRef.current) {
        window.cancelAnimationFrame(panFrameRef.current);
      }

      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", clearSpaceMode);
    };
  }, [updateViewportSize, viewportRef]);

  const canvasStyle = useMemo<CSSProperties>(
    () => ({
      transform: `translate(${camera.x}px, ${camera.y}px) scale(${camera.zoom})`,
      transformOrigin: "0 0",
      willChange: "transform",
    }),
    [camera.x, camera.y, camera.zoom],
  );

  const backgroundStyle = useMemo<CSSProperties>(() => {
    const scaledGrid = GRID_SPACING * camera.zoom;
    const offsetX = ((camera.x % scaledGrid) + scaledGrid) % scaledGrid;
    const offsetY = ((camera.y % scaledGrid) + scaledGrid) % scaledGrid;

    return {
      backgroundPosition: `${offsetX}px ${offsetY}px`,
      backgroundSize: `${scaledGrid}px ${scaledGrid}px`,
    };
  }, [camera.x, camera.y, camera.zoom]);

  const visibleWorldRect = useMemo<CanvasRect>(
    () => ({
      x: -camera.x / camera.zoom,
      y: -camera.y / camera.zoom,
      width: viewportSize.width / camera.zoom,
      height: viewportSize.height / camera.zoom,
    }),
    [camera.x, camera.y, camera.zoom, viewportSize.height, viewportSize.width],
  );

  const zoomPercent = Math.round(camera.zoom * 100);

  return {
    camera,
    canvasStyle,
    backgroundStyle,
    isPanning,
    isSpacePressed,
    visibleWorldRect,
    viewportSize,
    zoomPercent,
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
    bumpCamera: () => forceRender((value) => value + 1),
  };
}
