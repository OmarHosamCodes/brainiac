import { CalendarClock, MoreVertical, Timer, Trash2 } from "lucide-react";

import { AgencyDescriptionDatalistField } from "@/features/time-tracking/agency-description-datalist-field";
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
  agencyTimeTrackerCardRunningClass,
  agencyTimeTrackerElapsedInputClass,
  agencyTimeTrackerIconActionClass,
  agencyTimeTrackerMetricClass,
  agencyTimeTrackerPrimaryActionClass,
  agencyTimeTrackerRailCellClass,
  agencyTimeTrackerRailClass,
  agencyTimeTrackerRailDividerClass,
  agencyTimeTrackerStopActionClass,
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
    "max-w-[12rem]",
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
    <div
      className={cn(agencyTimeTrackerCardClass, view.activeTimer && agencyTimeTrackerCardRunningClass)}
      data-timer-state={view.activeTimer ? "running" : idleManual ? "manual" : "idle"}
    >
      <AgencyDescriptionDatalistField
        value={view.timerDescription}
        options={view.descriptionDatalistOptions}
        onValueChange={view.onDescriptionChange}
        onFocus={view.onDescriptionFocus}
        onBlur={view.onDescriptionBlur}
        onKeyDown={view.onDescriptionKeyDown}
        disabled={view.isTimerMutationPending || view.isManualCreatePending || !view.teamId}
      />

      <div className={agencyTimeTrackerRailClass}>
        <span className={agencyTimeTrackerRailDividerClass} aria-hidden />

        <div className={agencyTimeTrackerRailCellClass}>
          <AgencyTaskChooser
            value={view.selectedTaskId}
            onValueChange={view.onTaskChange}
            projects={view.projects}
            tasks={view.tasks}
            placeholder="Choose task"
            required={!view.activeTimer}
            triggerFormat="task-client"
            highlightSearch
            fallbackTaskTitle={view.activeTimer?.taskTitle}
            fallbackProjectId={view.activeTimer?.projectId}
            fallbackProjectName={view.activeTimer?.projectName}
            fallbackClientName={
              view.activeTimer
                ? view.projects.find((project) => project.id === view.activeTimer?.projectId)
                    ?.clientName
                : undefined
            }
            className={taskChooserTriggerClass}
            loading={view.projectsLoading || view.tasksLoading}
            disabled={controlsDisabled}
            open={view.taskChooserOpen}
            contentAlign="end"
            onOpenChange={view.onTaskChooserOpenChange}
          />
        </div>

        <span className={agencyTimeTrackerRailDividerClass} aria-hidden />

        <div className={agencyTimeTrackerRailCellClass}>
          <button
            type="button"
            className={cn(
              agencyTimeTrackerIconActionClass,
              view.isBillable ? "text-info hover:text-info" : undefined,
            )}
            aria-pressed={view.isBillable}
            aria-label={view.isBillable ? "Billable" : "Non-billable"}
            disabled={controlsDisabled}
            onClick={() => view.onIsBillableChange(!view.isBillable)}
          >
            $
          </button>
        </div>

        <span className={agencyTimeTrackerRailDividerClass} aria-hidden />

        <div className={agencyTimeTrackerRailCellClass}>
          {view.activeTimer ? (
            <div className="relative">
              <Input
                value={view.elapsedEditing ? view.elapsedDraft : elapsedLabel}
                onFocus={view.onElapsedFocus}
                onChange={(e) => view.onElapsedChange(e.target.value)}
                onBlur={view.onElapsedBlur}
                onKeyDown={view.onElapsedKeyDown}
                className={cn(agencyTimeTrackerElapsedInputClass, "font-semibold")}
                aria-label="Elapsed time"
                aria-invalid={Boolean(view.elapsedError)}
                disabled={view.isStartTimeSaving}
              />
              {view.elapsedError ? (
                <p
                  className="absolute top-full left-0 z-10 whitespace-nowrap text-xs text-error"
                  role="alert"
                >
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
              <label className="relative flex min-w-0 shrink-0 cursor-pointer items-center rounded-md px-1 py-0.5 hover:bg-muted">
                <Input
                  type="date"
                  value={view.manualDraft.date}
                  onChange={(e) => view.onManualDateChange(e.target.value)}
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  aria-label="Entry date"
                  disabled={view.isManualCreatePending}
                />
                <span className="text-xs text-muted-foreground">
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

        <span className={agencyTimeTrackerRailDividerClass} aria-hidden />

        <div className={cn(agencyTimeTrackerRailCellClass, "gap-0.5")}>
          {view.activeTimer ? (
            <>
              <Button
                className={cn(agencyTimeTrackerStopActionClass, "rounded-md")}
                disabled={view.stopButtonDisabled}
                aria-label={view.stopButtonLabel}
                onClick={view.onStopTimer}
              >
                {view.stopButtonLabel}
              </Button>

              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
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
              className={cn(agencyTimeTrackerPrimaryActionClass, "rounded-md")}
              disabled={!view.canAddManual}
              onClick={view.onAddManual}
            >
              {view.isManualCreatePending ? "…" : "Add"}
            </Button>
          ) : (
            <Button
              className={cn(agencyTimeTrackerPrimaryActionClass, "rounded-md")}
              disabled={view.startButtonDisabled}
              onClick={view.onStartTimer}
            >
              {view.isTimerMutationPending ? "…" : "Start"}
            </Button>
          )}
        </div>

        {view.showModeToggle ? (
          <>
            <span className={agencyTimeTrackerRailDividerClass} aria-hidden />
            <div className={agencyTimeTrackerRailCellClass}>
              <Button
                variant="ghost"
                size="icon-sm"
                className={agencyTimeTrackerIconActionClass}
              aria-label={idleManual ? "Switch to timer" : "Switch to manual entry"}
              aria-pressed={idleManual}
              onClick={() => view.onModeChange(idleManual ? "timer" : "manual")}
            >
              {idleManual ? <Timer className="size-4" /> : <CalendarClock className="size-4" />}
            </Button>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
