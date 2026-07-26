import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { AgencyReportDurationCell } from "@/features/reports/cells/agency-report-duration-cell";
import { AgencyReportEntryContextMenu } from "@/features/reports/agency-report-entry-context-menu";
import { AgencyReportCreatorRowActions } from "@/features/reports/creator/agency-report-creator-row-actions";
import { Input } from "@/ui/input";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import {
  draftToIsoRange,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/features/time-tracking/agency-time-entry";
import type { AgencyReportCreatorState } from "@/features/reports/use-agency-report-creator";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  isReportFieldVisible,
  isReportCreatorSelectionHighlightField,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import { agencyMetricClass } from "@/features/shared/agency-ui";
import {
  groupEntriesForDisplay,
  isReportEntryWaste,
  reportEntryWasteRowClass,
  type AggregatedReportRow,
} from "@/features/reports/agency-report-grouping";
import { applyDurationToDraft, entryToDraft } from "@/features/time-tracking/time-entry-draft";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

const reportCreatorSelectedCellClass = "bg-primary/8 ring-1 ring-inset ring-primary/20";

function reportCreatorCellSelectionClass(
  isSelected: boolean,
  field: AgencyReportFieldId,
): string | false {
  return isSelected && isReportCreatorSelectionHighlightField(field)
    ? reportCreatorSelectedCellClass
    : false;
}

type AgencyReportCreatorTableProps = {
  creator: AgencyReportCreatorState;
  visibleFields?: AgencyReportFieldId[];
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onExcludeEntry: (entryId: string) => void;
  onToggleWaste: (entryId: string) => void;
  savingEntryId?: string | null;
  wastePending?: boolean;
};

export function AgencyReportCreatorTable({
  creator,
  visibleFields = allAgencyReportFieldIds(),
  onSaveEdit,
  onExcludeEntry,
  onToggleWaste,
  savingEntryId = null,
  wastePending = false,
}: AgencyReportCreatorTableProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const clientGroups = groupEntriesForDisplay(creator.visibleEntries);
  const totalSeconds = creator.visibleEntries.reduce(
    (sum, entry) => sum + entry.durationSeconds,
    0,
  );
  const showProject = isReportFieldVisible(visibleFields, "project");
  const showTask = isReportFieldVisible(visibleFields, "task");
  const showDescription = isReportFieldVisible(visibleFields, "description");
  const showDuration = isReportFieldVisible(visibleFields, "duration");
  const showAssignee = isReportFieldVisible(visibleFields, "assignee");

  return (
    <div className="space-y-6">
      {clientGroups.map((clientGroup) => (
        <section key={clientGroup.clientId} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h3 className="text-sm font-semibold text-highlighted">{clientGroup.clientName}</h3>
            <p className="text-xs text-muted">
              <span className={agencyMetricClass}>
                {formatDuration(clientGroup.totalSeconds, "clock")}
              </span>
              {" total"}
            </p>
          </div>
          <div className="overflow-x-auto rounded-dense border border-default bg-default">
            <table className="w-full min-w-[40rem] text-xs">
              <caption className="sr-only">
                Time entries for {clientGroup.clientName}, grouped by project and task
              </caption>
              <thead className="border-b border-default bg-elevated/65">
                <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                  {showProject ? (
                    <th scope="col" className="w-48 px-4 py-2.5 font-semibold">
                      {AGENCY_REPORT_FIELD_LABELS.project}
                    </th>
                  ) : null}
                  {showTask ? (
                    <th scope="col" className="w-40 px-4 py-2.5 font-semibold">
                      {AGENCY_REPORT_FIELD_LABELS.task}
                    </th>
                  ) : null}
                  {showDescription ? (
                    <th scope="col" className="px-4 py-2.5 font-semibold">
                      {AGENCY_REPORT_FIELD_LABELS.description}
                    </th>
                  ) : null}
                  {showDuration ? (
                    <th scope="col" className="w-28 px-4 py-2.5 text-right font-semibold">
                      {AGENCY_REPORT_FIELD_LABELS.duration}
                    </th>
                  ) : null}
                  {showAssignee ? (
                    <th scope="col" className="w-36 px-4 py-2.5 font-semibold">
                      {AGENCY_REPORT_FIELD_LABELS.assignee}
                    </th>
                  ) : null}
                  <th scope="col" className="w-10 px-2 py-2.5">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <motion.tbody layout={!prefersReducedMotion}>
                <AnimatePresence initial={false}>
                  {clientGroup.projects.flatMap((project) =>
                    project.rows.map((row, rowIndex) => {
                      const activeEntryId =
                        creator.editingEntryId &&
                        row.entries.some((entry) => entry.id === creator.editingEntryId)
                          ? creator.editingEntryId
                          : creator.selectedEntryId &&
                              row.entries.some((entry) => entry.id === creator.selectedEntryId)
                            ? creator.selectedEntryId
                            : null;
                      const primaryEntryId = [...row.entries].sort(
                        (left, right) =>
                          new Date(right.startedAt).getTime() - new Date(left.startedAt).getTime(),
                      )[0]?.id;

                      return (
                        <ReportCreatorRow
                          key={row.key}
                          row={row}
                          rowIndex={rowIndex}
                          projectRowSpan={project.rows.length}
                          showProject={showProject}
                          showTask={showTask}
                          showDescription={showDescription}
                          showDuration={showDuration}
                          showAssignee={showAssignee}
                          activeEntryId={activeEntryId}
                          primaryEntryId={primaryEntryId ?? row.entries[0]?.id ?? ""}
                          isSelected={row.entries.some(
                            (entry) => entry.id === creator.selectedEntryId,
                          )}
                          isEditing={Boolean(
                            creator.editingEntryId &&
                            row.entries.some((entry) => entry.id === creator.editingEntryId),
                          )}
                          isSaving={Boolean(activeEntryId && savingEntryId === activeEntryId)}
                          prefersReducedMotion={prefersReducedMotion}
                          wastePending={wastePending}
                          onSelectEntry={creator.selectEntry}
                          onEdit={(entryId) => creator.startEditing(entryId)}
                          onRemove={onExcludeEntry}
                          onToggleWaste={onToggleWaste}
                          onCancelEdit={creator.cancelEditing}
                          onSaveEdit={(draft) => {
                            if (!activeEntryId) return Promise.resolve();
                            return onSaveEdit(activeEntryId, draft);
                          }}
                        />
                      );
                    }),
                  )}
                </AnimatePresence>
              </motion.tbody>
            </table>
          </div>
        </section>
      ))}

      <p className="text-xs text-muted">
        <span className={agencyMetricClass}>{creator.visibleEntries.length}</span>
        {creator.visibleEntries.length === 1 ? " entry" : " entries"}
        <span aria-hidden="true"> · </span>
        <span className={agencyMetricClass}>{formatDuration(totalSeconds, "clock")}</span>
        {" total"}
        <span aria-hidden="true"> · </span>
        Use the row menu to edit or remove. Removed entries stay in time tracking.
      </p>
    </div>
  );
}

type ReportCreatorRowProps = {
  row: AggregatedReportRow;
  rowIndex: number;
  projectRowSpan: number;
  showProject: boolean;
  showTask: boolean;
  showDescription: boolean;
  showDuration: boolean;
  showAssignee: boolean;
  activeEntryId: string | null;
  primaryEntryId: string;
  isSelected: boolean;
  isEditing: boolean;
  isSaving: boolean;
  prefersReducedMotion: boolean;
  wastePending: boolean;
  onSelectEntry: (entryId: string) => void;
  onEdit: (entryId: string) => void;
  onRemove: (entryId: string) => void;
  onToggleWaste: (entryId: string) => void;
  onCancelEdit: () => void;
  onSaveEdit: (draft: TimeEntryDraft) => Promise<void>;
};

function ReportCreatorRow({
  row,
  rowIndex,
  projectRowSpan,
  showProject,
  showTask,
  showDescription,
  showDuration,
  showAssignee,
  activeEntryId,
  primaryEntryId,
  isSelected,
  isEditing,
  isSaving,
  prefersReducedMotion,
  wastePending,
  onSelectEntry,
  onEdit,
  onRemove,
  onToggleWaste,
  onCancelEdit,
  onSaveEdit,
}: ReportCreatorRowProps) {
  const editingEntry =
    row.entries.find((entry) => entry.id === activeEntryId) ??
    row.entries.find((entry) => entry.id === primaryEntryId) ??
    row.entries[0]!;
  const [draft, setDraft] = useState<TimeEntryDraft>(() => entryToDraft(editingEntry));
  const [editError, setEditError] = useState<string | null>(null);
  const rowLabel = row.taskTitle || row.description || row.projectName;

  useEffect(() => {
    if (isEditing) {
      setDraft(entryToDraft(editingEntry));
      setEditError(null);
    }
  }, [isEditing, editingEntry]);

  async function saveDraft() {
    const validationError = validateTimeEntryDraft(draft, { requireTask: false });
    if (validationError) {
      setEditError(validationError);
      return;
    }
    const range = draftToIsoRange(draft);
    if ("error" in range) {
      setEditError(range.error);
      return;
    }
    setEditError(null);
    await onSaveEdit(draft);
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Enter") {
      event.preventDefault();
      void saveDraft();
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancelEdit();
    }
  }

  const rowElement = (
    <motion.tr
      layout={!prefersReducedMotion}
      initial={false}
      data-report-creator-row
      exit={
        prefersReducedMotion ? undefined : { opacity: 0, height: 0, transition: { duration: 0.2 } }
      }
      className={cn(
        "border-b border-default transition-colors duration-150 last:border-b-0",
        isReportEntryWaste(row) && reportEntryWasteRowClass,
      )}
    >
      {showProject && rowIndex === 0 ? (
        <td
          rowSpan={projectRowSpan}
          className="border-r border-default bg-elevated/40 px-4 py-3 align-middle text-xs font-semibold text-highlighted"
        >
          {row.projectName}
        </td>
      ) : null}
      {showTask ? (
        <td
          className={cn(
            "max-w-48 truncate px-4 py-3 text-highlighted",
            reportCreatorCellSelectionClass(isSelected, "task"),
          )}
          title={row.taskTitle || undefined}
          dir="auto"
        >
          {row.taskTitle || "—"}
        </td>
      ) : null}
      {showDescription ? (
        <td
          className={cn(
            "max-w-md px-4 py-3",
            reportCreatorCellSelectionClass(isSelected, "description"),
          )}
          dir="auto"
        >
          {isEditing ? (
            <Input
              value={draft.description}
              onChange={(event) =>
                setDraft((current) => ({ ...current, description: event.target.value }))
              }
              onKeyDown={handleKeyDown}
              disabled={isSaving}
              className="h-7 rounded-dense text-xs"
              aria-label="Description"
              autoFocus
              onClick={(event) => event.stopPropagation()}
            />
          ) : (
            <span className="block truncate text-highlighted" title={row.description || undefined}>
              {row.description || "—"}
            </span>
          )}
        </td>
      ) : null}
      {showDuration ? (
        <td
          className={cn(
            "px-4 py-3 text-right text-muted",
            reportCreatorCellSelectionClass(isSelected, "duration"),
          )}
        >
          {isEditing ? (
            <>
              <Input
                value={draft.durationInput}
                onChange={(event) =>
                  setDraft((current) => applyDurationToDraft(current, event.target.value))
                }
                onBlur={() => void saveDraft()}
                onKeyDown={handleKeyDown}
                disabled={isSaving}
                className="h-7 rounded-dense text-right font-mono text-xs tabular-nums"
                aria-label="Duration"
                onClick={(event) => event.stopPropagation()}
              />
              {editError ? <p className="mt-1 text-[10px] text-error">{editError}</p> : null}
            </>
          ) : (
            <AgencyReportDurationCell row={row} />
          )}
        </td>
      ) : null}
      {showAssignee ? (
        <td
          className={cn(
            "px-4 py-3 text-highlighted",
            reportCreatorCellSelectionClass(isSelected, "assignee"),
          )}
        >
          {row.userName}
        </td>
      ) : null}
      <td className="px-2 py-3 text-right">
        <AgencyReportCreatorRowActions
          label={rowLabel}
          taskId={row.taskId}
          taskIsWaste={row.taskIsWaste}
          disabled={isEditing || isSaving}
          wastePending={wastePending}
          onEdit={() => onEdit(primaryEntryId)}
          onRemove={() => onRemove(primaryEntryId)}
          onToggleWaste={row.taskId ? () => onToggleWaste(primaryEntryId) : undefined}
        />
      </td>
    </motion.tr>
  );

  return (
    <AgencyReportEntryContextMenu
      entryId={primaryEntryId}
      taskTitle={row.taskTitle}
      durationSeconds={row.durationSeconds}
      taskId={row.taskId}
      taskIsWaste={row.taskIsWaste}
      disabled={isEditing || isSaving}
      wastePending={wastePending}
      onSelectEntry={onSelectEntry}
      onEdit={() => onEdit(primaryEntryId)}
      onRemove={() => onRemove(primaryEntryId)}
      onToggleWaste={() => onToggleWaste(primaryEntryId)}
    >
      {rowElement}
    </AgencyReportEntryContextMenu>
  );
}
