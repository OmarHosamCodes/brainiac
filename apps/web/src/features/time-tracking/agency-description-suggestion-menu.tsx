import type { AgencyDescriptionSuggestion } from "@/features/time-tracking/description-suggestions";
import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import {
  agencyTimeTrackerSuggestionAnchorClass,
  agencyTimeTrackerSuggestionOptionClass,
  agencyTimeTrackerSuggestionPanelClass,
} from "@/features/shared/agency-ui";
import { liquidGlassMenuItemClass } from "@/lib/utils/liquid-glass-ui";
import { cn } from "@/lib/utils";

type AgencyDescriptionSuggestionMenuProps = {
  listboxId: string;
  suggestions: AgencyDescriptionSuggestion[];
  activeIndex: number;
  ariaLabel?: string;
  onActiveIndexChange: (index: number) => void;
  onSelect: (suggestion: AgencyDescriptionSuggestion) => void;
};

export function AgencyDescriptionSuggestionMenu({
  listboxId,
  suggestions,
  activeIndex,
  ariaLabel = "Recent descriptions",
  onActiveIndexChange,
  onSelect,
}: AgencyDescriptionSuggestionMenuProps) {
  return (
    <div className={agencyTimeTrackerSuggestionAnchorClass}>
      <div className={agencyTimeTrackerSuggestionPanelClass}>
        <ul id={listboxId} role="listbox" aria-label={ariaLabel} className="min-w-0 p-1">
          {suggestions.map((suggestion, index) => {
            const active = index === activeIndex;

            return (
              <li key={`${suggestion.projectId}-${suggestion.description}`} role="presentation">
                <button
                  id={`${listboxId}-option-${index}`}
                  type="button"
                  role="option"
                  data-slot="tracker-suggestion-menu-item"
                  aria-selected={active}
                  className={cn(
                    liquidGlassMenuItemClass,
                    agencyTimeTrackerSuggestionOptionClass,
                    active && "bg-accent/35 hover:bg-accent/35",
                  )}
                  onMouseEnter={() => onActiveIndexChange(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onSelect(suggestion)}
                >
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate text-sm font-normal",
                      active ? "text-highlighted" : "text-foreground",
                    )}
                  >
                    {suggestion.description}
                  </span>
                  {suggestion.projectName ? (
                    <AgencyTimeEntryProjectLabel
                      projectId={suggestion.projectId}
                      projectName={suggestion.projectName}
                      clientName={suggestion.clientName || undefined}
                      className="max-w-[55%] shrink-0"
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
