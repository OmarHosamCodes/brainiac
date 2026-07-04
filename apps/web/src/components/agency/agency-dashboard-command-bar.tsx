import { ChevronDown } from "lucide-react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { AgencyProjectChooser } from "@/components/agency/agency-project-chooser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { agencyFocusRingClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

export type RangePreset = "tenure" | "week" | "month" | "last30" | "custom";

export const RANGE_LABEL: Record<RangePreset, string> = {
  tenure: "Tenure period",
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
  onApply: () => void;
  hasPendingChanges: boolean;
  onReset: () => void;
  defaultRangePreset: RangePreset;
  tenureAvailable: boolean;
  projects: Array<{ id: string; name: string; clientName: string }>;
  members: Array<{ userId: string; userName: string; avatar?: string | null }>;
  projectsLoading?: boolean;
};

function rangePresets(tenureAvailable: boolean): RangePreset[] {
  return tenureAvailable
    ? ["tenure", "week", "month", "last30", "custom"]
    : ["week", "month", "last30", "custom"];
}

const filterTriggerClass = cn(
  "inline-flex h-9 min-w-32 max-w-44 items-center justify-between gap-2 rounded-xl border border-default bg-default px-3 text-left text-xs font-semibold transition-colors hover:bg-elevated disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none",
  agencyFocusRingClass,
);

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
  onApply,
  hasPendingChanges,
  onReset,
  defaultRangePreset,
  tenureAvailable,
  projects,
  members,
  projectsLoading,
}: AgencyDashboardCommandBarProps) {
  const hasActiveFilters =
    rangePreset !== defaultRangePreset || projectId !== "" || memberUserId !== "";

  const memberOptions = members.map((member) => ({
    userId: member.userId,
    userName: member.userName,
    userAvatar: member.avatar ?? null,
  }));

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-default bg-elevated p-2">
      <AgencyProjectChooser
        value={projectId}
        onValueChange={onProjectChange}
        projects={projects}
        allowEmpty
        emptyLabel="All Projects"
        placeholder="All Projects"
        searchPlaceholder="Search projects or clients"
        loading={projectsLoading}
        disabled={projectsLoading}
        className={cn(filterTriggerClass, projectId ? "text-highlighted" : "text-muted")}
      />
      <AgencyMemberChooser
        value={memberUserId}
        onValueChange={onMemberChange}
        members={memberOptions}
        placeholder="Team"
        searchPlaceholder="Search members"
        allowUnassigned={false}
        allowEmpty
        className={cn(
          filterTriggerClass,
          "h-9 w-auto max-w-44",
          memberUserId ? "text-highlighted" : "text-muted",
        )}
      />
      <FilterSelect
        id="agency-dashboard-range"
        label="Time range"
        value={rangePreset}
        onChange={(value) => onRangePresetChange(value as RangePreset)}
        options={rangePresets(tenureAvailable).map((preset) => ({
          value: preset,
          label: RANGE_LABEL[preset],
        }))}
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
        <Button variant="secondary" size="sm" disabled={!hasPendingChanges} onClick={onApply}>
          Apply
        </Button>
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
