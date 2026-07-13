import { CalendarDays, MoreVertical, Play, Tag, Trash2 } from "lucide-react";

import { AgencyTagChooser } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import { AgencyTimeEntryActions } from "@/features/time-tracking/entries/agency-time-entry-actions";
import { AgencyTimeEntryProjectLabel } from "@/features/time-tracking/entries/agency-time-entry-project-label";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import type { AgencyTimeEntryRowViewModel } from "@/features/time-tracking/hooks/use-agency-time-entry-row";
import {
  agencyFocusRingClass,
  agencyTimeEntryIconButtonClass,
  agencyTimeEntryMainClass,
  agencyTimeEntryRailActionsClass,
  agencyTimeEntryRailBillableClass,
  agencyTimeEntryRailCalendarClass,
  agencyTimeEntryRailClass,
  agencyTimeEntryRailDurationClass,
  agencyTimeEntryRailTagClass,
  agencyTimeEntryRailTimeClass,
  agencyTimeEntryRowClass,
  agencyTimeEntryRowEditingClass,
  agencyTimeEntryRowHighlightClass,
  agencyTimeEntryTimeInputClass,
  agencyTimeTrackerIconActionClass,
  agencyWorkCountBadgeClass,
  agencyWorkMetricClass,
  agencyWorkTimeRangeClass,
  agencyWorkTitleClass,
} from "@/features/shared/agency-ui";
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
    tags,
    tagCreatePending,
    onCreateTag,
    expanded,
    highlighted,
    isMulti,
    canRestart,
    primaryEntryId,
    descriptionDraft,
    editDraft,
    editError,
    editSaving,
    rowDeleting,
    rowUpdating,
    rowDuplicating,
    timeRange,
    durationLabel,
    displayTitle,
    editingDescription,
    editingDuration,
    onToggleExpand,
    onRestart,
    onDeleteGroup,
    onDuplicate,
    onDescriptionChange,
    onDescriptionBlur,
    onDescriptionKeyDown,
    onTaskChange,
    onProjectChange: _onProjectChange,
    onTagIdsChange,
    onIsBillableChange,
    onStartTimeChange,
    onEndTimeChange,
    onStartDateChange,
    onDurationChange,
    onInlineBlur,
    onInlineKeyDown,
    onEditingDescriptionChange,
    onEditingDurationChange,
  } = view;

  const taskChooserTriggerClass = cn(
    "h-auto min-h-0 w-auto max-w-full justify-start gap-1 border-0 bg-transparent px-0 py-0 text-xs font-normal shadow-none hover:bg-muted/60",
    agencyFocusRingClass,
    "motion-reduce:transition-none",
  );

  return (
    <div
      data-entry-id={primaryEntryId}
      className={cn(
        agencyTimeEntryRowClass,
        highlighted && agencyTimeEntryRowHighlightClass,
        (editingDescription || editingDuration) && agencyTimeEntryRowEditingClass,
        className,
      )}
    >
      <div className={agencyTimeEntryMainClass}>
        <div className="flex w-[200px] min-w-0 shrink-0 items-center">
          <div className={descriptionLeadingSlotClass}>
            {isMulti ? (
              <button
                type="button"
                className={cn(agencyWorkCountBadgeClass, agencyFocusRingClass)}
                aria-label={expanded ? "Collapse entries" : "Expand entries"}
                aria-expanded={expanded}
                onClick={onToggleExpand}
              >
                {group.entries.length}
              </button>
            ) : null}
          </div>
          {isMulti ? (
            <span
              className={cn(
                agencyWorkTitleClass,
                "block min-w-0 flex-1 truncate text-left font-normal",
              )}
            >
              {displayTitle}
            </span>
          ) : (
            <Input
              value={descriptionDraft}
              onChange={(e) => onDescriptionChange(e.target.value)}
              onFocus={() => onEditingDescriptionChange(true)}
              onBlur={() => {
                onEditingDescriptionChange(false);
                onDescriptionBlur();
              }}
              onKeyDown={(event) => {
                onDescriptionKeyDown(event);
                if (event.key === "Enter" || event.key === "Escape") {
                  onEditingDescriptionChange(false);
                }
              }}
              disabled={editSaving || rowUpdating}
              placeholder="Add description"
              className={cn(
                agencyWorkTitleClass,
                "h-[40px] min-w-0 flex-1 border-0 bg-transparent px-0 font-normal shadow-none focus-visible:ring-0",
              )}
              aria-label="Add description"
            />
          )}
        </div>

        <div className="flex min-w-0 flex-1 items-center gap-[10px] px-[10px]">
          {isMulti ? (
            <AgencyTimeEntryProjectLabel
              format="project-client"
              projectId={group.projectId}
              projectName={group.projectName}
              clientName={group.clientName || "General"}
              taskTitle={group.taskTitle}
              className="max-w-full"
            />
          ) : (
            <AgencyTaskChooser
              value={editDraft.taskId}
              onValueChange={onTaskChange}
              projects={projects}
              tasks={tasks}
              filterProjectId={editDraft.projectId || group.projectId || undefined}
              fallbackTaskTitle={group.taskTitle}
              fallbackProjectId={group.projectId}
              fallbackProjectName={group.projectName}
              fallbackClientName={group.clientName || "General"}
              placeholder="+ Project"
              triggerFormat="project-client"
              highlightSearch
              contentAlign="start"
              disabled={editSaving || rowUpdating}
              className={cn(taskChooserTriggerClass, "max-w-full")}
            />
          )}
        </div>
      </div>

      <div className={agencyTimeEntryRailClass}>
        <div className={agencyTimeEntryRailTagClass}>
          {isMulti ? (
            <span
              className={cn(
                "inline-flex size-8 items-center justify-center",
                group.entries[0]?.tags?.length ? "text-highlighted" : "text-muted",
              )}
              aria-label={
                group.entries[0]?.tags?.length ? `${group.entries[0].tags.length} tags` : "No tags"
              }
            >
              <Tag className="size-3.5" />
            </span>
          ) : (
            <AgencyTagChooser
              value={editDraft.tagIds}
              tags={tags}
              onValueChange={onTagIdsChange}
              onCreateTag={onCreateTag}
              creating={tagCreatePending}
              disabled={editSaving || rowUpdating}
              compact
            />
          )}
        </div>

        <div className={agencyTimeEntryRailBillableClass}>
          {isMulti ? (
            <span
              className={cn(
                "inline-flex size-8 items-center justify-center",
                group.entries[0]?.isBillable ? "text-info" : "text-muted",
              )}
              aria-label={group.entries[0]?.isBillable ? "Billable" : "Non-billable"}
            >
              $
            </span>
          ) : (
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
          )}
        </div>

        <div className={agencyTimeEntryRailTimeClass}>
          {!isMulti ? (
            <div className="flex w-full items-center justify-center gap-1 overflow-hidden">
              <Input
                type="time"
                value={editDraft.startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                onBlur={onInlineBlur}
                onKeyDown={onInlineKeyDown}
                disabled={editSaving || rowUpdating}
                className={cn(
                  agencyTimeEntryTimeInputClass,
                  agencyWorkTimeRangeClass,
                  "h-8 w-[4.75rem] text-right",
                )}
                aria-label="Start time"
              />
              <span className={cn("shrink-0", agencyWorkTimeRangeClass)} aria-hidden>
                -
              </span>
              <Input
                type="time"
                value={editDraft.endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                onBlur={onInlineBlur}
                onKeyDown={onInlineKeyDown}
                disabled={editSaving || rowUpdating}
                className={cn(
                  agencyTimeEntryTimeInputClass,
                  agencyWorkTimeRangeClass,
                  "h-8 w-[4.75rem] text-left",
                )}
                aria-label="End time"
              />
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
          {!isMulti ? (
            <label className="relative inline-flex size-8 cursor-pointer items-center justify-center rounded-md text-muted transition-colors hover:bg-elevated hover:text-highlighted">
              <Input
                type="date"
                value={editDraft.date}
                onChange={(e) => onStartDateChange(e.target.value)}
                onKeyDown={onInlineKeyDown}
                disabled={editSaving || rowUpdating}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                aria-label="Entry date"
              />
              <CalendarDays className="size-4" aria-hidden />
            </label>
          ) : (
            <span className="inline-flex size-8 items-center justify-center text-muted" aria-hidden>
              <CalendarDays className="size-4" />
            </span>
          )}
        </div>

        <div className={agencyTimeEntryRailDurationClass}>
          {!isMulti ? (
            <Input
              value={editDraft.durationInput}
              onChange={(e) => onDurationChange(e.target.value)}
              onFocus={() => onEditingDurationChange(true)}
              onBlur={() => {
                onEditingDurationChange(false);
                onInlineBlur();
              }}
              onKeyDown={onInlineKeyDown}
              disabled={editSaving || rowUpdating}
              className={cn(
                "h-8 w-full border-0 bg-transparent px-0 text-center shadow-none focus-visible:ring-0",
                agencyWorkMetricClass,
              )}
              aria-label="Duration"
            />
          ) : (
            <span className={cn("block w-full text-center", agencyWorkMetricClass)}>
              {durationLabel}
            </span>
          )}
          {editError ? (
            <p className="absolute top-full left-2.5 z-10 text-xs text-error">{editError}</p>
          ) : null}
        </div>

        <div className={agencyTimeEntryRailActionsClass}>
          {isMulti && !expanded ? (
            <>
              <button
                type="button"
                className={cn(agencyTimeEntryIconButtonClass, !canRestart && "opacity-50")}
                disabled={!canRestart}
                aria-label={`Restart timer for ${group.taskTitle}`}
                onClick={onRestart}
              >
                <Play className="size-3.5" />
              </button>
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
            </>
          ) : (
            <AgencyTimeEntryActions
              entry={{
                id: primaryEntryId,
                projectName: group.projectName,
                taskTitle: group.taskTitle,
              }}
              canRestart={canRestart}
              deleting={rowDeleting || rowUpdating || editSaving}
              duplicating={rowDuplicating}
              onRestart={onRestart}
              onDelete={() => onDeleteGroup()}
              onDuplicate={!isMulti ? onDuplicate : undefined}
            />
          )}
        </div>
      </div>
    </div>
  );
}
