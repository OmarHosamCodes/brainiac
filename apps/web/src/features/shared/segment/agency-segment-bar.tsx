import { useEffect } from "react";

import type { AgencySegmentId } from "@/features/shared/agency-segments";
import { AGENCY_SEGMENTS } from "@/features/shared/agency-segments";
import { LucideIcon } from "@/lib/lucide-icon";
import {
  shellFocusRingClass,
  shellInPageSubnavClass,
  shellSegmentTabActiveClass,
  shellSegmentTabClass,
} from "@/lib/utils/app-shell-ui";
import { cn } from "@/lib/utils";

type AgencySegmentBarProps = {
  segment: AgencySegmentId;
  onSegmentChange: (segment: AgencySegmentId) => void;
  /** Renders inline in the topbar breadcrumb instead of the in-page subnav strip. */
  variant?: "page" | "breadcrumb";
};

function tabIdFor(segmentId: AgencySegmentId) {
  return `agency-tab-${segmentId}`;
}

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}

export function AgencySegmentBar({
  segment,
  onSegmentChange,
  variant = "page",
}: AgencySegmentBarProps) {
  const isBreadcrumb = variant === "breadcrumb";

  function selectSegment(nextSegment: AgencySegmentId) {
    if (nextSegment === segment) return;
    onSegmentChange(nextSegment);
  }

  function handleTabKeydown(event: React.KeyboardEvent<HTMLButtonElement>, index: number) {
    const lastIndex = AGENCY_SEGMENTS.length - 1;
    let nextIndex = index;

    if (event.key === "ArrowRight") {
      event.preventDefault();
      nextIndex = index >= lastIndex ? 0 : index + 1;
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      nextIndex = index <= 0 ? lastIndex : index - 1;
    } else if (event.key === "Home") {
      event.preventDefault();
      nextIndex = 0;
    } else if (event.key === "End") {
      event.preventDefault();
      nextIndex = lastIndex;
    } else {
      return;
    }

    const nextSegment = AGENCY_SEGMENTS[nextIndex];
    if (nextSegment) selectSegment(nextSegment.id);
  }

  useEffect(() => {
    let pendingPrefix = false;
    let prefixTimer: ReturnType<typeof setTimeout> | null = null;

    function clearPrefix() {
      pendingPrefix = false;
      if (prefixTimer) {
        clearTimeout(prefixTimer);
        prefixTimer = null;
      }
    }

    function handleKeydown(event: KeyboardEvent) {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        clearPrefix();
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)
      ) {
        clearPrefix();
        return;
      }

      const key = event.key.toLowerCase();

      if (!pendingPrefix) {
        if (key === "g") {
          pendingPrefix = true;
          prefixTimer = setTimeout(clearPrefix, 1_000);
          return;
        }
        return;
      }

      const match = AGENCY_SEGMENTS.find((entry) => entry.shortcutKey === key);
      if (match) {
        event.preventDefault();
        selectSegment(match.id);
      }
      clearPrefix();
    }

    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
      clearPrefix();
    };
  }, [segment, onSegmentChange]);

  return (
    <nav
      className={cn(isBreadcrumb ? "min-w-0" : shellInPageSubnavClass)}
      role="tablist"
      aria-label="Agency sections"
    >
      <div
        className={cn(
          "flex items-center gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
          isBreadcrumb ? "max-w-full py-0" : "py-2.5",
        )}
      >
        {AGENCY_SEGMENTS.map((entry, index) => (
          <button
            key={entry.id}
            id={tabIdFor(entry.id)}
            type="button"
            role="tab"
            aria-selected={entry.id === segment}
            aria-controls={panelIdFor(entry.id)}
            tabIndex={entry.id === segment ? 0 : -1}
            className={cn(
              shellSegmentTabClass,
              shellFocusRingClass,
              isBreadcrumb && "shrink-0 px-2.5 py-1",
              entry.id === segment && shellSegmentTabActiveClass,
            )}
            title={`${entry.label} (g ${entry.shortcutKey})`}
            onClick={() => selectSegment(entry.id)}
            onKeyDown={(event) => handleTabKeydown(event, index)}
          >
            <LucideIcon name={entry.icon} className="size-3.5" />
            <span>{entry.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
