import { ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type RangePreset = "week" | "month" | "last30" | "custom";

export const RANGE_LABEL: Record<RangePreset, string> = {
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  custom: "Custom",
};

type FilterOption = {
  value: string;
  label: string;
};

type AgencyDashboardCommandBarProps = {
  rangePreset: RangePreset;
  onRangePresetChange: (preset: RangePreset) => void;
  customFromDate: string;
  onCustomFromChange: (value: string) => void;
  customToDate: string;
  onCustomToChange: (value: string) => void;
  projectId: string;
  onProjectChange: (projectId: string) => void;
  memberUserId: string;
  onMemberChange: (memberUserId: string) => void;
  onReset: () => void;
  projects: Array<{ id: string; name: string }>;
  members: Array<{ userId: string; userName: string }>;
  projectsLoading?: boolean;
};

const PRESETS: RangePreset[] = ["week", "month", "last30", "custom"];

const selectBaseClass = cn(
  "h-9 max-w-[12rem] appearance-none truncate rounded-xl border border-default bg-default py-1 pl-3 pr-8 text-xs font-semibold text-highlighted transition-colors",
  "hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  agencyFocusRingClass,
);

function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <div className="relative flex items-center">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        disabled={disabled}
        className={selectBaseClass}
        onChange={(event) => onChange(event.target.value)}
      >
        {placeholder ? <option value="">{placeholder}</option> : null}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-3.5 -translate-y-1/2 text-muted" />
    </div>
  );
}

export function AgencyDashboardCommandBar({
  rangePreset,
  onRangePresetChange,
  customFromDate,
  onCustomFromChange,
  customToDate,
  onCustomToChange,
  projectId,
  onProjectChange,
  memberUserId,
  onMemberChange,
  onReset,
  projects,
  members,
  projectsLoading,
}: AgencyDashboardCommandBarProps) {
  const hasActiveFilters = rangePreset !== "last30" || projectId !== "" || memberUserId !== "";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-default bg-elevated p-2">
      <FilterSelect
        id="agency-dashboard-project"
        label="Project"
        value={projectId}
        onChange={onProjectChange}
        options={projects.map((project) => ({ value: project.id, label: project.name }))}
        placeholder="All Projects"
        disabled={projectsLoading}
      />
      <FilterSelect
        id="agency-dashboard-member"
        label="Member"
        value={memberUserId}
        onChange={onMemberChange}
        options={members.map((member) => ({ value: member.userId, label: member.userName }))}
        placeholder="Team"
      />
      <FilterSelect
        id="agency-dashboard-range"
        label="Time range"
        value={rangePreset}
        onChange={(value) => onRangePresetChange(value as RangePreset)}
        options={PRESETS.map((preset) => ({ value: preset, label: RANGE_LABEL[preset] }))}
      />

      {rangePreset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="agency-dashboard-from">
            From date
          </label>
          <Input
            id="agency-dashboard-from"
            type="date"
            value={customFromDate}
            className="h-9 w-auto min-w-32 rounded-xl border-default bg-default px-2 text-xs font-semibold text-highlighted"
            onChange={(event) => onCustomFromChange(event.target.value)}
          />
          <span className="text-xs text-muted">–</span>
          <label className="sr-only" htmlFor="agency-dashboard-to">
            To date
          </label>
          <Input
            id="agency-dashboard-to"
            type="date"
            value={customToDate}
            className="h-9 w-auto min-w-32 rounded-xl border-default bg-default px-2 text-xs font-semibold text-highlighted"
            onChange={(event) => onCustomToChange(event.target.value)}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        {hasActiveFilters ? (
          <button
            type="button"
            className={cn(
              "h-9 rounded-xl px-2.5 text-xs font-semibold text-muted transition-colors hover:bg-default hover:text-highlighted",
              agencyFocusRingClass,
              "motion-reduce:transition-none",
            )}
            onClick={onReset}
          >
            Reset
          </button>
        ) : null}
      </div>
    </div>
  );
}
