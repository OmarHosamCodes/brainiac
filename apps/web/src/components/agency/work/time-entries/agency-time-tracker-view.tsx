import { MoreVertical, Trash2 } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type {
  AgencyTimeTrackerSuggestion,
  AgencyTimeTrackerViewModel,
} from "@/lib/agency/work/hooks/use-agency-time-tracker";
import {
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
  agencyTaskRowProjectPillClass,
  agencyTimeTrackerActionsZoneClass,
  agencyTimeTrackerActiveRowClass,
  agencyTimeTrackerControlsCardClass,
  agencyTimeTrackerDescriptionCardClass,
  agencyTimeTrackerDescriptionInputClass,
  agencyTimeTrackerDescriptionLabelClass,
  agencyTimeTrackerMetricClass,
  agencyTimeTrackerSplitClass,
  agencyTimeTrackerStatusDividerClass,
  agencyTimeTrackerStatusZoneClass,
  agencyTimeTrackerSuggestionAnchorClass,
  agencyTimeTrackerSuggestionOptionClass,
  agencyTimeTrackerSuggestionPanelClass,
} from "@/lib/utils/agency-ui";
import {
  LiquidGlassBackdrop,
  LiquidGlassBody,
  liquidGlassMenuItemClass,
} from "@/lib/utils/liquid-glass-ui";
import { projectHuePillStyle } from "@/lib/utils/project-palette";
import { useTheme } from "@/stores/theme";
import { cn } from "@/lib/utils";

type AgencyTimeTrackerViewProps = {
  view: AgencyTimeTrackerViewModel;
};

type DescriptionSuggestionMenuProps = {
  listboxId: string;
  suggestions: AgencyTimeTrackerSuggestion[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  onSelect: (suggestion: AgencyTimeTrackerSuggestion) => void;
};

function DescriptionSuggestionMenu({
  listboxId,
  suggestions,
  activeIndex,
  onActiveIndexChange,
  onSelect,
}: DescriptionSuggestionMenuProps) {
  const { isDark } = useTheme();

  return (
    <div className={agencyTimeTrackerSuggestionAnchorClass}>
      <div className={agencyTimeTrackerSuggestionPanelClass} data-state="open">
        <LiquidGlassBackdrop />
        <LiquidGlassBody className="p-1">
          <ul id={listboxId} role="listbox" aria-label="Recent descriptions" className="min-w-0">
            {suggestions.map((suggestion, index) => {
              const active = index === activeIndex;

              return (
                <li key={`${suggestion.taskId}-${suggestion.description}`} role="presentation">
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
                        <span className="inline-flex max-w-[9rem] truncate rounded-full border border-default bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                          {suggestion.clientName}
                        </span>
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </LiquidGlassBody>
      </div>
    </div>
  );
}

export function AgencyTimeTrackerView({ view }: AgencyTimeTrackerViewProps) {
  const suggestionListboxId = useId();
  const [descriptionFocused, setDescriptionFocused] = useState(false);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(0);

  const elapsedLabel = view.elapsedLabel ?? "00:00:00";
  const statusSeparator = view.trackerStatusLine.indexOf(" · ");
  const statusPrefix =
    statusSeparator === -1
      ? view.trackerStatusLine
      : view.trackerStatusLine.slice(0, statusSeparator);
  const statusSuffix =
    statusSeparator === -1 ? null : view.trackerStatusLine.slice(statusSeparator + 3);

  const suggestionsReady = !suggestionsDismissed && view.descriptionSuggestions.length > 0;

  const suggestionsOpen = suggestionsReady && descriptionFocused;

  useEffect(() => {
    setActiveSuggestionIndex(0);
    setSuggestionsDismissed(false);
  }, [view.descriptionSuggestions, view.timerDescription]);

  function applySuggestion(suggestion: AgencyTimeTrackerSuggestion) {
    view.onApplySuggestion(suggestion);
    setSuggestionsDismissed(true);
  }

  function handleDescriptionKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (suggestionsOpen) {
      switch (event.key) {
        case "ArrowDown":
          event.preventDefault();
          setActiveSuggestionIndex((current) => (current + 1) % view.descriptionSuggestions.length);
          return;
        case "ArrowUp":
          event.preventDefault();
          setActiveSuggestionIndex(
            (current) =>
              (current - 1 + view.descriptionSuggestions.length) %
              view.descriptionSuggestions.length,
          );
          return;
        case "Enter": {
          const suggestion = view.descriptionSuggestions[activeSuggestionIndex];
          if (suggestion) {
            event.preventDefault();
            applySuggestion(suggestion);
          }
          return;
        }
        case "Escape":
          event.preventDefault();
          setSuggestionsDismissed(true);
          return;
        default:
          break;
      }
    }

    view.onDescriptionKeyDown(event);
  }

  return (
    <div className={agencyTimeTrackerSplitClass}>
      <div className={agencyTimeTrackerDescriptionCardClass} data-tracker-desc>
        <div className="min-w-0">
          <label className={agencyTimeTrackerDescriptionLabelClass} htmlFor="agency-timer-note">
            Description
          </label>
          <Input
            id="agency-timer-note"
            type="text"
            value={view.timerDescription}
            onChange={(e) => view.onDescriptionChange(e.target.value)}
            onKeyDown={handleDescriptionKeyDown}
            onFocus={() => {
              setDescriptionFocused(true);
              setSuggestionsDismissed(false);
            }}
            onBlur={(event) => {
              if (
                !event.currentTarget.closest("[data-tracker-desc]")?.contains(event.relatedTarget)
              ) {
                setDescriptionFocused(false);
              }
            }}
            placeholder="Write task description, notes, links, or context..."
            aria-autocomplete="list"
            aria-controls={suggestionsOpen ? suggestionListboxId : undefined}
            aria-expanded={suggestionsOpen}
            className={cn(
              agencyTimeTrackerDescriptionInputClass,
              agencyInputPlaceholderClass,
              "focus-visible:ring-0",
            )}
            disabled={view.isTimerMutationPending || !view.teamId}
          />
        </div>

        {suggestionsOpen ? (
          <DescriptionSuggestionMenu
            listboxId={suggestionListboxId}
            suggestions={view.descriptionSuggestions}
            activeIndex={activeSuggestionIndex}
            onActiveIndexChange={setActiveSuggestionIndex}
            onSelect={applySuggestion}
          />
        ) : null}
      </div>

      <div className={agencyTimeTrackerControlsCardClass}>
        <div className={agencyTimeTrackerActiveRowClass}>
          <div className={agencyTimeTrackerStatusZoneClass}>
            <span
              className={cn(
                "size-1.5 shrink-0 rounded-full",
                view.activeTimer ? "bg-primary" : "bg-muted-foreground/50",
              )}
              aria-hidden
            />
            {view.activeTimer ? (
              <span className="min-w-0 truncate text-xs">
                <span className="font-semibold text-primary">{statusPrefix}</span>
                {statusSuffix ? (
                  <>
                    <span className="text-muted"> · </span>
                    <span className="font-medium text-muted">{statusSuffix}</span>
                  </>
                ) : null}
              </span>
            ) : (
              <button
                type="button"
                className={cn(
                  "min-w-0 truncate text-left text-xs font-medium text-muted transition-colors hover:text-highlighted",
                  agencyFocusRingClass,
                )}
                onClick={() => view.onTaskChooserOpenChange(true)}
              >
                {view.trackerStatusLine}
              </button>
            )}
            <span className="sr-only">
              <AgencyTaskChooser
                value={view.selectedTaskId}
                onValueChange={view.onTaskChange}
                projects={view.projects}
                tasks={view.tasks}
                placeholder={view.taskChooserLabel}
                fallbackTaskTitle={
                  view.taskChooserLabel !== "Choose task" ? view.taskChooserLabel : undefined
                }
                fallbackProjectId={view.activeTimer?.projectId}
                className={cn(
                  view.taskChooserWarning &&
                    "text-warning hover:text-warning [&_svg]:text-warning [&_span]:text-warning",
                )}
                loading={view.projectsLoading || view.tasksLoading}
                disabled={!view.teamId || view.projectsLoading || view.tasksLoading}
                open={view.taskChooserOpen}
                contentAlign="end"
                onOpenChange={view.onTaskChooserOpenChange}
              />
            </span>
          </div>

          <div className={agencyTimeTrackerStatusDividerClass} aria-hidden />

          <div className={agencyTimeTrackerActionsZoneClass}>
            {view.activeTimer ? (
              <Popover
                open={view.startTimePopoverOpen}
                onOpenChange={view.onStartTimePopoverOpenChange}
              >
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "inline-flex rounded-md px-1 py-0.5 text-highlighted transition-colors hover:bg-elevated",
                      agencyTimeTrackerMetricClass,
                      agencyFocusRingClass,
                    )}
                    aria-live="polite"
                    aria-atomic="true"
                    aria-haspopup="dialog"
                    aria-expanded={view.startTimePopoverOpen}
                    aria-label={`Adjust timer start time, ${elapsedLabel} elapsed`}
                    disabled={view.isStartTimeSaving}
                  >
                    {elapsedLabel}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" side="bottom" className="w-auto min-w-[16rem] p-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className={cn(agencyLabelClass, "shrink-0 text-muted")}>
                        Start time
                      </span>
                      <Input
                        type="time"
                        value={view.startTimeDraft.startTime}
                        onChange={(e) => view.onStartTimeDraftChange({ startTime: e.target.value })}
                        className="h-8 w-[5.5rem] font-mono text-sm tabular-nums"
                        aria-label="Start time"
                        disabled={view.isStartTimeSaving}
                      />
                      <label className="relative flex min-w-0 shrink-0 cursor-pointer items-center rounded-md px-1 py-0.5 hover:bg-elevated">
                        <Input
                          type="date"
                          value={view.startTimeDraft.date}
                          onChange={(e) => view.onStartTimeDraftChange({ date: e.target.value })}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          aria-label="Start date"
                          disabled={view.isStartTimeSaving}
                        />
                        <span className="text-sm text-muted">{view.startTimeDayLabel}</span>
                      </label>
                    </div>
                    {view.startTimeError ? (
                      <p className="text-xs text-error" role="alert">
                        {view.startTimeError}
                      </p>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <span
                className={cn(agencyTimeTrackerMetricClass, "text-muted")}
                aria-live="polite"
                aria-atomic="true"
              >
                {elapsedLabel}
              </span>
            )}

            {view.activeTimer ? (
              <>
                <Button
                  variant="destructive"
                  size="sm"
                  className={cn(
                    "h-9 min-w-[4.5rem] shrink-0 rounded-full px-3 text-sm",
                    view.stopButtonWarningRing &&
                      "ring-2 ring-warning/30 ring-offset-1 ring-offset-background",
                  )}
                  disabled={view.isTimerMutationPending || !view.teamId || !view.canStopTimer}
                  onClick={view.onStopTimer}
                >
                  {view.stopButtonLabel}
                </Button>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn("h-9 w-9 shrink-0 p-0", agencyFocusRingClass)}
                      aria-label="Timer options"
                    >
                      <MoreVertical className="size-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-40 p-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full justify-start text-error"
                      onClick={view.onDiscardTimer}
                    >
                      <Trash2 />
                      Discard timer
                    </Button>
                  </PopoverContent>
                </Popover>
              </>
            ) : (
              <Button
                size="sm"
                className="h-9 min-w-[4.5rem] shrink-0 rounded-full px-3 text-sm"
                disabled={!view.canStartTimer || view.isTimerMutationPending}
                onClick={view.onStartTimer}
              >
                {view.isTimerMutationPending ? "…" : "Start"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
