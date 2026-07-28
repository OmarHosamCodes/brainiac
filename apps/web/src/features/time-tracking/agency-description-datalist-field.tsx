import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";

import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import {
  normalizeSuggestionText,
  rankDescriptionDatalistOptions,
  type DescriptionDatalistOption,
} from "@/features/time-tracking/description-suggestions";
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
  affinityProjectId?: string;
  placeholder?: string;
  disabled?: boolean;
  onValueChange: (value: string) => void;
  /** Explicit suggestion pick — applies description + task/project. Typing never calls this. */
  onSelectOption?: (option: DescriptionDatalistOption) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  onKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
};

export function AgencyDescriptionDatalistField({
  value,
  options,
  affinityProjectId,
  placeholder = "What are you working on?",
  disabled = false,
  onValueChange,
  onSelectOption,
  onFocus,
  onBlur,
  onKeyDown,
}: AgencyDescriptionDatalistFieldProps) {
  const listboxId = useId();
  const optionIdPrefix = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [focused, setFocused] = useState(false);
  const [suppressed, setSuppressed] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [panelStyle, setPanelStyle] = useState<CSSProperties | undefined>();

  const rankedOptions = useMemo(
    () =>
      rankDescriptionDatalistOptions(options, {
        query: value,
        affinityProjectId,
      }),
    [affinityProjectId, options, value],
  );

  const hasQuery = Boolean(normalizeSuggestionText(value));
  const showSuggestions = focused && !suppressed && (rankedOptions.length > 0 || hasQuery);
  const activeOption = rankedOptions[activeIndex] ?? null;
  const activeOptionId =
    showSuggestions && activeOption ? `${optionIdPrefix}-${activeIndex}` : undefined;

  useEffect(() => {
    setActiveIndex(0);
  }, [value, rankedOptions.length]);

  useEffect(() => {
    setSuppressed(false);
  }, [value]);

  useLayoutEffect(() => {
    if (!showSuggestions) {
      setPanelStyle(undefined);
      return;
    }

    function syncPanelBox() {
      const wrap = wrapRef.current;
      if (!wrap) return;
      const card = wrap.closest("[data-agency-time-tracker]");
      const wrapRect = wrap.getBoundingClientRect();
      if (!(card instanceof HTMLElement)) {
        setPanelStyle({ left: 0, width: wrapRect.width });
        return;
      }
      const cardRect = card.getBoundingClientRect();
      // Flush with the tracker card's outer left edge; keep the input's right edge.
      const left = cardRect.left - wrapRect.left;
      const width = wrapRect.right - cardRect.left;
      setPanelStyle({ left, width });
    }

    syncPanelBox();
    window.addEventListener("resize", syncPanelBox);
    return () => window.removeEventListener("resize", syncPanelBox);
  }, [showSuggestions, rankedOptions.length]);

  function handleFocus() {
    setFocused(true);
    setSuppressed(false);
    onFocus?.();
  }

  function handleBlur() {
    setFocused(false);
    onBlur?.();
  }

  function selectOption(option: DescriptionDatalistOption) {
    if (onSelectOption) {
      onSelectOption(option);
    } else {
      onValueChange(option.description);
    }
    setFocused(false);
    setSuppressed(true);
    // mousedown preventDefault skips input blur; still flush parent focus/dirty.
    onBlur?.();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (showSuggestions && rankedOptions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((index) => Math.min(index + 1, rankedOptions.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((index) => Math.max(index - 1, 0));
        return;
      }
      if (event.key === "Enter" && activeOption) {
        event.preventDefault();
        selectOption(activeOption);
        return;
      }
    }

    if (event.key === "Escape" && focused) {
      event.preventDefault();
      setSuppressed(true);
      return;
    }

    onKeyDown?.(event);
  }

  return (
    <div className={agencyTimeTrackerDescriptionZoneClass}>
      <div ref={wrapRef} className="relative w-full min-w-0">
        <Input
          id="agency-timer-note"
          name="agency-timer-description"
          type="text"
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          aria-label="Description"
          aria-autocomplete="list"
          aria-controls={showSuggestions ? listboxId : undefined}
          aria-expanded={showSuggestions}
          aria-activedescendant={activeOptionId}
          autoComplete="off"
          className={cn(
            agencyTimeTrackerDescriptionInputClass,
            agencyInputPlaceholderClass,
            "box-border w-full rounded-md focus-visible:border-transparent focus-visible:ring-0",
          )}
          disabled={disabled}
        />

        {showSuggestions ? (
          <div
            className="pointer-events-auto absolute top-full z-50 mt-1"
            style={panelStyle}
            onMouseDown={(event) => event.preventDefault()}
          >
            <ul
              id={listboxId}
              className={cn(agencyTimeTrackerSuggestionPanelClass, "box-border w-full")}
              role="listbox"
              aria-label="Suggested work"
            >
              {rankedOptions.length === 0 ? (
                <li className="px-2.5 py-2 text-sm text-muted" role="presentation">
                  No matches
                </li>
              ) : (
                rankedOptions.map((option, index) => {
                  const selected = index === activeIndex;
                  return (
                    <li
                      key={`${option.projectId}-${option.description}-${option.taskId ?? "none"}`}
                      role="presentation"
                      className="w-full min-w-0"
                    >
                      <button
                        type="button"
                        id={`${optionIdPrefix}-${index}`}
                        role="option"
                        aria-selected={selected}
                        className={cn(
                          agencyTimeTrackerSuggestionOptionClass,
                          selected && "bg-accent/50",
                        )}
                        onMouseDown={(event) => event.preventDefault()}
                        onMouseEnter={() => setActiveIndex(index)}
                        onClick={() => selectOption(option)}
                        title={option.description}
                      >
                        <span className="min-w-0 truncate text-sm font-medium text-foreground">
                          {option.description}
                        </span>
                        <AgencyTimeEntryProjectLabel
                          format="task-client"
                          projectId={option.projectId}
                          projectName={option.projectName}
                          clientName={option.clientName || undefined}
                          taskTitle={option.taskTitle ?? undefined}
                          className="min-w-0 max-w-full"
                        />
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
