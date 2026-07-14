import { CalendarClock, MoreVertical, Timer, Trash2 } from "lucide-react";

import { AgencyDescriptionSuggestionMenu } from "@/features/time-tracking/agency-description-suggestion-menu";
import { AgencyTagChooser } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import type { AgencyTimeTrackerViewModel } from "@/features/time-tracking/hooks/use-agency-time-tracker";
import {
  agencyInputPlaceholderClass,
  agencyTimeEntryTimeInputClass,
  agencyTimeTrackerCardClass,
  agencyTimeTrackerDescriptionInputClass,
  agencyTimeTrackerDescriptionZoneClass,
  agencyTimeTrackerElapsedInputClass,
  agencyTimeTrackerIconActionClass,
  agencyTimeTrackerInnerDividerClass,
  agencyTimeTrackerMetricClass,
  agencyTimeTrackerPrimaryActionClass,
  agencyTimeTrackerRailCellClass,
  agencyTimeTrackerRailClass,
  agencyTimeTrackerTaskChooserTriggerClass,
} from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeTrackerViewProps = {
  view: AgencyTimeTrackerViewModel;
};

export function AgencyTimeTrackerView({ view }: AgencyTimeTrackerViewProps) {
  const elapsedLabel = view.elapsedLabel ?? "00:00:00";
  const taskChooserTriggerClass = cn(
    agencyTimeTrackerTaskChooserTriggerClass,
    "max-w-[9rem]",
    view.taskChooserWarning &&
      "text-warning hover:text-warning [&_svg]:text-warning [&_span]:text-warning",
  );
  const idleManual = !view.activeTimer && view.mode === "manual";
  const controlsDisabled =
    !view.teamId ||
    view.isTimerMutationPending ||
    view.isManualCreatePending ||
    view.projectsLoading ||
    view.tasksLoading;

  return (
    <div className={agencyTimeTrackerCardClass}>
      <div className={agencyTimeTrackerDescriptionZoneClass} data-tracker-desc>
        <Input
          id="agency-timer-note"
          type="text"
          value={view.timerDescription}
          onChange={(e) => view.onDescriptionChange(e.target.value)}
          onKeyDown={view.onDescriptionKeyDown}
          onFocus={view.onDescriptionFocus}
          onBlur={view.onDescriptionBlur}
          placeholder="What are you working on?"
          aria-label="Description"
          aria-autocomplete="list"
          aria-controls={view.suggestionsOpen ? view.suggestionListboxId : undefined}
          aria-expanded={view.suggestionsOpen}
          className={cn(
            agencyTimeTrackerDescriptionInputClass,
            agencyInputPlaceholderClass,
            "focus-visible:ring-0",
            view.suggestionsOpen && "rounded-[2px] ring-1 ring-primary",
          )}
          disabled={view.isTimerMutationPending || view.isManualCreatePending || !view.teamId}
        />

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

      <div className={agencyTimeTrackerRailClass}>
        <div className={agencyTimeTrackerRailCellClass}>
          <AgencyTaskChooser
            value={view.selectedTaskId}
            onValueChange={view.onTaskChange}
            projects={view.projects}
            tasks={view.tasks}
            placeholder="Task"
            triggerFormat="task-client"
            highlightSearch
            fallbackTaskTitle={
              view.taskChooserLabel !== "Choose task" ? view.taskChooserLabel : undefined
            }
            fallbackProjectId={view.activeTimer?.projectId}
            fallbackProjectName={view.activeTimer?.projectName}
            className={taskChooserTriggerClass}
            loading={view.projectsLoading || view.tasksLoading}
            disabled={controlsDisabled}
            open={view.taskChooserOpen}
            contentAlign="end"
            onOpenChange={view.onTaskChooserOpenChange}
          />
        </div>

        <div className={cn(agencyTimeTrackerRailCellClass, "gap-1.5")}>
          <AgencyTagChooser
            value={view.selectedTagIds}
            tags={view.tags}
            onValueChange={view.onTagIdsChange}
            onCreateTag={view.onCreateTag}
            creating={view.tagCreatePending}
            disabled={controlsDisabled}
            compact
          />
          <span className={agencyTimeTrackerInnerDividerClass} aria-hidden />
          <button
            type="button"
            className={cn(
              agencyTimeTrackerIconActionClass,
              view.isBillable ? "text-info" : "text-muted",
            )}
            aria-pressed={view.isBillable}
            aria-label={view.isBillable ? "Billable" : "Non-billable"}
            disabled={controlsDisabled}
            onClick={() => view.onIsBillableChange(!view.isBillable)}
          >
            $
          </button>
        </div>

        <div className={agencyTimeTrackerRailCellClass}>
          {view.activeTimer ? (
            <div className="relative">
              <Input
                value={view.elapsedEditing ? view.elapsedDraft : elapsedLabel}
                onFocus={view.onElapsedFocus}
                onChange={(e) => view.onElapsedChange(e.target.value)}
                onBlur={view.onElapsedBlur}
                onKeyDown={view.onElapsedKeyDown}
                className={agencyTimeTrackerElapsedInputClass}
                aria-label="Elapsed time"
                aria-invalid={Boolean(view.elapsedError)}
                disabled={view.isStartTimeSaving}
              />
              {view.elapsedError ? (
                <p className="absolute top-full left-0 z-10 whitespace-nowrap text-xs text-error" role="alert">
                  {view.elapsedError}
                </p>
              ) : null}
            </div>
          ) : idleManual ? (
            <div className="relative flex min-w-0 shrink-0 items-center gap-1">
              <Input
                type="time"
                value={view.manualDraft.startTime}
                onChange={(e) => view.onManualStartTimeChange(e.target.value)}
                className={cn(agencyTimeEntryTimeInputClass, "h-8 w-[5.5rem]")}
                aria-label="Start time"
                disabled={view.isManualCreatePending}
              />
              <span className="text-xs text-muted" aria-hidden>
                –
              </span>
              <Input
                type="time"
                value={view.manualDraft.endTime}
                onChange={(e) => view.onManualEndTimeChange(e.target.value)}
                className={cn(agencyTimeEntryTimeInputClass, "h-8 w-[5.5rem]")}
                aria-label="End time"
                disabled={view.isManualCreatePending}
              />
              <label className="relative flex min-w-0 shrink-0 cursor-pointer items-center rounded-md px-1 py-0.5 hover:bg-elevated">
                <Input
                  type="date"
                  value={view.manualDraft.date}
                  onChange={(e) => view.onManualDateChange(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Entry date"
                  disabled={view.isManualCreatePending}
                />
                <span className="text-xs text-muted">
                  {view.manualDraft.date ? formatAgencyDayLabel(view.manualDraft.date) : "Date"}
                </span>
              </label>
              {view.manualError ? (
                <p className="absolute top-full left-0 z-10 whitespace-nowrap text-xs text-error">
                  {view.manualError}
                </p>
              ) : null}
            </div>
          ) : (
            <span
              className={cn(agencyTimeTrackerMetricClass, "text-muted")}
              aria-live="polite"
              aria-atomic="true"
            >
              {elapsedLabel}
            </span>
          )}
        </div>

        <div className={cn(agencyTimeTrackerRailCellClass, "gap-1")}>
          {view.activeTimer ? (
            <>
              <Button
                variant={view.canStopTimer ? "destructive" : "outline"}
                size="sm"
                className={cn(
                  agencyTimeTrackerPrimaryActionClass,
                  view.canStopTimer
                    ? "bg-destructive text-white hover:bg-destructive/90"
                    : "bg-transparent text-muted",
                  view.stopButtonWarningRing &&
                    "ring-2 ring-warning/30 ring-offset-1 ring-offset-background",
                )}
                disabled={view.stopButtonDisabled}
                title={view.stopButtonHint ?? undefined}
                aria-label={
                  view.stopButtonHint
                    ? `${view.stopButtonLabel}. ${view.stopButtonHint}`
                    : view.stopButtonLabel
                }
                onClick={view.onStopTimer}
              >
                {view.stopButtonLabel}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={agencyTimeTrackerIconActionClass}
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
          ) : idleManual ? (
            <Button
              size="sm"
              className={agencyTimeTrackerPrimaryActionClass}
              disabled={!view.canAddManual}
              onClick={view.onAddManual}
            >
              {view.isManualCreatePending ? "…" : "Add"}
            </Button>
          ) : (
            <Button
              size="sm"
              className={agencyTimeTrackerPrimaryActionClass}
              disabled={view.startButtonDisabled}
              onClick={view.onStartTimer}
            >
              {view.isTimerMutationPending ? "…" : "Start"}
            </Button>
          )}
        </div>

        {view.showModeToggle ? (
          <div className={agencyTimeTrackerRailCellClass}>
            <Button
              variant="ghost"
              size="sm"
              className={agencyTimeTrackerIconActionClass}
              aria-label={idleManual ? "Switch to timer" : "Switch to manual entry"}
              aria-pressed={idleManual}
              onClick={() => view.onModeChange(idleManual ? "timer" : "manual")}
            >
              {idleManual ? <Timer className="size-4" /> : <CalendarClock className="size-4" />}
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
