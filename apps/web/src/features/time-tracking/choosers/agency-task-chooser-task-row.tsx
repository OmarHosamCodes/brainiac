import { Star } from "lucide-react";
import type { PointerEvent } from "react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskChooserTaskRowProps = {
  taskId: string;
  title: string;
  selected: boolean;
  bestMatch?: boolean;
  favorited: boolean;
  searchTerm: string;
  highlightSearch: boolean;
  onSelect: () => void;
  onToggleFavorite: () => void;
};

export function AgencyTaskChooserTaskRow({
  taskId,
  title,
  selected,
  bestMatch = false,
  favorited,
  searchTerm,
  highlightSearch,
  onSelect,
  onToggleFavorite,
}: AgencyTaskChooserTaskRowProps) {
  function keepPointerInsideChooser(event: PointerEvent<HTMLButtonElement>) {
    // Keep the search input's blur and Radix's dismiss layer from racing the click.
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div
      className={cn(
        "group flex w-full items-center gap-0.5 rounded-lg pr-1 pl-5 transition-colors hover:bg-default/80",
        selected && "bg-primary/10 hover:bg-primary/10",
        !selected && bestMatch && "bg-accent/40 hover:bg-accent/50",
      )}
    >
      <button
        type="button"
        data-selected-task={selected ? "true" : undefined}
        data-best-match-task={!selected && bestMatch ? "true" : undefined}
        data-task-id={taskId}
        className={cn(
          "flex min-w-0 flex-1 items-center rounded-lg px-2 py-1.5 text-left",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        onPointerDown={keepPointerInsideChooser}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-normal leading-snug",
            selected ? "font-medium text-primary" : "text-muted",
            !selected && bestMatch && "font-medium text-foreground",
          )}
        >
          {highlightSearch ? <AgencySearchHighlight text={title} query={searchTerm} /> : title}
        </span>
      </button>
      <button
        type="button"
        aria-label={favorited ? "Remove task from favorites" : "Add task to favorites"}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted",
          "pointer-events-none opacity-0 transition-opacity",
          "group-hover:pointer-events-auto group-hover:opacity-100",
          "focus-visible:pointer-events-auto focus-visible:opacity-100",
          favorited && "pointer-events-auto text-warning opacity-100",
          agencyFocusRingClass,
        )}
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        onClick={(event) => {
          event.stopPropagation();
          onToggleFavorite();
        }}
      >
        <Star className={cn("size-3.5", favorited && "fill-current")} aria-hidden />
      </button>
    </div>
  );
}
