import { MoreVertical, Play, Trash2 } from "lucide-react";

import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import {
  AgencyTimeEntryMoreAction,
  AgencyTimeEntryPlayAction,
} from "@/features/time-tracking/entries/agency-time-entry-actions";
import { AgencyTimeEntryDatePicker } from "@/features/time-tracking/entries/agency-time-entry-date-picker";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import type { AgencyTimeEntryRowViewModel } from "@/features/time-tracking/hooks/use-agency-time-entry-row";
import {
  agencyFocusRingClass,
  agencyTaskChooserTriggerClass,
  agencyTimeEntryIconButtonClass,
  agencyTimeEntryMainClass,
  agencyTimeEntryRailMoreClass,
  agencyTimeEntryRailPlayClass,
  agencyTimeEntryRailBillableClass,
  agencyTimeEntryRailCalendarClass,
  agencyTimeEntryRailClass,
  agencyTimeEntryRailDurationClass,
  agencyTimeEntryRailTimeClass,
  agencyTimeEntryRowClass,
  agencyTimeEntryRowEditingClass,
  agencyTimeEntryRowHighlightClass,
  agencyTimeEntryClockTimeInputClass,
  agencyTimeTrackerIconActionClass,
  agencyWorkCountBadgeClass,
  agencyWorkMetricClass,
  agencyWorkTimeRangeClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
import { reportEntryWasteTextClass } from "@/features/reports/agency-report-grouping";
import { AgencyWasteTag } from "@/features/shared/agency-waste-badge";
import { agentScopeableProps } from "@/features/shared/agent-scopeable";
import { cn } from "@/lib/utils";

const descriptionLeadingSlotClass = "flex w-8 shrink-0 items-center justify-start";

type AgencyTimeEntryRowViewProps = {
  view: AgencyTimeEntryRowViewModel;
  className?: string;
};

export function AgencyTimeEntryRowView({ view, className }: AgencyTimeEntryRowViewProps) {
  const {
    group,
    projects,
    tasks,
    expanded,
    highlighted,
    isMulti,
    canRestart,
    primaryEntryId,
    descriptionDraft,
    editDraft,
    startTimeInput,
    endTimeInput,
    spansNextDay,
    clockInvalid,
    editError,
    editSaving,
    rowDeleting,
    rowUpdating,
    rowDuplicating,
    rowWastePending,
    isWaste,
    timeRange,
    durationLabel,
    editingDescription,
    editingDuration,
    timeEditorOpen,
    onToggleExpand,
    onRestart,
    onDeleteGroup,
    onDuplicate,
    onToggleWaste,
    onDescriptionChange,
    onDescriptionBlur,
    onDescriptionKeyDown,
    onTaskChange,
    onProjectChange: _onProjectChange,
    onIsBillableChange,
    onStartTimeChange,
    onEndTimeChange,
    onStartTimeBlur,
    onEndTimeBlur,
    onStartDateChange,
    onDurationChange,
    onDurationBlur,
    onInlineKeyDown,
    onEditingDescriptionChange,
    onTimeEditorOpenChange,
    onEditingDurationChange,
  } = view;

  const taskChooserTriggerClass = cn(
    agencyTaskChooserTriggerClass,
    "h-auto min-h-0 w-auto max-w-full gap-1 px-2 py-0 text-xs shadow-none",
  );

  return (
    <div
      data-entry-id={primaryEntryId}
      tabIndex={0}
      className={cn(
        agencyTimeEntryRowClass,
        highlighted && agencyTimeEntryRowHighlightClass,
        (editingDescription || editingDuration || timeEditorOpen) && agencyTimeEntryRowEditingClass,
        className,
      )}
      {...agentScopeableProps({
        kind: "timeEntry",
        id: primaryEntryId,
        label: descriptionDraft.trim() || durationLabel || "Time entry",
      })}
    >
      <div className={cn(agencyTimeEntryMainClass, "gap-3 pr-2")}>
        {isMulti ? (
          <div className={descriptionLeadingSlotClass}>
            <button
              type="button"
              className={cn(agencyWorkCountBadgeClass, agencyFocusRingClass)}
              aria-label={expanded ? "Collapse entries" : "Expand entries"}
              aria-expanded={expanded}
              onClick={onToggleExpand}
            >
              {group.entries.length}
            </button>
          </div>
        ) : null}
        <Input
          value={descriptionDraft}
          onChange={(e) => onDescriptionChange(e.target.value)}
          onFocus={() => onEditingDescriptionChange(true)}
          onBlur={() => {
            onDescriptionBlur();
          }}
          onKeyDown={onDescriptionKeyDown}
          disabled={editSaving || rowUpdating}
          placeholder="Add description"
          className={cn(
            agencyWorkTitleClass,
            "field-sizing-content h-8 w-auto min-w-0 max-w-[14rem] shrink border-0 bg-transparent px-0 py-0 font-normal leading-8 shadow-none focus-visible:ring-0",
            isWaste && reportEntryWasteTextClass,
          )}
          aria-label={isMulti ? "Edit description for all entries in group" : "Add description"}
        />
        <div
          className={cn(
            "flex h-8 min-w-0 max-w-[min(100%,18rem)] shrink items-center truncate",
            isWaste && reportEntryWasteTextClass,
          )}
        >
          <AgencyTaskChooser
            teamId={view.teamId}
            value={editDraft.taskId}
            onValueChange={onTaskChange}
            projects={projects}
            tasks={tasks}
            fallbackTaskTitle={group.taskId ? group.taskTitle : undefined}
            fallbackProjectId={group.projectId}
            fallbackProjectName={group.projectName}
            fallbackClientName={group.clientName || "General"}
            placeholder="Task"
            triggerFormat="task-client"
            highlightSearch
            contentAlign="start"
            disabled={editSaving || rowUpdating}
            className={cn(taskChooserTriggerClass, "h-8 max-w-full")}
          />
        </div>
        {isWaste ? (
          <AgencyWasteTag
            onDismiss={onToggleWaste}
            dismissLabel={isMulti ? `Unmark ${group.entries.length} entries as waste` : undefined}
            disabled={rowWastePending || rowUpdating || editSaving}
          />
        ) : null}
        {/* Absorbs leftover width so the right action rail stays fixed. */}
        <div className="min-w-0 flex-1" aria-hidden />
      </div>

      <div className={agencyTimeEntryRailClass}>
        <div className={agencyTimeEntryRailBillableClass}>
          <button
            type="button"
            className={cn(
              agencyTimeTrackerIconActionClass,
              "inline-flex size-8 items-center justify-center",
              editDraft.isBillable ? "text-info" : "text-muted",
            )}
            aria-pressed={editDraft.isBillable}
            aria-label={editDraft.isBillable ? "Billable" : "Non-billable"}
            disabled={editSaving || rowUpdating}
            onClick={() => onIsBillableChange(!editDraft.isBillable)}
          >
            $
          </button>
        </div>

        <div className={agencyTimeEntryRailTimeClass}>
          {!isMulti ? (
            <div className="flex w-full min-w-0 items-center justify-center gap-0.5 overflow-hidden">
              <Input
                type="text"
                inputMode="decimal"
                data-time-field="start"
                value={startTimeInput}
                onChange={(e) => onStartTimeChange(e.target.value)}
                onFocus={(e) => {
                  onTimeEditorOpenChange(true);
                  e.currentTarget.select();
                }}
                onBlur={onStartTimeBlur}
                onKeyDown={onInlineKeyDown}
                disabled={editSaving || rowUpdating}
                className={agencyTimeEntryClockTimeInputClass}
                aria-label="Start time"
                aria-invalid={clockInvalid.start}
              />
              <span className={cn("shrink-0", agencyWorkTimeRangeClass)} aria-hidden>
                -
              </span>
              <Input
                type="text"
                inputMode="decimal"
                data-time-field="end"
                value={endTimeInput}
                onChange={(e) => onEndTimeChange(e.target.value)}
                onFocus={(e) => {
                  onTimeEditorOpenChange(true);
                  e.currentTarget.select();
                }}
                onBlur={onEndTimeBlur}
                onKeyDown={onInlineKeyDown}
                disabled={editSaving || rowUpdating}
                className={agencyTimeEntryClockTimeInputClass}
                aria-label="End time"
                aria-invalid={clockInvalid.end}
              />
              {spansNextDay ? (
                <span className={cn("shrink-0", agencyWorkTimeRangeClass)} aria-label="Next day">
                  +1
                </span>
              ) : null}
            </div>
          ) : timeRange ? (
            <span className={cn("w-full text-center whitespace-nowrap", agencyWorkTimeRangeClass)}>
              {timeRange}
            </span>
          ) : (
            <span className={cn("w-full text-center", agencyWorkTimeRangeClass)}>—</span>
          )}
        </div>

        <div className={agencyTimeEntryRailCalendarClass}>
          <AgencyTimeEntryDatePicker
            date={editDraft.date}
            disabled={editSaving || rowUpdating}
            onDateChange={onStartDateChange}
          />
        </div>

        <div className={agencyTimeEntryRailDurationClass}>
          {!isMulti ? (
            <Input
              data-time-field="duration"
              value={editDraft.durationInput}
              onChange={(e) => onDurationChange(e.target.value)}
              onFocus={() => onEditingDurationChange(true)}
              onBlur={onDurationBlur}
              onKeyDown={onInlineKeyDown}
              disabled={editSaving || rowUpdating}
              className={cn(
                "h-8 w-full border-0 bg-transparent px-0 text-center shadow-none focus-visible:ring-0",
                agencyWorkMetricClass,
              )}
              aria-label="Duration"
              aria-invalid={clockInvalid.duration}
            />
          ) : (
            <span className={cn("block w-full text-center", agencyWorkMetricClass)}>
              {durationLabel}
            </span>
          )}
          {editError ? (
            <p className="absolute top-full left-2.5 z-10 text-xs text-destructive" role="alert">
              {editError}
            </p>
          ) : null}
        </div>

        <div className={agencyTimeEntryRailPlayClass}>
          {isMulti && !expanded ? (
            <button
              type="button"
              className={cn(agencyTimeEntryIconButtonClass, !canRestart && "opacity-50")}
              disabled={!canRestart}
              aria-label={`Restart timer for ${group.taskTitle || group.projectName}`}
              onClick={onRestart}
            >
              <Play className="size-3.5" />
            </button>
          ) : (
            <AgencyTimeEntryPlayAction
              entry={{
                id: primaryEntryId,
                projectName: group.projectName,
                taskTitle: group.taskTitle,
              }}
              canRestart={canRestart}
              onRestart={onRestart}
            />
          )}
        </div>

        <div className={agencyTimeEntryRailMoreClass}>
          {isMulti && !expanded ? (
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={agencyTimeEntryIconButtonClass}
                  aria-label="Entry actions"
                >
                  <MoreVertical className="size-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-40 p-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={onToggleExpand}
                >
                  Show {group.entries.length} entries
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-error"
                  disabled={rowDeleting}
                  onClick={onDeleteGroup}
                >
                  <Trash2 className="size-3.5" />
                  Delete all
                </Button>
              </PopoverContent>
            </Popover>
          ) : (
            <AgencyTimeEntryMoreAction
              entry={{
                id: primaryEntryId,
                projectName: group.projectName,
                taskTitle: group.taskTitle,
                isWaste,
              }}
              deleting={rowDeleting || rowUpdating || editSaving}
              duplicating={rowDuplicating}
              wastePending={rowWastePending}
              onDelete={() => onDeleteGroup()}
              onDuplicate={!isMulti ? onDuplicate : undefined}
              onToggleWaste={onToggleWaste}
            />
          )}
        </div>
      </div>
    </div>
  );
}
