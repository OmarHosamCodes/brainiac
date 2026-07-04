import { MoreVertical, Play, Trash2 } from "lucide-react";

import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { AgencyTimeEntryActions } from "@/components/agency/agency-time-entry-actions";
import { AgencyTimeEntryProjectLabel } from "@/components/agency/agency-time-entry-project-label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AgencyTimeEntryRowViewModel } from "@/lib/agency/work/hooks/use-agency-time-entry-row";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTimeEntryGridClass,
  agencyTimeEntryRowClass,
  agencyTimeEntryRowHighlightClass,
} from "@/lib/utils/agency-ui";
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
    timeRange,
    durationLabel,
    displayTitle,
    onToggleExpand,
    onRestart,
    onDeleteGroup,
    onDescriptionChange,
    onDescriptionBlur,
    onDescriptionKeyDown,
    onTaskChange,
    onStartTimeChange,
    onEndTimeChange,
    onDurationChange,
    onInlineBlur,
    onInlineKeyDown,
  } = view;

  return (
    <div
      data-entry-id={primaryEntryId}
      className={cn(
        agencyTimeEntryRowClass,
        agencyTimeEntryGridClass,
        highlighted && agencyTimeEntryRowHighlightClass,
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

      <div className="min-w-0 border-l border-dashed border-default pl-4 pr-4">
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

      <div className="grid grid-cols-2 gap-1 border-l border-dashed border-default pl-4 pr-4 text-xs text-muted">
        {!isMulti ? (
          <>
            <Input
              type="time"
              value={editDraft.startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              onBlur={onInlineBlur}
              onKeyDown={onInlineKeyDown}
              disabled={editSaving || rowUpdating}
              className="h-7 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0"
              aria-label="Start time"
            />
            <Input
              type="time"
              value={editDraft.endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              onBlur={onInlineBlur}
              onKeyDown={onInlineKeyDown}
              disabled={editSaving || rowUpdating}
              className="h-7 border-0 bg-transparent px-0 font-mono text-xs shadow-none focus-visible:ring-0"
              aria-label="End time"
            />
          </>
        ) : timeRange ? (
          <span className="col-span-2">{timeRange}</span>
        ) : (
          <span className="col-span-2">-</span>
        )}
      </div>

      <div className="border-l border-dashed border-default pl-4 pr-4">
        {!isMulti ? (
          <Input
            value={editDraft.durationInput}
            onChange={(e) => onDurationChange(e.target.value)}
            onBlur={onInlineBlur}
            onKeyDown={onInlineKeyDown}
            disabled={editSaving || rowUpdating}
            className={cn(
              "h-7 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0",
              agencyMetricClass,
            )}
            aria-label="Duration"
          />
        ) : (
          <span className={cn("text-base font-semibold", agencyMetricClass)}>{durationLabel}</span>
        )}
        {editError ? <p className="text-xs text-error">{editError}</p> : null}
      </div>

      <div className="flex min-w-0 shrink-0 items-center justify-end gap-0.5 border-l border-dashed border-default pl-3">
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
            }}
            canRestart={canRestart}
            deleting={rowDeleting || rowUpdating || editSaving}
            onRestart={onRestart}
            onDelete={() => onDeleteGroup()}
          />
        )}
      </div>
    </div>
  );
}
