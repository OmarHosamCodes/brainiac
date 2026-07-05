import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

import { Input } from "@/components/ui/input";
import { usePrefersReducedMotion } from "@/lib/hooks/use-prefers-reduced-motion";
import {
  draftToIsoRange,
  validateTimeEntryDraft,
  type TimeEntryDraft,
} from "@/lib/schemas/agency-time-entry";
import type { AgencyReportCreatorState } from "@/lib/agency/reports/use-agency-report-creator";
import { agencyMetricClass } from "@/lib/utils/agency-ui";
import {
  groupEntriesByClient,
  isReportEntryWaste,
  reportEntryWasteRowClass,
  type AgencyReportEntry,
} from "@/lib/utils/agency-report-grouping";
import {
  applyDurationToDraft,
  entryToDraft,
} from "@/lib/utils/time-entry-draft";
import { formatDuration } from "@/lib/utils/format-duration";
import { cn } from "@/lib/utils";

type AgencyReportCreatorTableProps = {
  creator: AgencyReportCreatorState;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  savingEntryId?: string | null;
};

export function AgencyReportCreatorTable({
  creator,
  onSaveEdit,
  savingEntryId = null,
}: AgencyReportCreatorTableProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const clientGroups = groupEntriesByClient(creator.visibleEntries);
  const totalSeconds = creator.visibleEntries.reduce(
    (sum, entry) => sum + entry.durationSeconds,
    0,
  );

  return (
    <div className="space-y-6">
      {clientGroups.map((clientGroup) => (
        <section key={clientGroup.clientId} className="space-y-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
            <h3 className="text-sm font-bold text-highlighted">{clientGroup.clientName}</h3>
            <p className="text-xs text-muted">
              <span className={agencyMetricClass}>
                {formatDuration(clientGroup.totalSeconds, "clock")}
              </span>
              {" total"}
            </p>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-default bg-default">
            <table className="w-full min-w-[40rem] text-xs">
              <caption className="sr-only">
                Time entries for {clientGroup.clientName}, grouped by project
              </caption>
              <thead className="border-b border-default bg-muted/55">
                <tr className="text-left text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  <th scope="col" className="w-48 px-4 py-2.5 font-bold">
                    Project
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-bold">
                    Description
                  </th>
                  <th scope="col" className="w-28 px-4 py-2.5 text-right font-bold">
                    Duration
                  </th>
                  <th scope="col" className="w-36 px-4 py-2.5 font-bold">
                    Assignee
                  </th>
                </tr>
              </thead>
              <motion.tbody layout={!prefersReducedMotion}>
                <AnimatePresence initial={false}>
                  {clientGroup.projects.flatMap((project) =>
                    project.rows.map((row, rowIndex) => (
                      <ReportCreatorRow
                        key={row.id}
                        row={row}
                        rowIndex={rowIndex}
                        projectRowSpan={project.rows.length}
                        isSelected={creator.selectedEntryId === row.id}
                        isEditing={creator.editingEntryId === row.id}
                        isSaving={savingEntryId === row.id}
                        prefersReducedMotion={prefersReducedMotion}
                        onSelect={(anchor) => creator.toggleSelectEntry(row.id, anchor)}
                        onCancelEdit={creator.cancelEditing}
                        onSaveEdit={(draft) => onSaveEdit(row.id, draft)}
                      />
                    )),
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
      </p>
    </div>
  );
}

type ReportCreatorRowProps = {
  row: AgencyReportEntry;
  rowIndex: number;
  projectRowSpan: number;
  isSelected: boolean;
  isEditing: boolean;
  isSaving: boolean;
  prefersReducedMotion: boolean;
  onSelect: (anchor: { x: number; y: number }) => void;
  onCancelEdit: () => void;
  onSaveEdit: (draft: TimeEntryDraft) => Promise<void>;
};

function ReportCreatorRow({
  row,
  rowIndex,
  projectRowSpan,
  isSelected,
  isEditing,
  isSaving,
  prefersReducedMotion,
  onSelect,
  onCancelEdit,
  onSaveEdit,
}: ReportCreatorRowProps) {
  const [draft, setDraft] = useState<TimeEntryDraft>(() => entryToDraft(row));
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    if (isEditing) {
      setDraft(entryToDraft(row));
      setEditError(null);
    }
  }, [isEditing, row]);

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

  return (
    <motion.tr
      layout={!prefersReducedMotion}
      initial={false}
      data-report-creator-row
      exit={
        prefersReducedMotion
          ? undefined
          : { opacity: 0, height: 0, transition: { duration: 0.2 } }
      }
      className={cn(
        "cursor-pointer border-b border-default transition-colors duration-150 last:border-b-0",
        isSelected && "bg-primary/8 ring-1 ring-inset ring-primary/20",
        isReportEntryWaste(row) && reportEntryWasteRowClass,
      )}
      onClick={(event) => {
        if (isEditing) return;
        onSelect({ x: event.clientX, y: event.clientY });
      }}
    >
      {rowIndex === 0 ? (
        <td
          rowSpan={projectRowSpan}
          className="border-r border-default bg-elevated/40 px-4 py-3 align-middle text-xs font-bold text-highlighted"
        >
          {row.projectName}
        </td>
      ) : null}
      <td className="max-w-md px-4 py-3" dir="auto">
        {isEditing ? (
          <Input
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="h-7 text-xs"
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
      <td className="px-4 py-3 text-right font-mono tabular-nums text-muted">
        {isEditing ? (
          <Input
            value={draft.durationInput}
            onChange={(event) =>
              setDraft((current) => applyDurationToDraft(current, event.target.value))
            }
            onBlur={() => void saveDraft()}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
            className="h-7 text-right font-mono text-xs tabular-nums"
            aria-label="Duration"
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          formatDuration(row.durationSeconds, "clock")
        )}
        {isEditing && editError ? (
          <p className="mt-1 text-[10px] text-error">{editError}</p>
        ) : null}
      </td>
      <td className="px-4 py-3 text-highlighted">{row.userName}</td>
    </motion.tr>
  );
}
