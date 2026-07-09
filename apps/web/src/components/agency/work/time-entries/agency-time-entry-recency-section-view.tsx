import { AgencyTimeEntryRowContainer } from "@/lib/agency/work/containers/agency-time-entry-row-container";
import {
  agencyMetricClass,
  agencyMutedSectionHeaderClass,
  agencyTimeEntryScrollClass,
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
  return (
    <section className="p-2">
      <header className={agencyMutedSectionHeaderClass}>
        <div className="flex min-w-0 items-center gap-2">
          <span className="font-semibold text-highlighted">{section.label}</span>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-elevated px-1.5 font-mono text-xs font-semibold tabular-nums text-muted">
            {section.groups.length}
          </span>
        </div>
        <span className="inline-flex items-baseline gap-1.5 text-muted">
          <span>Total:</span>
          <span className={cn("text-base font-semibold", agencyMetricClass)}>
            {formatDuration(section.totalSeconds, "clock")}
          </span>
        </span>
      </header>

      <ul className={cn(agencyTimeEntryScrollClass, "flex flex-col rounded-b-md")}>
        {section.groups.map((group) => {
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
