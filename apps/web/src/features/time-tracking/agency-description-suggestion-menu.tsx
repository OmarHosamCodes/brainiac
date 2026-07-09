import type { AgencyDescriptionSuggestion } from "@/features/time-tracking/description-suggestions";
import {
  agencyTaskRowProjectPillClass,
  agencyTimeTrackerSuggestionAnchorClass,
  agencyTimeTrackerSuggestionOptionClass,
  agencyTimeTrackerSuggestionPanelClass,
} from "@/features/shared/agency-ui";
import { liquidGlassMenuItemClass } from "@/lib/utils/liquid-glass-ui";
import { projectHuePillStyle } from "@/lib/utils/project-palette";
import { useTheme } from "@/stores/theme";
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
  const { isDark } = useTheme();

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
                      "block max-w-full truncate text-sm font-semibold",
                      active ? "text-primary" : "text-highlighted",
                    )}
                  >
                    {suggestion.description}
                  </span>
                  <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                    {suggestion.projectName ? (
                      <span
                        className={cn(agencyTaskRowProjectPillClass, "max-w-[9rem] truncate")}
                        style={projectHuePillStyle(suggestion.projectId, isDark)}
                      >
                        {suggestion.projectName}
                      </span>
                    ) : null}
                    {suggestion.clientName ? (
                      <span className="inline-flex max-w-[9rem] truncate rounded-full border border-default bg-default px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                        {suggestion.clientName}
                      </span>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
