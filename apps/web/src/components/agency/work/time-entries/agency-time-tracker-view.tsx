import { History, MoreVertical, Trash2 } from "lucide-react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AgencyTimeTrackerViewModel } from "@/lib/agency/work/hooks/use-agency-time-tracker";
import {
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyTimeSuggestionChipClass,
  agencyTimeTrackerBarClass,
} from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyTimeTrackerViewProps = {
  view: AgencyTimeTrackerViewModel;
};

export function AgencyTimeTrackerView({ view }: AgencyTimeTrackerViewProps) {
  return (
    <div className={agencyTimeTrackerBarClass}>
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="min-w-0 flex-1">
            <Input
              value={view.timerDescription}
              onChange={(e) => view.onDescriptionChange(e.target.value)}
              onKeyDown={view.onDescriptionKeyDown}
              placeholder="What are you working on?"
              className={cn(
                "h-9 min-w-0 border-0 bg-transparent px-0 text-sm shadow-none focus-visible:ring-0",
                agencyInputPlaceholderClass,
              )}
              disabled={view.isTimerMutationPending || !view.teamId}
            />
          </div>

          <span
            className="hidden h-6 w-px shrink-0 border-l border-dashed border-default lg:block"
            aria-hidden
          />

          <div className="shrink-0">
            <AgencyTaskChooser
              value={view.selectedTaskId}
              onValueChange={view.onTaskChange}
              projects={view.projects}
              tasks={view.tasksForChooser}
              placeholder={view.taskChooserLabel}
              className={cn(
                "h-9 w-auto max-w-44 shrink-0 border-0 bg-transparent px-2 font-normal shadow-none hover:bg-transparent",
                view.taskChooserWarning &&
                  "text-warning hover:text-warning [&_svg]:text-warning [&_span]:text-warning",
              )}
              loading={view.projectsLoading || view.tasksLoading}
              disabled={!view.teamId || view.projectsLoading || view.tasksLoading}
              open={view.taskChooserOpen}
              contentAlign="end"
              onOpenChange={view.onTaskChooserOpenChange}
            />
          </div>

          <span
            className="hidden h-6 w-px shrink-0 border-l border-dashed border-default md:block"
            aria-hidden
          />

          {view.activeTimer && view.elapsedLabel ? (
            <Popover
              open={view.startTimePopoverOpen}
              onOpenChange={view.onStartTimePopoverOpenChange}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "shrink-0 rounded-md px-1.5 py-0.5 font-mono text-sm font-semibold tabular-nums text-highlighted transition-colors",
                    "cursor-pointer hover:bg-elevated",
                    agencyMetricClass,
                    agencyFocusRingClass,
                  )}
                  aria-live="polite"
                  aria-atomic="true"
                  aria-haspopup="dialog"
                  aria-expanded={view.startTimePopoverOpen}
                  aria-label={`Adjust timer start time, ${view.elapsedLabel} elapsed`}
                  disabled={view.isStartTimeSaving}
                >
                  {view.elapsedLabel}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" className="w-auto min-w-[16rem] p-2">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className={cn(agencyLabelClass, "shrink-0 text-muted")}>Start time</span>
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
          ) : null}

          {view.activeTimer ? (
            <Button
              variant="destructive"
              size="sm"
              className={cn(
                "h-9 min-w-24 shrink-0",
                view.stopButtonWarningRing &&
                  "ring-2 ring-warning/30 ring-offset-1 ring-offset-background",
              )}
              disabled={view.isTimerMutationPending || !view.teamId || !view.canStopTimer}
              onClick={view.onStopTimer}
            >
              {view.stopButtonLabel}
            </Button>
          ) : (
            <Button
              size="sm"
              className="h-9 min-w-24 shrink-0"
              disabled={!view.canStartTimer || view.isTimerMutationPending}
              onClick={view.onStartTimer}
            >
              {view.isTimerMutationPending ? "…" : "Start"}
            </Button>
          )}

          {view.activeTimer ? (
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("shrink-0", agencyFocusRingClass)}
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
          ) : null}
        </div>

        {view.descriptionSuggestions.length > 0 ? (
          <div className="flex max-w-full flex-wrap gap-1.5" aria-label="Recent descriptions">
            {view.descriptionSuggestions.map((suggestion) => (
              <button
                key={`${suggestion.taskId}-${suggestion.description}`}
                type="button"
                className={cn(agencyTimeSuggestionChipClass, agencyFocusRingClass)}
                onClick={() => view.onApplySuggestion(suggestion)}
              >
                <History className="size-3 shrink-0 text-muted" aria-hidden />
                <span className="max-w-40 truncate font-medium text-highlighted">
                  {suggestion.description}
                </span>
                <span className="max-w-28 truncate rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted">
                  {suggestion.taskTitle || suggestion.projectName}
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
