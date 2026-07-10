import { MoreVertical, Trash2 } from "lucide-react";

import { AgencyDescriptionSuggestionMenu } from "@/features/time-tracking/agency-description-suggestion-menu";
import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import type { AgencyTimeTrackerViewModel } from "@/features/time-tracking/hooks/use-agency-time-tracker";
import {
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
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
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeTrackerViewProps = {
  view: AgencyTimeTrackerViewModel;
};

export function AgencyTimeTrackerView({ view }: AgencyTimeTrackerViewProps) {
  const elapsedLabel = view.elapsedLabel ?? "00:00:00";
  const statusSeparator = view.trackerStatusLine.indexOf(" · ");
  const statusPrefix =
    statusSeparator === -1
      ? view.trackerStatusLine
      : view.trackerStatusLine.slice(0, statusSeparator);
  const statusSuffix =
    statusSeparator === -1 ? null : view.trackerStatusLine.slice(statusSeparator + 3);

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
            onKeyDown={view.onDescriptionKeyDown}
            onFocus={view.onDescriptionFocus}
            onBlur={view.onDescriptionBlur}
            placeholder="Write task description, notes, links, or context..."
            aria-autocomplete="list"
            aria-controls={view.suggestionsOpen ? view.suggestionListboxId : undefined}
            aria-expanded={view.suggestionsOpen}
            className={cn(
              agencyTimeTrackerDescriptionInputClass,
              agencyInputPlaceholderClass,
              "focus-visible:ring-0",
            )}
            disabled={view.isTimerMutationPending || !view.teamId}
          />
        </div>

        {view.suggestionsOpen ? (
          <AgencyDescriptionSuggestionMenu
            listboxId={view.suggestionListboxId}
            suggestions={view.descriptionSuggestions}
            activeIndex={view.activeSuggestionIndex}
            onActiveIndexChange={view.onSuggestionActiveIndexChange}
            onSelect={view.onApplySuggestion}
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
            <button
              type="button"
              className={cn(
                "min-w-0 truncate text-left text-xs transition-colors hover:text-highlighted",
                agencyFocusRingClass,
                view.activeTimer ? "font-semibold" : "font-medium text-muted",
              )}
              onClick={() => view.onTaskChooserOpenChange(true)}
              aria-haspopup="dialog"
              aria-expanded={view.taskChooserOpen}
              aria-label={
                view.activeTimer
                  ? `Change task, currently ${view.trackerStatusLine}`
                  : "Choose task"
              }
            >
              {view.activeTimer ? (
                <span className="min-w-0 truncate">
                  <span className="text-primary">{statusPrefix}</span>
                  {statusSuffix ? (
                    <>
                      <span className="font-medium text-muted"> · </span>
                      <span className="font-medium text-muted">{statusSuffix}</span>
                    </>
                  ) : null}
                </span>
              ) : (
                view.trackerStatusLine
              )}
            </button>
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
                  disabled={view.stopButtonDisabled}
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
