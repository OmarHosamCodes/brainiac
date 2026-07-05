import { Calendar, MoreVertical, Play, Trash2 } from "lucide-react";
import { useRef } from "react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { AgencyTimeEntryActions } from "@/components/agency/agency-time-entry-actions";
import { AgencyTimeEntryProjectLabel } from "@/components/agency/agency-time-entry-project-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AgencyTimeEntryRowViewModel } from "@/lib/agency/work/hooks/use-agency-time-entry-row";
import {
  agencyFocusRingClass,
  agencyTimeEntryGridClass,
  agencyTimeEntryRowClass,
  agencyTimeEntryRowHighlightClass,
  agencyTimeEntryTimeInputClass,
} from "@/lib/utils/agency-ui";
import { reportEntryWasteRowClass } from "@/lib/utils/agency-report-grouping";
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
    editError,
    editSaving,
    rowDeleting,
    rowUpdating,
    rowWastePending,
    isWaste,
    timeRange,
    durationLabel,
    displayTitle,
    onToggleExpand,
    onRestart,
    onDeleteGroup,
    onToggleWaste,
    onDescriptionChange,
    onDescriptionBlur,
    onDescriptionKeyDown,
    onTaskChange,
    onStartTimeChange,
    onEndTimeChange,
    onStartDateChange,
    onDurationChange,
    onInlineBlur,
    onInlineKeyDown,
  } = view;

  const startDateInputRef = useRef<HTMLInputElement>(null);

  function openStartDatePicker() {
    const input = startDateInputRef.current;
    if (!input || editSaving || rowUpdating) return;
    if (typeof input.showPicker === "function") {
      input.showPicker();
      return;
    }
    input.click();
  }

  return (
    <div
      data-entry-id={primaryEntryId}
      className={cn(
        agencyTimeEntryRowClass,
        agencyTimeEntryGridClass,
        highlighted && agencyTimeEntryRowHighlightClass,
        isWaste && reportEntryWasteRowClass,
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-3 pr-4">
        {isMulti ? (
          <div className={descriptionLeadingSlotClass}>
            <button
              type="button"
              className={cn(
                "inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-default bg-elevated px-1.5 font-mono text-xs font-bold tabular-nums text-muted transition-colors hover:bg-default hover:text-highlighted",
                agencyFocusRingClass,
              )}
              aria-label={expanded ? "Collapse entries" : "Expand entries"}
              aria-expanded={expanded}
              onClick={onToggleExpand}
            >
              {group.entries.length}
            </button>
          </div>
        ) : null}

        {!isMulti ? (
          <Input
            value={descriptionDraft}
            onChange={(e) => onDescriptionChange(e.target.value)}
            onBlur={onDescriptionBlur}
            onKeyDown={onDescriptionKeyDown}
            disabled={editSaving || rowUpdating}
            className="h-7 min-w-0 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
            aria-label="Edit description"
          />
        ) : (
          <span className="min-w-0 truncate text-left text-sm font-medium text-highlighted">
            {displayTitle}
          </span>
        )}
      </div>

      <div className="min-w-0 border-l border-dashed border-default px-3">
        {!isMulti ? (
          <AgencyTaskChooser
            value={editDraft.taskId}
            onValueChange={onTaskChange}
            projects={projects}
            tasks={tasks}
            placeholder="Task"
            triggerFormat="project-client"
            className="h-8 w-full border-0 bg-transparent px-0 text-xs shadow-none hover:bg-transparent"
            disabled={editSaving || rowUpdating}
          />
        ) : (
          <AgencyTimeEntryProjectLabel
            projectId={group.projectId}
            projectName={group.projectName}
            clientName={group.clientName}
          />
        )}
      </div>

      <div className="flex min-w-0 items-center gap-1 border-l border-dashed border-default px-3">
        {!isMulti ? (
          <>
            <div className="grid min-w-0 flex-1 grid-cols-2 gap-1">
              <Input
                type="time"
                value={editDraft.startTime}
                onChange={(e) => onStartTimeChange(e.target.value)}
                onBlur={onInlineBlur}
                onKeyDown={onInlineKeyDown}
                disabled={editSaving || rowUpdating}
                className={agencyTimeEntryTimeInputClass}
                aria-label="Start time"
              />
              <Input
                type="time"
                value={editDraft.endTime}
                onChange={(e) => onEndTimeChange(e.target.value)}
                onBlur={onInlineBlur}
                onKeyDown={onInlineKeyDown}
                disabled={editSaving || rowUpdating}
                className={agencyTimeEntryTimeInputClass}
                aria-label="End time"
              />
            </div>
            <input
              ref={startDateInputRef}
              type="date"
              value={editDraft.date}
              onChange={(e) => onStartDateChange(e.target.value)}
              disabled={editSaving || rowUpdating}
              aria-label="Start date"
              tabIndex={-1}
              className="sr-only"
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={editSaving || rowUpdating}
              className={cn("h-8 w-8 shrink-0 p-0 text-muted", agencyFocusRingClass)}
              aria-label="Choose start date"
              onClick={openStartDatePicker}
            >
              <Calendar className="size-4" />
            </Button>
          </>
        ) : timeRange ? (
          <span className="min-w-0 flex-1 truncate font-mono text-sm font-medium tabular-nums tracking-tight text-muted">
            {timeRange}
          </span>
        ) : (
          <span className="text-sm text-muted/70">-</span>
        )}
      </div>

      <div className="min-w-0 border-l border-dashed border-default px-3">
        {!isMulti ? (
          <Input
            value={editDraft.durationInput}
            onChange={(e) => onDurationChange(e.target.value)}
            onBlur={onInlineBlur}
            onKeyDown={onInlineKeyDown}
            disabled={editSaving || rowUpdating}
            className="h-7 min-w-[4rem] border-0 bg-transparent px-0 font-mono text-sm font-medium tabular-nums text-muted shadow-none focus-visible:text-highlighted focus-visible:ring-0"
            aria-label="Duration"
          />
        ) : (
          <span className="font-mono text-sm font-medium tabular-nums text-muted">{durationLabel}</span>
        )}
        {editError ? <p className="text-xs text-error">{editError}</p> : null}
      </div>

      <div className="flex min-w-0 shrink-0 items-center justify-end gap-1 border-l border-dashed border-default pl-3 pr-1">
        {isMulti && !expanded ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
              disabled={!canRestart}
              aria-label={`Restart timer for ${group.taskTitle}`}
              onClick={onRestart}
            >
              <Play className="size-3.5" />
            </Button>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
                  aria-label="Entry actions"
                >
                  <MoreVertical className="size-3.5" />
                </Button>
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
          </div>
        ) : (
          <AgencyTimeEntryActions
            entry={{
              id: primaryEntryId,
              projectName: group.projectName,
              taskTitle: group.taskTitle,
              taskId: group.taskId,
              taskIsWaste: isWaste,
            }}
            canRestart={canRestart}
            deleting={rowDeleting || rowUpdating || editSaving}
            wastePending={rowWastePending}
            onRestart={onRestart}
            onDelete={() => onDeleteGroup()}
            onToggleWaste={group.taskId ? onToggleWaste : undefined}
          />
        )}
      </div>
    </div>
  );
}
