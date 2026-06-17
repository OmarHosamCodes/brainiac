import {
  ChevronRight,
  MoreVertical,
  Play,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";

import { AgencyProjectHueDot } from "@/components/agency/agency-project-hue-dot";
import { AgencyTimeEntryActions } from "@/components/agency/agency-time-entry-actions";
import { AgencyTimeEntryInlineEdit } from "@/components/agency/agency-time-entry-inline-edit";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  agencyFocusRingClass,
  agencyMetricClass,
  agencyTimeEntryRowClass,
  agencyTimeEntryRowEditingClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { CollapsedEntryGroup } from "@/lib/utils/group-time-entries";
import {
  draftToIsoRange,
  entryToDraft,
  type TimeEntryDraft,
  validateTimeEntryDraft,
} from "@/lib/utils/time-entry-draft";
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
  return `${timeRangeFormatter.format(start)} – ${timeRangeFormatter.format(end)}`;
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
  editing: boolean;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  onToggleExpand: () => void;
  onEdit: () => void;
  onCancelEdit: () => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
};

export function AgencyTimeEntryRow({
  group,
  teamId,
  projects,
  tasks,
  expanded,
  editing,
  isTimerMutationPending,
  deletingEntryIds,
  updatingEntryIds,
  onToggleExpand,
  onEdit,
  onCancelEdit,
  onRestart,
  onDeleteGroup,
  onDeleteEntry,
  onSaveEdit,
}: AgencyTimeEntryRowProps) {
  const isMulti = group.entries.length > 1;
  const primaryEntry = group.entries[0]!;
  const [draft, setDraft] = useState<TimeEntryDraft>(() => entryToDraft(primaryEntry));
  const [editError, setEditError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    setDraft(entryToDraft(primaryEntry));
    setEditError(null);
  }, [editing, primaryEntry.id]);

  function beginEdit() {
    setDraft(entryToDraft(primaryEntry));
    setEditError(null);
    onEdit();
  }

  async function handleSave() {
    const validationError = validateTimeEntryDraft(draft);
    if (validationError) {
      setEditError(validationError);
      return;
    }

    const range = draftToIsoRange(draft);
    if ("error" in range) {
      setEditError(range.error);
      return;
    }

    setSaving(true);
    setEditError(null);
    try {
      await onSaveEdit(primaryEntry.id, draft);
      onCancelEdit();
    } finally {
      setSaving(false);
    }
  }

  const rowDeleting = group.entries.some((entry) => deletingEntryIds.includes(entry.id));
  const rowUpdating = group.entries.some((entry) => updatingEntryIds.includes(entry.id));
  const timeRange = formatTimeRange(primaryEntry.startedAt, primaryEntry.endedAt);
  const durationLabel = formatDuration(
    group.totalSeconds,
    isMulti && !expanded ? "short" : "clock",
  );

  return (
    <div className={cn(editing && agencyTimeEntryRowEditingClass)}>
      <div
        className={cn(
          agencyTimeEntryRowClass,
          "flex items-start gap-2 sm:items-center",
          editing && "border-b-0",
        )}
      >
        {isMulti ? (
          <button
            type="button"
            className={cn(
              "mt-0.5 shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none sm:mt-0",
              agencyFocusRingClass,
              expanded && "rotate-90",
            )}
            aria-label={expanded ? "Collapse entries" : "Expand entries"}
            aria-expanded={expanded}
            onClick={onToggleExpand}
          >
            <ChevronRight className="size-3.5" />
          </button>
        ) : (
          <span className="size-3.5 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          className={cn("min-w-0 flex-1 text-left", agencyFocusRingClass)}
          onClick={() => {
            if (!isMulti && !editing) beginEdit();
          }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5">
            <span className="truncate text-sm font-medium text-highlighted">{displayTitle(group)}</span>
            {isMulti && !expanded ? (
              <Badge variant="secondary" className="rounded-full font-mono tabular-nums text-[10px]">
                {group.entries.length}
              </Badge>
            ) : null}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-xs text-muted">
            <AgencyProjectHueDot projectId={group.projectId} />
            <span className="truncate">
              {group.clientName} · {group.projectName}
            </span>
          </div>
          {(!isMulti || expanded) && timeRange ? (
            <p className="mt-1 text-xs text-muted md:hidden">{timeRange}</p>
          ) : null}
        </button>

        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-center sm:gap-2">
          {(!isMulti || expanded) && timeRange ? (
            <span className="hidden shrink-0 text-xs text-muted md:inline">{timeRange}</span>
          ) : null}

          <span className={cn("text-sm font-semibold", agencyMetricClass)}>{durationLabel}</span>

          {isMulti && !expanded ? (
            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn("max-sm:min-h-11 max-sm:min-w-11", agencyFocusRingClass)}
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
                    className={cn("max-sm:min-h-11 max-sm:min-w-11", agencyFocusRingClass)}
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
              deleting={rowDeleting || rowUpdating}
              onEdit={beginEdit}
              onRestart={() => onRestart(group)}
              onDelete={() => onDeleteGroup([primaryEntry.id])}
            />
          )}
        </div>
      </div>

      {isMulti && expanded ? (
        <div className="border-b border-default bg-default/30">
          {group.entries.map((entry) => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-2 border-t border-default/60 px-4 py-2 pl-10"
            >
              <span className="text-xs text-muted">
                {formatTimeRange(entry.startedAt, entry.endedAt)}
              </span>
              <div className="flex shrink-0 items-center gap-1.5">
                <span className={cn("text-xs", agencyMetricClass)}>
                  {formatDuration(entry.durationSeconds, "short")}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn("text-error max-sm:min-h-11 max-sm:min-w-11", agencyFocusRingClass)}
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

      {editing && !isMulti ? (
        <AgencyTimeEntryInlineEdit
          draft={draft}
          onDraftChange={setDraft}
          projects={projects}
          tasks={tasks}
          error={editError}
          saving={saving || rowUpdating}
          onSave={() => void handleSave()}
          onCancel={onCancelEdit}
        />
      ) : null}
    </div>
  );
}
