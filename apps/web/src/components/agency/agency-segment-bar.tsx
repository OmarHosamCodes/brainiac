import type { AgencySegmentId } from "@/lib/agency-segments";
import { AGENCY_SEGMENTS } from "@/lib/agency-segments";
import { LucideIcon } from "@/lib/lucide-icon";
import {
  shellFocusRingClass,
  shellInPageSubnavClass,
  shellSegmentTabActiveClass,
  shellSegmentTabClass,
} from "@/lib/utils/app-shell-ui";

type AgencySegmentBarProps = {
  segment: AgencySegmentId;
  onSegmentChange: (segment: AgencySegmentId) => void;
};

function tabIdFor(segmentId: AgencySegmentId) {
  return `agency-tab-${segmentId}`;
}

function panelIdFor(segmentId: AgencySegmentId) {
  return `agency-panel-${segmentId}`;
}

export function AgencySegmentBar({ segment, onSegmentChange }: AgencySegmentBarProps) {
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

  return (
    <nav className={shellInPageSubnavClass} role="tablist" aria-label="Agency sections">
      <div className="flex items-center gap-1 overflow-x-auto py-2.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {AGENCY_SEGMENTS.map((entry, index) => (
          <button
            key={entry.id}
            id={tabIdFor(entry.id)}
            type="button"
            role="tab"
            aria-selected={entry.id === segment}
            aria-controls={panelIdFor(entry.id)}
            tabIndex={entry.id === segment ? 0 : -1}
            className={[
              shellSegmentTabClass,
              shellFocusRingClass,
              entry.id === segment ? shellSegmentTabActiveClass : "",
            ].join(" ")}
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
