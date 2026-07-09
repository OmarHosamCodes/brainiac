import { AgencyTimeEntryRowContainer } from "@/lib/agency/work/containers/agency-time-entry-row-container";
import {
  agencyMetricClass,
  agencyTimeEntrySectionHeaderClass,
  agencyWorkTableListClass,
} from "@/lib/utils/agency-ui";
import { formatDuration } from "@/lib/utils/format-duration";
import type { CollapsedEntryGroup, TimeEntryRecencySection } from "@/lib/utils/group-time-entries";
import type { TimeEntryDraft } from "@/lib/schemas/agency-time-entry";
import type { AgencyProject, AgencyProjectTask } from "@/lib/schemas/agency-work";
import { cn } from "@/lib/utils";

type AgencyTimeEntryRecencySectionViewProps = {
  section: TimeEntryRecencySection;
  teamId: string;
  projects: AgencyProject[];
  tasks: AgencyProjectTask[];
  expandedGroupKeys: Set<string>;
  isTimerMutationPending: boolean;
  deletingEntryIds: string[];
  updatingEntryIds: string[];
  duplicatingEntryIds: string[];
  onToggleGroupExpand: (collapseKey: string) => void;
  onRestart: (group: CollapsedEntryGroup) => void;
  onDeleteGroup: (entryIds: string[]) => void;
  onDeleteEntry: (entryId: string) => void;
  onDuplicate: (entryId: string) => void;
  onSaveEdit: (entryId: string, draft: TimeEntryDraft) => Promise<void>;
  onToggleWaste: (entryId: string) => Promise<void>;
  togglingWasteEntryIds: string[];
  highlightedEntryId?: string | null;
};

export function AgencyTimeEntryRecencySectionView({
  section,
  teamId,
  projects,
  tasks,
  expandedGroupKeys,
  isTimerMutationPending,
  deletingEntryIds,
  updatingEntryIds,
  duplicatingEntryIds,
  onToggleGroupExpand,
  onRestart,
  onDeleteGroup,
  onDeleteEntry,
  onDuplicate,
  onSaveEdit,
  onToggleWaste,
  togglingWasteEntryIds,
  highlightedEntryId = null,
}: AgencyTimeEntryRecencySectionViewProps) {
  const lastGroupIndex = section.groups.length - 1;

  return (
    <section className={agencyWorkTableListClass}>
      <header className={agencyTimeEntrySectionHeaderClass}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-semibold text-highlighted">{section.label}</span>
          <span className="rounded-full bg-elevated px-2 py-0.5 text-[11px] font-semibold tabular-nums text-muted">
            {section.groups.length}
          </span>
        </div>
        <span className="hidden sm:block" aria-hidden />
        <span className="inline-flex items-baseline gap-1.5 text-muted">
          <span>Total</span>
          <span className={cn("text-sm font-semibold", agencyMetricClass)}>
            {formatDuration(section.totalSeconds, "clock")}
          </span>
        </span>
        <span className="hidden sm:block" aria-hidden />
      </header>

      <ul className="flex min-w-0 flex-col">
        {section.groups.map((group, index) => {
          const primaryEntry = group.entries[0];
          if (!primaryEntry) return null;
          const groupExpandKey = `${primaryEntry.startedAt.slice(0, 10)}||${group.collapseKey}`;
          return (
            <li key={groupExpandKey}>
              <AgencyTimeEntryRowContainer
                group={group}
                teamId={teamId}
                projects={projects}
                tasks={tasks}
                expanded={expandedGroupKeys.has(groupExpandKey)}
                isTimerMutationPending={isTimerMutationPending}
                deletingEntryIds={deletingEntryIds}
                updatingEntryIds={updatingEntryIds}
                duplicatingEntryIds={duplicatingEntryIds}
                highlighted={highlightedEntryId === primaryEntry.id}
                omitBottomBorder={index === lastGroupIndex}
                onToggleExpand={() => onToggleGroupExpand(groupExpandKey)}
                onRestart={onRestart}
                onDeleteGroup={onDeleteGroup}
                onDeleteEntry={onDeleteEntry}
                onDuplicate={onDuplicate}
                onSaveEdit={onSaveEdit}
                onToggleWaste={onToggleWaste}
                togglingWasteEntryIds={togglingWasteEntryIds}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
