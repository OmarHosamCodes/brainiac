import { type KeyboardEvent } from "react";

import {
  agencyTimeTrackerSuggestionOptionClass,
  agencyTimeTrackerSuggestionPanelClass,
} from "@/features/shared/agency-ui";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

export type MyTasksSuggestionItem = {
  id: string;
  title: string;
  projectId: string;
  projectName: string;
  clientName: string;
};

type AgencyMyTasksQuickAddFieldViewProps = {
  value: string;
  suggestions: MyTasksSuggestionItem[];
  disabled?: boolean;
  suggestionsOpen: boolean;
  activeIndex: number;
  onValueChange: (value: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  onActiveIndexChange: (index: number) => void;
  onPickSuggestion: (item: MyTasksSuggestionItem) => void;
  onSuppressSuggestions: () => void;
};

const MY_TASKS_TITLE_LISTBOX_ID = "my-tasks-title-suggestions";
const MY_TASKS_TITLE_OPTION_ID_PREFIX = "my-tasks-title-option";

export function AgencyMyTasksQuickAddFieldView({
  value,
  suggestions,
  disabled = false,
  suggestionsOpen,
  activeIndex,
  onValueChange,
  onFocus,
  onBlur,
  onActiveIndexChange,
  onPickSuggestion,
  onSuppressSuggestions,
}: AgencyMyTasksQuickAddFieldViewProps) {
  const showSuggestions = Boolean(
    suggestionsOpen && (suggestions.length > 0 || value.trim()),
  );
  const activeSuggestion = suggestions[activeIndex] ?? null;
  const activeOptionId =
    showSuggestions && activeSuggestion
      ? `${MY_TASKS_TITLE_OPTION_ID_PREFIX}-${activeIndex}`
      : undefined;

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && suggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        onActiveIndexChange(Math.min(activeIndex + 1, suggestions.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        onActiveIndexChange(Math.max(activeIndex - 1, 0));
        return;
      }
      if (event.key === "Enter" && activeSuggestion) {
        event.preventDefault();
        onPickSuggestion(activeSuggestion);
        return;
      }
    }

    if (event.key === "Escape" && suggestionsOpen) {
      event.preventDefault();
      onSuppressSuggestions();
    }
  }

  return (
    <div className="relative w-full min-w-0">
      <Input
        id="my-tasks-title"
        name="my-tasks-title"
        type="text"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder="Add task"
        aria-label="Add task"
        aria-autocomplete="list"
        aria-controls={showSuggestions ? MY_TASKS_TITLE_LISTBOX_ID : undefined}
        aria-expanded={showSuggestions}
        aria-activedescendant={activeOptionId}
        autoComplete="off"
        disabled={disabled}
      />

      {showSuggestions ? (
        <div
          className="pointer-events-auto absolute top-full left-0 z-50 mt-1 w-full"
          onMouseDown={(event) => event.preventDefault()}
        >
          <ul
            id={MY_TASKS_TITLE_LISTBOX_ID}
            className={cn(agencyTimeTrackerSuggestionPanelClass, "box-border w-full")}
            role="listbox"
            aria-label="Suggested tasks"
          >
            {suggestions.length === 0 ? (
              <li className="px-2.5 py-2 text-sm text-muted" role="presentation">
                No matching tasks
              </li>
            ) : (
              suggestions.map((item, index) => {
                const selected = index === activeIndex;
                const meta = [item.clientName, item.projectName].filter(Boolean).join(" · ");

                return (
                  <li key={item.id} role="presentation" className="w-full min-w-0">
                    <button
                      type="button"
                      id={`${MY_TASKS_TITLE_OPTION_ID_PREFIX}-${index}`}
                      role="option"
                      aria-selected={selected}
                      className={cn(
                        agencyTimeTrackerSuggestionOptionClass,
                        selected && "bg-accent/50",
                      )}
                      onMouseDown={(event) => event.preventDefault()}
                      onMouseEnter={() => onActiveIndexChange(index)}
                      onClick={() => onPickSuggestion(item)}
                      title={item.title}
                    >
                      <span className="min-w-0 truncate text-sm font-medium text-foreground">
                        {item.title}
                      </span>
                      {meta ? (
                        <span className="min-w-0 truncate text-xs text-muted">{meta}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
