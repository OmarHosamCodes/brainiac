import type { AgencyClientArchiveFilter } from "@/features/shared/agency-client-archive-filter";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import { cn } from "@/lib/utils";

const ARCHIVE_FILTER_OPTIONS: Array<{
  value: AgencyClientArchiveFilter;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "nonarchived", label: "Non-archived" },
  { value: "archived", label: "Archived" },
];

type AgencyClientArchiveFilterProps = {
  archiveFilter: AgencyClientArchiveFilter;
  onArchiveFilterChange: (filter: AgencyClientArchiveFilter) => void;
};

export function AgencyClientArchiveFilter({
  archiveFilter,
  onArchiveFilterChange,
}: AgencyClientArchiveFilterProps) {
  return (
    <div
      className="inline-flex shrink-0 rounded-full border border-default bg-default p-1"
      role="tablist"
      aria-label="Archive status"
    >
      {ARCHIVE_FILTER_OPTIONS.map((option) => {
        const selected = archiveFilter === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={selected}
            className={cn(
              "inline-flex shrink-0 items-center rounded-full px-3 py-1 text-[11px] font-bold transition-colors motion-reduce:transition-none",
              selected ? "bg-elevated text-highlighted" : "text-muted hover:text-highlighted",
              agencyFocusRingClass,
            )}
            onClick={() => onArchiveFilterChange(option.value)}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
