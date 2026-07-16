import { Star } from "lucide-react";

import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTaskChooserTaskRowProps = {
  taskId: string;
  title: string;
  selected: boolean;
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
  favorited,
  searchTerm,
  highlightSearch,
  onSelect,
  onToggleFavorite,
}: AgencyTaskChooserTaskRowProps) {
  return (
    <div
      className={cn(
        "group flex w-full items-center gap-0.5 rounded-lg pr-1 pl-5 transition-colors hover:bg-default/80",
        selected && "bg-primary/10 hover:bg-primary/10",
      )}
    >
      <button
        type="button"
        data-selected-task={selected ? "true" : undefined}
        data-task-id={taskId}
        className={cn(
          "flex min-w-0 flex-1 items-center rounded-lg px-2 py-1.5 text-left",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        onClick={onSelect}
      >
        <span
          className={cn(
            "min-w-0 flex-1 truncate text-sm font-medium",
            selected ? "text-primary" : "text-highlighted",
          )}
        >
          {highlightSearch ? <AgencySearchHighlight text={title} query={searchTerm} /> : title}
        </span>
      </button>
      <button
        type="button"
        aria-label={favorited ? "Remove task from favorites" : "Add task to favorites"}
        className={cn(
          "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100",
          favorited && "text-warning opacity-100",
          agencyFocusRingClass,
        )}
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
