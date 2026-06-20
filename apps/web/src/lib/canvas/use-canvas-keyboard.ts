import { useEffect, type RefObject } from "react";
import type { ReactFlowInstance } from "@xyflow/react";

type UseCanvasKeyboardOptions = {
  containerRef: RefObject<HTMLElement | null>;
  reactFlow: ReactFlowInstance | null;
  selectedNodeIds: string[];
  onSelectedNodeIdsChange: (ids: string[]) => void;
  onRemoveNode: (payload: { nodeId: string }) => void;
  onFitAll: () => void;
  onNudgeNodes: (deltaX: number, deltaY: number) => void;
};

function shouldIgnoreShortcut(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(
    target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']"),
  );
}

export function useCanvasKeyboard({
  containerRef,
  reactFlow,
  selectedNodeIds,
  onSelectedNodeIdsChange,
  onRemoveNode,
  onFitAll,
  onNudgeNodes,
}: UseCanvasKeyboardOptions) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (!container.contains(document.activeElement) && document.activeElement !== container) {
        return;
      }

      if (shouldIgnoreShortcut(event.target)) {
        return;
      }

      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const zoomDuration = reducedMotion ? 0 : 150;

      switch (event.key) {
        case "ArrowUp":
          event.preventDefault();
          onNudgeNodes(0, event.shiftKey ? -10 : -1);
          break;
        case "ArrowDown":
          event.preventDefault();
          onNudgeNodes(0, event.shiftKey ? 10 : 1);
          break;
        case "ArrowLeft":
          event.preventDefault();
          onNudgeNodes(event.shiftKey ? -10 : -1, 0);
          break;
        case "ArrowRight":
          event.preventDefault();
          onNudgeNodes(event.shiftKey ? 10 : 1, 0);
          break;
        case "+":
        case "=":
          event.preventDefault();
          reactFlow?.zoomIn({ duration: zoomDuration });
          break;
        case "-":
        case "_":
          event.preventDefault();
          reactFlow?.zoomOut({ duration: zoomDuration });
          break;
        case "0":
          event.preventDefault();
          reactFlow?.zoomTo(1, { duration: zoomDuration });
          break;
        case "f":
        case "F":
          event.preventDefault();
          onFitAll();
          break;
        case "Delete":
        case "Backspace":
          if (selectedNodeIds.length === 0) {
            break;
          }
          event.preventDefault();
          for (const nodeId of selectedNodeIds) {
            onRemoveNode({ nodeId });
          }
          break;
        case "Escape":
          event.preventDefault();
          onSelectedNodeIdsChange([]);
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    containerRef,
    onFitAll,
    onNudgeNodes,
    onRemoveNode,
    onSelectedNodeIdsChange,
    reactFlow,
    selectedNodeIds,
  ]);
}
