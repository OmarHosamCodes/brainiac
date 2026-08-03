import { useEffect, useRef } from "react";

/** Focus Close and Esc-dismiss for the full-viewport artifact canvas. */
export function useAgentCanvasOverlay(enabled: boolean, onClose: () => void) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!enabled) return;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose();
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [enabled, onClose]);

  return { closeRef };
}
