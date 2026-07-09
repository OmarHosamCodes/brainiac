import { History, MoreVertical, Trash2 } from "lucide-react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import type { AgencyTimeTrackerViewModel } from "@/lib/agency/work/hooks/use-agency-time-tracker";
import {
  agencyFocusRingClass,
  agencyInputPlaceholderClass,
  agencyLabelClass,
  agencyMetricClass,
  agencyTimeSuggestionChipClass,
  agencyTimeTrackerBarClass,
  agencyWorkTrackerCardClass,
} from "@/lib/utils/agency-ui";
import { projectHuePillStyle } from "@/lib/utils/project-palette";
import { useTheme } from "@/stores/theme";
import { cn } from "@/lib/utils";

type AgencyTimeTrackerViewProps = {
  view: AgencyTimeTrackerViewModel;
};

export function AgencyTimeTrackerView({ view }: AgencyTimeTrackerViewProps) {
  const { isDark } = useTheme();
  const elapsedLabel = view.elapsedLabel ?? "00:00:00";

  return (
    <div className={agencyWorkTrackerCardClass}>
      <div className={agencyTimeTrackerBarClass}>
        <div className="flex min-h-32 min-w-0 flex-col justify-between gap-3 border-b border-default px-4 py-4 lg:border-b-0 lg:border-r">
          <div className="min-w-0">
            <label className="text-sm font-semibold text-highlighted" htmlFor="agency-timer-note">
              Description
            </label>
            <Textarea
              id="agency-timer-note"
              value={view.timerDescription}
              onChange={(e) => view.onDescriptionChange(e.target.value)}
              onKeyDown={view.onDescriptionKeyDown}
              placeholder="Write task description, notes, links, or context..."
              rows={3}
              className={cn(
                "mt-2 min-h-20 resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0",
                agencyInputPlaceholderClass,
              )}
              disabled={view.isTimerMutationPending || !view.teamId}
            />
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
                  <span
                    className="max-w-28 truncate rounded-full px-1.5 py-0.5 text-[10px] font-semibold"
                    style={projectHuePillStyle(suggestion.projectId, isDark)}
                  >
                    {suggestion.taskTitle || suggestion.projectName}
                  </span>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="flex min-h-32 min-w-0 flex-col justify-center gap-3 px-4 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  view.activeTimer ? "bg-primary" : "bg-muted-foreground/50",
                )}
                aria-hidden
              />
              {view.activeTimer ? (
                <span className="min-w-0 truncate text-sm font-semibold text-muted">
                  {view.trackerStatusLine}
                </span>
              ) : (
                <button
                  type="button"
                  className={cn(
                    "min-w-0 truncate text-left text-sm font-semibold text-muted transition-colors hover:text-highlighted",
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

            {view.activeTimer ? (
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
            ) : null}
          </div>

          <div className="flex min-w-0 items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              {view.activeTimer ? (
                <Popover
                  open={view.startTimePopoverOpen}
                  onOpenChange={view.onStartTimePopoverOpenChange}
                >
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "inline-flex rounded-md px-1 py-0.5 font-mono text-2xl font-semibold tabular-nums text-highlighted transition-colors hover:bg-elevated sm:text-3xl",
                        agencyMetricClass,
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
                          onChange={(e) =>
                            view.onStartTimeDraftChange({ startTime: e.target.value })
                          }
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
                  className={cn(
                    "block font-mono text-2xl font-semibold tabular-nums text-muted sm:text-3xl",
                    agencyMetricClass,
                  )}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {elapsedLabel}
                </span>
              )}
            </div>

            {view.activeTimer ? (
              <Button
                variant="destructive"
                size="sm"
                className={cn(
                  "h-11 min-w-24 shrink-0 rounded-xl",
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
                className="h-11 min-w-24 shrink-0 rounded-xl"
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
