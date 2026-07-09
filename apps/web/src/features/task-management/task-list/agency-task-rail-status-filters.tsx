import type { AgencyTaskRailStatusFilter } from "@/features/task-management/stores/agency-task-list";
import { agencyFocusRingClass, agencyMetricClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

const STATUS_FILTER_OPTIONS: Array<{
  value: AgencyTaskRailStatusFilter;
  label: string;
}> = [
  { value: "active", label: "Active" },
  { value: "done", label: "Done" },
  { value: "assigned", label: "Delegated" },
  { value: "new", label: "New" },
];

type AgencyTaskRailStatusFiltersProps = {
  railStatusFilter: AgencyTaskRailStatusFilter;
  activeCount: number | null;
  doneCount: number | null;
  assignedCount: number | null;
  newCount: number | null;
  onRailStatusFilterChange: (filter: AgencyTaskRailStatusFilter) => void;
};

export function AgencyTaskRailStatusFilters({
  railStatusFilter,
  activeCount,
  doneCount,
  assignedCount,
  newCount,
  onRailStatusFilterChange,
}: AgencyTaskRailStatusFiltersProps) {
  const counts: Record<AgencyTaskRailStatusFilter, number | null> = {
    active: activeCount,
    done: doneCount,
    assigned: assignedCount,
    new: newCount,
  };

  return (
    <div className="max-w-full overflow-x-auto">
      <div
        className="inline-flex rounded-full border border-default bg-elevated p-1"
        role="tablist"
        aria-label="Task status"
      >
        {STATUS_FILTER_OPTIONS.map((option) => {
          const selected = railStatusFilter === option.value;
          const count = counts[option.value];
          return (
            <button
              key={option.value}
              type="button"
              role="tab"
              aria-selected={selected}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none",
                selected ? "bg-default text-highlighted" : "text-muted hover:text-highlighted",
                agencyFocusRingClass,
              )}
              onClick={() => onRailStatusFilterChange(option.value)}
            >
              {option.label}
              <span className={cn(agencyMetricClass, "text-[10px] text-muted")}>
                {count === null ? "—" : count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
