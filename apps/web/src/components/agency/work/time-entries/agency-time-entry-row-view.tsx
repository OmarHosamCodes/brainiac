import { Calendar, MoreVertical, Play, Timer, Trash2 } from "lucide-react";
import { useState } from "react";

import { AgencyTimeEntryActions } from "@/components/agency/agency-time-entry-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import type { AgencyTimeEntryRowViewModel } from "@/lib/agency/work/hooks/use-agency-time-entry-row";
import {
  agencyFocusRingClass,
  agencyTaskRowProjectPillClass,
  agencyTimeEntryGridClass,
  agencyTimeEntryRowClass,
  agencyTimeEntryRowEditingClass,
  agencyTimeEntryRowHighlightClass,
  agencyTimeEntryTimeInputClass,
  agencyWorkPlayButtonClass,
} from "@/lib/utils/agency-ui";
import { reportEntryWasteRowClass } from "@/lib/utils/agency-report-grouping";
import { projectHuePillStyle } from "@/lib/utils/project-palette";
import { useTheme } from "@/stores/theme";
import { cn } from "@/lib/utils";

const descriptionLeadingSlotClass = "flex w-8 shrink-0 items-center justify-start";

type AgencyTimeEntryRowViewProps = {
  view: AgencyTimeEntryRowViewModel;
  className?: string;
};

export function AgencyTimeEntryRowView({ view, className }: AgencyTimeEntryRowViewProps) {
  const { isDark } = useTheme();
  const [editingDescription, setEditingDescription] = useState(false);
  const [editingFields, setEditingFields] = useState(false);

  const {
    group,
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
    rowWastePending,
    isWaste,
    timeRange,
    durationLabel,
    displayTitle,
    onToggleExpand,
    onRestart,
    onDeleteGroup,
    onDuplicate,
    onDescriptionChange,
    onDescriptionBlur,
    onDescriptionKeyDown,
    onStartTimeChange,
    onEndTimeChange,
    onStartDateChange,
    onDurationChange,
    onInlineBlur,
    onInlineKeyDown,
  } = view;

  const categoryLabel = group.clientName || "General";
  const projectLabel = group.projectName;

  return (
    <div
      data-entry-id={primaryEntryId}
      className={cn(
        agencyTimeEntryRowClass,
        agencyTimeEntryGridClass,
        highlighted && agencyTimeEntryRowHighlightClass,
        (editingDescription || editingFields) && agencyTimeEntryRowEditingClass,
        isWaste && reportEntryWasteRowClass,
        className,
      )}
    >
      <div className="col-start-1 row-start-1 min-w-0 sm:col-auto sm:row-auto">
        <div className="flex min-w-0 items-start gap-3">
          <div className={cn(descriptionLeadingSlotClass, "pt-1")}>
            {isMulti ? (
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
            ) : (
              <span
                className={cn(
                  "mt-1.5 size-2.5 rounded-full",
                  isWaste ? "bg-warning" : "bg-primary",
                )}
                aria-hidden
              />
            )}
          </div>

          <div className="min-w-0 flex-1">
            {!isMulti ? (
              editingDescription ? (
                <Input
                  value={descriptionDraft}
                  onChange={(e) => onDescriptionChange(e.target.value)}
                  onBlur={() => {
                    setEditingDescription(false);
                    onDescriptionBlur();
                  }}
                  onKeyDown={(event) => {
                    onDescriptionKeyDown(event);
                    if (event.key === "Enter" || event.key === "Escape") {
                      setEditingDescription(false);
                    }
                  }}
                  disabled={editSaving || rowUpdating}
                  autoFocus
                  className="h-7 min-w-0 border-0 bg-transparent px-0 text-sm font-semibold text-highlighted shadow-none focus-visible:ring-0"
                  aria-label="Edit description"
                />
              ) : (
                <button
                  type="button"
                  className={cn(
                    "block max-w-full truncate text-left text-sm font-semibold text-highlighted",
                    agencyFocusRingClass,
                  )}
                  onClick={() => setEditingDescription(true)}
                >
                  {displayTitle}
                </button>
              )
            ) : (
              <span className="block min-w-0 truncate text-left text-sm font-semibold text-highlighted">
                {displayTitle}
              </span>
            )}

            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span
                className={cn(agencyTaskRowProjectPillClass, "max-w-[9rem] truncate")}
                style={projectHuePillStyle(group.projectId, isDark)}
              >
                {group.taskTitle || projectLabel}
              </span>
              <span className="inline-flex max-w-[8rem] truncate rounded-full border border-default bg-elevated px-1.5 py-0.5 text-[10px] font-semibold text-muted">
                {categoryLabel}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="col-start-1 row-start-2 min-w-0 sm:col-auto sm:row-auto">
        {!isMulti ? (
          editingFields ? (
            <Popover
              open={editingFields}
              onOpenChange={(open) => {
                setEditingFields(open);
                if (!open) onInlineBlur();
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "inline-flex h-8 min-w-0 max-w-full items-center gap-2 rounded-lg px-2 text-left font-mono text-sm font-medium tabular-nums text-muted transition-colors hover:bg-elevated hover:text-highlighted",
                    agencyFocusRingClass,
                  )}
                  disabled={editSaving || rowUpdating}
                  aria-label={`Edit time range, ${timeRange || "no time range"}`}
                >
                  <Calendar className="size-4 shrink-0 text-muted" aria-hidden />
                  <span className="min-w-0 truncate">{timeRange || "-"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-auto min-w-[19rem] p-3">
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-xs font-semibold text-muted">
                      <span>Start</span>
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
                    </label>
                    <label className="grid gap-1 text-xs font-semibold text-muted">
                      <span>End</span>
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
                    </label>
                  </div>
                  <label className="grid gap-1 text-xs font-semibold text-muted">
                    <span>Date</span>
                    <Input
                      type="date"
                      value={editDraft.date}
                      onChange={(e) => onStartDateChange(e.target.value)}
                      onBlur={onInlineBlur}
                      onKeyDown={onInlineKeyDown}
                      disabled={editSaving || rowUpdating}
                      className="h-8 font-mono text-sm tabular-nums"
                      aria-label="Start date"
                    />
                  </label>
                </div>
              </PopoverContent>
            </Popover>
          ) : (
            <button
              type="button"
              className={cn(
                "inline-flex h-8 min-w-0 max-w-full items-center gap-2 rounded-lg px-2 text-left font-mono text-sm font-medium tabular-nums text-muted transition-colors hover:bg-elevated hover:text-highlighted",
                agencyFocusRingClass,
              )}
              disabled={editSaving || rowUpdating}
              onClick={() => setEditingFields(true)}
              aria-label={`Edit time range, ${timeRange || "no time range"}`}
            >
              <Calendar className="size-4 shrink-0 text-muted" aria-hidden />
              <span className="min-w-0 truncate">{timeRange || "-"}</span>
            </button>
          )
        ) : timeRange ? (
          <span className="inline-flex min-w-0 items-center gap-2 truncate font-mono text-sm font-medium tabular-nums text-muted">
            <Calendar className="size-4 shrink-0 text-muted" aria-hidden />
            {timeRange}
          </span>
        ) : (
          <span className="text-sm text-muted/70">-</span>
        )}
      </div>

      <div className="col-start-1 row-start-3 min-w-0 sm:col-auto sm:row-auto">
        {!isMulti ? (
          editingFields ? (
            <div className="inline-flex items-center gap-2">
              <Timer className="size-4 shrink-0 text-muted" aria-hidden />
              <Input
                value={editDraft.durationInput}
                onChange={(e) => onDurationChange(e.target.value)}
                onBlur={() => {
                  setEditingFields(false);
                  onInlineBlur();
                }}
                onKeyDown={(event) => {
                  onInlineKeyDown(event);
                  if (event.key === "Enter" || event.key === "Escape") {
                    setEditingFields(false);
                  }
                }}
                disabled={editSaving || rowUpdating}
                autoFocus
                className="h-7 min-w-[4rem] border-0 bg-transparent px-0 font-mono text-sm font-medium tabular-nums text-muted shadow-none focus-visible:text-highlighted focus-visible:ring-0"
                aria-label="Duration"
              />
            </div>
          ) : (
            <button
              type="button"
              className={cn(
                "inline-flex items-center gap-2 font-mono text-sm font-medium tabular-nums text-muted hover:text-highlighted",
                agencyFocusRingClass,
              )}
              onClick={() => setEditingFields(true)}
            >
              <Timer className="size-4 shrink-0 text-muted" aria-hidden />
              {editDraft.durationInput || durationLabel}
            </button>
          )
        ) : (
          <span className="inline-flex items-center gap-2 font-mono text-sm font-medium tabular-nums text-muted">
            <Timer className="size-4 shrink-0 text-muted" aria-hidden />
            {durationLabel}
          </span>
        )}
        {editError ? <p className="text-xs text-error">{editError}</p> : null}
      </div>

      <div className="col-start-2 row-span-3 row-start-1 flex min-w-0 shrink-0 items-start justify-end gap-1 sm:col-auto sm:row-auto sm:items-center">
        {isMulti && !expanded ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <Button
              variant="ghost"
              size="sm"
              className={cn(agencyWorkPlayButtonClass, "h-8 w-8 p-0", agencyFocusRingClass)}
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
            duplicating={rowDuplicating}
            wastePending={rowWastePending}
            onRestart={onRestart}
            onDelete={() => onDeleteGroup()}
            onDuplicate={!isMulti ? onDuplicate : undefined}
            onToggleWaste={group.taskId ? view.onToggleWaste : undefined}
          />
        )}
      </div>
    </div>
  );
}
