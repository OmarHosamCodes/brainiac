import { ChevronRight, MoreVertical, Play, Trash2 } from "lucide-react";
import type { KeyboardEvent } from "react";
import { memo, useCallback, useEffect, useRef, useState } from "react";

import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { AgencyTaskChooser } from "@/components/agency/agency-task-chooser";
import { AgencyTimeEntryActions } from "@/components/agency/agency-time-entry-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTimeEntryRowClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { CollapsedEntryGroup } from "@/lib/utils/group-time-entries";
import { projectHueFor } from "@/lib/utils/project-palette";
import {
  applyDurationToDraft,
  applyEndTimeToDraft,
  draftToIsoRange,
  entryToDraft,
  type TimeEntryDraft,
  validateTimeEntryDraft,
} from "@/lib/utils/time-entry-draft";
import { useTheme } from "@/stores/theme";
import { cn } from "@/lib/utils";

const timeRangeFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
});

type Project = {
  id: string;
  clientName: string;
  name: string;
};

type Task = {
  id: string;
  projectId: string;
  title: string;
  status: "open" | "in_progress" | "done" | "archived";
  assigneeName?: string | null;
  dueDate?: string | null;
};

function formatTimeRange(startedAt: string, endedAt: string) {
  const start = new Date(startedAt);
  const end = new Date(endedAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  return `${timeRangeFormatter.format(start)} - ${timeRangeFormatter.format(end)}`;
}

function displayTitle(group: CollapsedEntryGroup) {
  if (group.description.trim()) return group.description;
  return group.taskTitle;
}

type AgencyTimeEntryRowProps = {
  group: CollapsedEntryGroup;
  teamId: string;
  projects: Project[];
  tasks: Task[];
  expanded: boolean;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  onToggleExpand: () => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
};

export const AgencyTimeEntryRow = memo(function AgencyTimeEntryRow({
  group,
  teamId,
  projects,
  tasks,
  expanded,
  isTimerMutationPending,
  deletingEntryIds,
  updatingEntryIds,
  onToggleExpand,
  onRestart,
  onDeleteGroup,
  onDeleteEntry,
  onSaveEdit,
}: AgencyTimeEntryRowProps) {
  const { isDark } = useTheme();
  const projectHue = projectHueFor(group.projectId);

  const isMulti = group.entries.length > 1;
  const primaryEntry = group.entries[0]!;
  const descriptionInputRef = useRef<HTMLInputElement>(null);

  const [editDraft, setEditDraft] = useState<TimeEntryDraft>(() => entryToDraft(primaryEntry));
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [descriptionDraft, setDescriptionDraft] = useState(() => displayTitle(group));

  useEffect(() => {
    setDescriptionDraft(displayTitle(group));
  }, [group]);

  useEffect(() => {
    setEditDraft(entryToDraft(primaryEntry));
    setEditError(null);
  }, [primaryEntry.id]);

  const resetEditDraft = useCallback(() => {
    setEditDraft(entryToDraft(primaryEntry));
    setEditError(null);
  }, [primaryEntry]);

  async function saveDraft(nextDraft: TimeEntryDraft): Promise<boolean> {
    const validationError = validateTimeEntryDraft(nextDraft);
    if (validationError) {
      setEditError(validationError);
      return false;
    }

    const range = draftToIsoRange(nextDraft);
    if ("error" in range) {
      setEditError(range.error);
      return false;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      await onSaveEdit(primaryEntry.id, nextDraft);
      return true;
    } finally {
      setEditSaving(false);
    }
  }

  async function saveDescriptionEdit() {
    const trimmed = descriptionDraft.trim();
    if (trimmed === displayTitle(group)) {
      return;
    }

    const draft = entryToDraft(primaryEntry);
    draft.description = trimmed;
    await saveDraft(draft);
  }

  function cancelDescriptionEdit() {
    setDescriptionDraft(displayTitle(group));
  }

  function updateInlineDraft(nextDraft: TimeEntryDraft) {
    setEditDraft(nextDraft);
    setEditError(null);
  }

  async function saveInlineDraft(nextDraft = editDraft) {
    if (isMulti) return;
    await saveDraft(nextDraft);
  }

  function saveOnEnter(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveInlineDraft();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      resetEditDraft();
      cancelDescriptionEdit();
    }
  }

  const rowDeleting = group.entries.some((entry) => deletingEntryIds.includes(entry.id));
  const rowUpdating = group.entries.some((entry) => updatingEntryIds.includes(entry.id));
  const timeRange = formatTimeRange(primaryEntry.startedAt, primaryEntry.endedAt);
  const durationLabel = formatDuration(group.totalSeconds, "clock");
  const projectColor = isDark ? projectHue.dark : projectHue.light;

  return (
    <>
      <div
        className={cn(
          agencyTimeEntryRowClass,
          "grid min-w-[52rem] grid-cols-[minmax(14rem,1.35fr)_minmax(12rem,0.9fr)_9rem_7rem_5.25rem] items-center gap-0",
        )}
      >
        <div className="flex min-w-0 items-center gap-3 pr-4">
          {isMulti ? (
            <button
              type="button"
              className={cn(
                "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border border-default bg-elevated px-2 font-mono text-[10px] font-bold tabular-nums text-muted transition-colors hover:bg-default hover:text-highlighted",
                agencyFocusRingClass,
              )}
              aria-label={expanded ? "Collapse entries" : "Expand entries"}
              aria-expanded={expanded}
              onClick={onToggleExpand}
            >
              {group.entries.length}
              <ChevronRight
                className={cn(
                  "size-3 transition-transform duration-200 motion-reduce:transition-none",
                  expanded && "rotate-90",
                )}
                aria-hidden
              />
            </button>
          ) : (
            <span className="size-3.5 shrink-0" aria-hidden />
          )}

          {!isMulti ? (
            <Input
              ref={descriptionInputRef}
              value={descriptionDraft}
              onChange={(e) => setDescriptionDraft(e.target.value)}
              onBlur={() => void saveDescriptionEdit()}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void saveDescriptionEdit();
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  cancelDescriptionEdit();
                }
              }}
              disabled={editSaving || rowUpdating}
              className="h-7 min-w-0 border-0 bg-transparent px-0 text-sm font-medium shadow-none focus-visible:ring-0"
              aria-label="Edit description"
            />
          ) : (
            <span className="min-w-0 truncate text-left text-sm font-medium text-highlighted">
              {displayTitle(group)}
            </span>
          )}
        </div>

        <div className="min-w-0 border-l border-dashed border-default pl-4 pr-4">
          {!isMulti ? (
            <AgencyTaskChooser
              value={editDraft.taskId}
              onValueChange={(taskId) => {
                const nextDraft = { ...editDraft, taskId };
                updateInlineDraft(nextDraft);
                void saveInlineDraft(nextDraft);
              }}
              projects={projects}
              tasks={tasks}
              placeholder="Task"
              className="h-8 w-full border-0 bg-transparent px-0 text-xs shadow-none hover:bg-transparent"
              disabled={editSaving || rowUpdating}
            />
          ) : (
            <span className="inline-flex min-w-0 items-center gap-1 truncate text-xs">
              <AgencyProjectHueDot projectId={group.projectId} />
              <span className="truncate font-medium" style={{ color: projectColor }}>
                {group.projectName}
              </span>
              <span className="truncate text-muted">- {group.clientName}</span>
            </span>
          )}
        </div>

        <div className="grid grid-cols-2 gap-1 border-l border-dashed border-default pl-4 pr-4 text-xs text-muted">
          {!isMulti ? (
            <>
              <Input
                type="time"
                value={editDraft.startTime}
                onChange={(e) =>
                  updateInlineDraft(
                    applyDurationToDraft(
                      { ...editDraft, startTime: e.target.value },
                      editDraft.durationInput,
                    ),
                  )
                }
                onBlur={() => void saveInlineDraft()}
                onKeyDown={saveOnEnter}
                disabled={editSaving || rowUpdating}
                className="h-7 border-0 bg-transparent px-0 font-mono text-[11px] shadow-none focus-visible:ring-0"
                aria-label="Start time"
              />
              <Input
                type="time"
                value={editDraft.endTime}
                onChange={(e) => updateInlineDraft(applyEndTimeToDraft(editDraft, e.target.value))}
                onBlur={() => void saveInlineDraft()}
                onKeyDown={saveOnEnter}
                disabled={editSaving || rowUpdating}
                className="h-7 border-0 bg-transparent px-0 font-mono text-[11px] shadow-none focus-visible:ring-0"
                aria-label="End time"
              />
            </>
          ) : (!isMulti || expanded) && timeRange ? (
            <span className="col-span-2">{timeRange}</span>
          ) : (
            <span className="col-span-2">-</span>
          )}
        </div>

        <div className="border-l border-dashed border-default pl-4 pr-4">
          {!isMulti ? (
            <Input
              value={editDraft.durationInput}
              onChange={(e) => updateInlineDraft(applyDurationToDraft(editDraft, e.target.value))}
              onBlur={() => void saveInlineDraft()}
              onKeyDown={saveOnEnter}
              disabled={editSaving || rowUpdating}
              className={cn(
                "h-7 border-0 bg-transparent px-0 text-base font-semibold shadow-none focus-visible:ring-0",
                agencyMetricClass,
              )}
              aria-label="Duration"
            />
          ) : (
            <span className={cn("text-base font-semibold", agencyMetricClass)}>
              {durationLabel}
            </span>
          )}
          {editError ? <p className="text-[10px] text-error">{editError}</p> : null}
        </div>

        <div className="flex min-w-0 shrink-0 items-center justify-end gap-0.5 border-l border-dashed border-default pl-3">
          {isMulti && !expanded ? (
            <div className="flex shrink-0 items-center gap-0.5">
              <Button
                variant="ghost"
                size="sm"
                className={cn("h-8 w-8 p-0", agencyFocusRingClass)}
                disabled={!teamId || !group.taskId || isTimerMutationPending}
                aria-label={`Restart timer for ${group.taskTitle}`}
                onClick={() => onRestart(group)}
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
                    onClick={() => onDeleteGroup(group.entries.map((entry) => entry.id))}
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
                id: primaryEntry.id,
                projectName: group.projectName,
                taskTitle: group.taskTitle,
              }}
              canRestart={Boolean(teamId && group.taskId && !isTimerMutationPending)}
              deleting={rowDeleting || rowUpdating || editSaving}
              onRestart={() => onRestart(group)}
              onDelete={() => onDeleteGroup([primaryEntry.id])}
            />
          )}
        </div>
      </div>

      {isMulti && expanded ? (
        <div className="min-w-[52rem] border-b border-default bg-default/30">
          {group.entries.map((entry) => (
            <div
              key={entry.id}
              className="grid grid-cols-[minmax(14rem,1.35fr)_minmax(12rem,0.9fr)_9rem_7rem_5.25rem] items-center border-t border-default/60 px-4 py-2 text-xs"
            >
              <span className="truncate pl-6 text-muted">Entry detail</span>
              <span className="border-l border-dashed border-default pl-4 pr-4 text-muted">-</span>
              <span className="border-l border-dashed border-default pl-4 pr-4 text-muted">
                {formatTimeRange(entry.startedAt, entry.endedAt)}
              </span>
              <span
                className={cn("border-l border-dashed border-default pl-4 pr-4", agencyMetricClass)}
              >
                {formatDuration(entry.durationSeconds, "clock")}
              </span>
              <div className="flex shrink-0 items-center justify-end gap-1.5 border-l border-dashed border-default pl-3">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("h-8 w-8 p-0 text-error", agencyFocusRingClass)}
                  disabled={deletingEntryIds.includes(entry.id)}
                  aria-label="Delete entry"
                  onClick={() => onDeleteEntry(entry.id)}
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </>
  );
});
