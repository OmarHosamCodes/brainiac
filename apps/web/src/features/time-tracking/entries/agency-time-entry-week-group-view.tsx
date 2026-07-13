import { AgencyTimeEntryDayGroupView } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import type { AgencyDayBulkDraft } from "@/features/time-tracking/entries/agency-time-entry-day-group-view";
import {
  agencyTimeWeekGroupBodyClass,
  agencyTimeWeekGroupClass,
  agencyTimeWeekGroupHeaderClass,
  agencyWorkWeekLabelClass,
} from "@/features/shared/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { TimeEntryWeekGroup } from "@/features/time-tracking/group-time-entries";
import type { AgencyTimeEntryGroupRowRenderer } from "@/features/time-tracking/entries/agency-time-entry-row-renderer";
import type { AgencyProject, AgencyProjectTask } from "@/features/task-management/agency-work";
import type { AgencyTagOption } from "@/features/time-tracking/choosers/agency-tag-chooser";
import { cn } from "@/lib/utils";

type AgencyTimeEntryWeekGroupViewProps = {
  week: TimeEntryWeekGroup;
  renderGroupRow: AgencyTimeEntryGroupRowRenderer;
  highlightedEntryId?: string | null;
  selectedEntryIds?: Set<string>;
  bulkEditDayKey?: string | null;
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

export function AgencyTimeEntryWeekGroupView({
  week,
  renderGroupRow,
  highlightedEntryId = null,
  selectedEntryIds,
  bulkEditDayKey = null,
  bulkDraft,
  onBulkDraftChange,
  onToggleEntrySelected,
  onToggleDayBulkEdit,
  onApplyBulk,
  onCreateTag,
  tagCreatePending,
  tags,
  projects,
  tasks,
}: AgencyTimeEntryWeekGroupViewProps) {
  return (
    <section className={agencyTimeWeekGroupClass}>
      <header className={agencyTimeWeekGroupHeaderClass}>
        <h2 className={agencyWorkWeekLabelClass}>{week.label}</h2>
        <p className={cn("inline-flex items-baseline gap-2", agencyWorkWeekLabelClass)}>
          <span>Week total:</span>
          <span className={cn("font-mono tabular-nums", agencyWorkWeekLabelClass)}>
            {formatDuration(week.totalSeconds, "clock")}
          </span>
        </p>
      </header>

      <div className={agencyTimeWeekGroupBodyClass}>
        {week.days.map((day) => (
          <AgencyTimeEntryDayGroupView
            key={day.dateKey}
            day={day}
            highlightedEntryId={highlightedEntryId}
            renderGroupRow={renderGroupRow}
            selectedEntryIds={selectedEntryIds}
            bulkEditActive={bulkEditDayKey === day.dateKey}
            bulkDraft={bulkDraft}
            onBulkDraftChange={onBulkDraftChange}
            onToggleEntrySelected={onToggleEntrySelected}
            onToggleDayBulkEdit={onToggleDayBulkEdit}
            onApplyBulk={onApplyBulk}
            onCreateTag={onCreateTag}
            tagCreatePending={tagCreatePending}
            tags={tags}
            projects={projects}
            tasks={tasks}
          />
        ))}
      </div>
    </section>
  );
}
