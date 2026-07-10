import type { WorkspaceNode } from "@orch/workspace";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type DashboardAgentMentionMenuProps = {
  suggestions: WorkspaceNode[];
  onSelect: (node: WorkspaceNode) => void;
  onDismiss: () => void;
  className?: string;
};

export function DashboardAgentMentionMenu({
  suggestions,
  onSelect,
  onDismiss,
  className,
}: DashboardAgentMentionMenuProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [suggestions]);

  useEffect(() => {
    function handleKeydown(event: KeyboardEvent) {
      if (suggestions.length === 0) return;

      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveIndex((current) => (current + 1) % suggestions.length);
          break;
        case "ArrowUp":
          event.preventDefault();
          setActiveIndex((current) => (current - 1 + suggestions.length) % suggestions.length);
          break;
        case "Enter":
          event.preventDefault();
          if (suggestions[activeIndex]) {
            onSelect(suggestions[activeIndex]);
          }
          break;
        case "Escape":
          event.preventDefault();
          onDismiss();
          break;
        default:
          break;
      }
    }

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [activeIndex, onDismiss, onSelect, suggestions]);

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div
      ref={listRef}
      role="listbox"
      aria-label="Node mentions"
      className={cn(
        "absolute bottom-full left-0 z-40 mb-2 w-full max-h-48 overflow-y-auto rounded-xl border border-default bg-default p-1 shadow-[0_4px_16px_oklch(0.18_0.005_285_/_0.08)]",
        className,
      )}
    >
      {suggestions.map((node, index) => (
        <button
          key={node.id}
          type="button"
          role="option"
          aria-selected={index === activeIndex}
          className={cn(
            "flex w-full flex-col rounded-lg px-2.5 py-2 text-left transition-colors",
            index === activeIndex
              ? "bg-primary/10 text-highlighted"
              : "text-muted hover:bg-muted/40",
          )}
          onMouseEnter={() => setActiveIndex(index)}
          onClick={() => onSelect(node)}
        >
          <span className="truncate text-sm font-semibold">{node.title}</span>
          {node.label ? <span className="truncate text-xs text-muted">{node.label}</span> : null}
        </button>
      ))}
    </div>
  );
}
