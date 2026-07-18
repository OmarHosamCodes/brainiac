import { ChevronDown, Plus, Star } from "lucide-react";

import { AgencyProjectHueDot } from "@/features/shared/agency-project-hue-dot";
import { AgencySearchHighlight } from "@/features/shared/agency-search-highlight";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { projectHueStyle } from "@/features/shared/project-palette";
import { cn } from "@/lib/utils";

type AgencyTaskChooserProjectRowProps = {
  projectId: string;
  projectName: string;
  clientName: string;
  colorHueId?: number | null;
  taskCount: number;
  expanded: boolean;
  favorited: boolean;
  searchTerm: string;
  highlightSearch: boolean;
  showClientName: boolean;
  showCreateTask: boolean;
  onToggle: () => void;
  onToggleFavorite: () => void;
  onCreateTask: () => void;
};

export function AgencyTaskChooserProjectRow({
  projectId,
  projectName,
  clientName,
  colorHueId,
  taskCount,
  expanded,
  favorited,
  searchTerm,
  highlightSearch,
  showClientName,
  showCreateTask,
  onToggle,
  onToggleFavorite,
  onCreateTask,
}: AgencyTaskChooserProjectRowProps) {
  const projectStyle = projectHueStyle(projectId, colorHueId);

  return (
    <div className="group flex w-full items-center gap-0.5 rounded-lg pr-1 transition-colors hover:bg-default/80">
      <button
        type="button"
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left",
          agencyFocusRingClass,
          "motion-reduce:transition-none",
        )}
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <AgencyProjectHueDot projectId={projectId} colorHueId={colorHueId} className="size-2" />
        <span className="min-w-0 flex-1 truncate text-sm leading-snug">
          <span
            className="font-semibold text-[var(--project-hue)] dark:text-[var(--project-hue-dark)]"
            style={projectStyle}
          >
            {highlightSearch ? (
              <AgencySearchHighlight text={projectName} query={searchTerm} />
            ) : (
              projectName
            )}
          </span>
          {showClientName && clientName ? (
            <span className="font-normal text-dimmed">
              {" · "}
              {highlightSearch ? (
                <AgencySearchHighlight text={clientName} query={searchTerm} />
              ) : (
                clientName
              )}
            </span>
          ) : null}
        </span>
        <span className="shrink-0 text-[11px] font-normal text-dimmed tabular-nums">
          {taskCount} {taskCount === 1 ? "task" : "tasks"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none",
            expanded && "rotate-180",
          )}
          aria-hidden
        />
      </button>
      <button
        type="button"
        aria-label={favorited ? "Remove project from favorites" : "Add project to favorites"}
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
      {showCreateTask && expanded ? (
        <button
          type="button"
          aria-label="Create task"
          className={cn(
            "inline-flex size-7 shrink-0 items-center justify-center rounded-md text-info",
            "pointer-events-none opacity-0 transition-opacity",
            "group-hover:pointer-events-auto group-hover:opacity-100",
            "focus-visible:pointer-events-auto focus-visible:opacity-100",
            agencyFocusRingClass,
          )}
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
          }}
          onClick={(event) => {
            event.stopPropagation();
            onCreateTask();
          }}
        >
          <Plus className="size-3.5" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}
