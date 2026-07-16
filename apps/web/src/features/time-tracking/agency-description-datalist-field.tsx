import { useId, useMemo, useState, type KeyboardEvent } from "react";

import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import { filterDescriptionDatalistOptions } from "@/features/time-tracking/description-datalist";
import type { DescriptionDatalistOption } from "@/features/time-tracking/description-suggestions";
import {
  agencyInputPlaceholderClass,
  agencyTimeTrackerDescriptionInputClass,
  agencyTimeTrackerDescriptionZoneClass,
  agencyTimeTrackerSuggestionOptionClass,
  agencyTimeTrackerSuggestionPanelClass,
} from "@/features/shared/agency-ui";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

type AgencyDescriptionDatalistFieldProps = {
  value: string;
  options: DescriptionDatalistOption[];
  placeholder?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export function AgencyDescriptionDatalistField({
  value,
  options,
  placeholder = "What are you working on?",
  disabled = false,
  onValueChange,
  onFocus,
  onBlur,
  onKeyDown,
}: AgencyDescriptionDatalistFieldProps) {
  const listboxId = useId();
  const [focused, setFocused] = useState(false);

  const filteredOptions = useMemo(
    () => filterDescriptionDatalistOptions(options, value),
    [options, value],
  );

  const showSuggestions = focused && filteredOptions.length > 0;

  function handleFocus() {
    setFocused(true);
    onFocus?.();
  }

  function handleBlur() {
    setFocused(false);
    onBlur?.();
  }

  function selectOption(option: DescriptionDatalistOption) {
    onValueChange(option.description);
    setFocused(false);
  }

  return (
    <div className={agencyTimeTrackerDescriptionZoneClass}>
      <Input
        id="agency-timer-note"
        name="agency-timer-description"
        type="text"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={onKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        aria-label="Description"
        aria-autocomplete="list"
        aria-controls={showSuggestions ? listboxId : undefined}
        aria-expanded={showSuggestions}
        autoComplete="off"
        className={cn(
          agencyTimeTrackerDescriptionInputClass,
          agencyInputPlaceholderClass,
          "w-full rounded-md focus-visible:border-transparent focus-visible:ring-0",
          showSuggestions && "rounded-md ring-[3px] ring-ring/50",
        )}
        disabled={disabled}
      />

      {showSuggestions ? (
        <div
          className="absolute inset-x-0 top-full z-50 mt-1 w-full min-w-0"
          onMouseDown={(event) => event.preventDefault()}
        >
          <ul
            id={listboxId}
            className={cn(agencyTimeTrackerSuggestionPanelClass, "w-full min-w-0")}
            role="listbox"
            aria-label="Recent descriptions"
          >
            {filteredOptions.map((option) => (
              <li
                key={`${option.projectId}-${option.description}`}
                role="presentation"
                className="w-full"
              >
                <button
                  type="button"
                  role="option"
                  className={cn(agencyTimeTrackerSuggestionOptionClass, "w-full min-w-0")}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectOption(option)}
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {option.description}
                  </span>
                  <AgencyTimeEntryProjectLabel
                    format="task-client"
                    projectId={option.projectId}
                    projectName={option.projectName}
                    clientName={option.clientName || undefined}
                    taskTitle={option.taskTitle ?? undefined}
                    className="max-w-[55%] shrink-0"
                  />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
