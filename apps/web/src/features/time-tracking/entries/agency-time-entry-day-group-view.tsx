import { Copy } from "lucide-react";

import {
  agencyTimeEntryDayGroupClass,
  agencyTimeEntryIconButtonClass,
  agencyTimeEntrySectionHeaderClass,
  agencyTimeEntrySectionLabelClass,
  agencyTimeTrackerIconActionClass,
  agencyWorkMetricClass,
} from "@/features/shared/agency-ui";
import { formatAgencyDayLabel } from "@/features/time-tracking/format-agency-day-label";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntryDayGroup } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { AgencyProjectChooser } from "@/features/shared/choosers/agency-project-chooser";
import { AgencyTaskChooser } from "@/features/time-tracking/choosers/agency-task-chooser";
import { AgencyTagChooser } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";

export type AgencyDayBulkDraft = {
  projectId: string;
  taskId: string;
  description: string;
  tagIds: string[];
  isBillable: boolean | null;
};

type AgencyTimeEntryDayGroupViewProps = {
  day: TimeEntryDayGroup;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  highlightedEntryId?: string | null;
  selectedEntryIds?: Set<string>;
  bulkEditActive?: boolean;
  bulkDraft?: AgencyDayBulkDraft;
  onBulkDraftChange?: (patch: Partial<AgencyDayBulkDraft>) => void;
  onToggleEntrySelected?: (entryIds: string[]) => void;
  onToggleDayBulkEdit?: (dateKey: string) => void;
  onApplyBulk?: () => void;
  onCreateTag?: (name: string) => void;
  tagCreatePending?: boolean;
  tags?: AgencyTagOption[];
  projects?: AgencyProject[];
  tasks?: AgencyProjectTask[];
};

export function AgencyTimeEntryDayGroupView({
  day,
  renderGroupRow,
  highlightedEntryId = null,
  selectedEntryIds,
  bulkEditActive = false,
  bulkDraft,
  onBulkDraftChange,
  onToggleEntrySelected,
  onToggleDayBulkEdit,
  onApplyBulk,
  onCreateTag,
  tagCreatePending = false,
  tags = [],
  projects = [],
  tasks = [],
}: AgencyTimeEntryDayGroupViewProps) {
  const lastGroupIndex = day.groups.length - 1;
  const dayEntryIds = day.groups.flatMap((group) => group.entries.map((entry) => entry.id));
  const selectedCount = dayEntryIds.filter((id) => selectedEntryIds?.has(id)).length;
  const allSelected = dayEntryIds.length > 0 && selectedCount === dayEntryIds.length;
  const hasBulkPatch = Boolean(
    bulkDraft?.projectId ||
    bulkDraft?.taskId ||
    bulkDraft?.description.trim() ||
    bulkDraft?.tagIds.length ||
    bulkDraft?.isBillable === true ||
    bulkDraft?.isBillable === false,
  );

  return (
    <section className={agencyTimeEntryDayGroupClass}>
      <header className={agencyTimeEntrySectionHeaderClass}>
        <div className={agencyTimeEntrySectionLabelClass}>
          <span>{formatAgencyDayLabel(day.dateKey)}</span>
        </div>
        <div className="flex h-full shrink-0 items-center">
          <span className="mr-2 text-xs text-muted">Total:</span>
          <div className="flex h-full w-[133px] items-center px-[10px]">
            <span className={agencyWorkMetricClass}>
              {formatDuration(day.totalSeconds, "clock")}
            </span>
          </div>
          <div className="flex h-full w-[112px] items-center justify-end">
            {onToggleDayBulkEdit ? (
              <button
                type="button"
                className={agencyTimeEntryIconButtonClass}
                aria-label={bulkEditActive ? "Exit bulk edit" : "Bulk edit day"}
                aria-pressed={bulkEditActive}
                onClick={() => onToggleDayBulkEdit(day.dateKey)}
              >
                <Copy className="size-4" />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {bulkEditActive && bulkDraft && onBulkDraftChange && onApplyBulk ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-default bg-elevated/30 px-4 py-2 sm:px-5">
          {onToggleEntrySelected ? (
            <label className="inline-flex items-center gap-1.5 text-xs text-muted">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() => onToggleEntrySelected(dayEntryIds)}
                aria-label="Select all entries for day"
                className="size-3.5"
              />
              <span>All</span>
            </label>
          ) : null}
          <span className="text-xs text-muted">{selectedCount} selected</span>
          <AgencyProjectChooser
            value={bulkDraft.projectId}
            onValueChange={(projectId) => onBulkDraftChange({ projectId, taskId: "" })}
            projects={projects}
            placeholder="Project"
            allowEmpty
            emptyLabel="Project"
          />
          <AgencyTaskChooser
            value={bulkDraft.taskId}
            onValueChange={(taskId) => onBulkDraftChange({ taskId })}
            projects={projects}
            tasks={tasks}
            filterProjectId={bulkDraft.projectId || undefined}
            placeholder="Task"
            triggerFormat="task-only"
            disabled={!bulkDraft.projectId}
          />
          <AgencyTagChooser
            value={bulkDraft.tagIds}
            tags={tags}
            onValueChange={(tagIds) => onBulkDraftChange({ tagIds })}
            onCreateTag={onCreateTag}
            creating={tagCreatePending}
          />
          <button
            type="button"
            className={cn(
              agencyTimeTrackerIconActionClass,
              bulkDraft.isBillable === null ? "text-muted" : "text-highlighted",
            )}
            aria-pressed={bulkDraft.isBillable ?? false}
            aria-label={
              bulkDraft.isBillable === null
                ? "Leave billable unchanged"
                : bulkDraft.isBillable
                  ? "Set billable"
                  : "Set non-billable"
            }
            onClick={() =>
              onBulkDraftChange({
                isBillable:
                  bulkDraft.isBillable === null ? true : bulkDraft.isBillable ? false : null,
              })
            }
          >
            $
          </button>
          <Input
            value={bulkDraft.description}
            onChange={(e) => onBulkDraftChange({ description: e.target.value })}
            placeholder="Description"
            className="h-8 max-w-[12rem]"
          />
          <Button size="sm" disabled={selectedCount === 0 || !hasBulkPatch} onClick={onApplyBulk}>
            Apply
          </Button>
        </div>
      ) : null}

      <ul className="flex min-w-0 flex-col">
        {day.groups.map((group, index) => {
          const primaryEntry = group.entries[0];
          if (!primaryEntry) return null;
          const groupExpandKey = `${day.dateKey}||${group.collapseKey}`;
          const groupEntryIds = group.entries.map((entry) => entry.id);
          const selected = groupEntryIds.every((entryId) => selectedEntryIds?.has(entryId));
          return (
            <li key={groupExpandKey} className="relative">
              {bulkEditActive && onToggleEntrySelected ? (
                <label className="absolute top-1/2 left-2 z-10 -translate-y-1/2">
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() => onToggleEntrySelected(groupEntryIds)}
                    aria-label={`Select ${group.entries.length === 1 ? "entry" : `${group.entries.length} entries`}`}
                    className="size-3.5"
                  />
                </label>
              ) : null}
              <div className={bulkEditActive ? "pl-6" : undefined}>
                {renderGroupRow({
                  group,
                  groupExpandKey,
                  highlighted: highlightedEntryId === primaryEntry.id,
                  omitBottomBorder: index === lastGroupIndex,
                })}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
