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

export type DashboardSortBy = "time" | "recent" | "name";

export const SORT_OPTIONS: { value: DashboardSortBy; label: string }[] = [
  { value: "time", label: "Most time" },
  { value: "recent", label: "Most recent" },
  { value: "name", label: "Name" },
] as const;

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
  clientId: string;
  onClientChange: (clientId: string) => void;
  projectId: string;
  onProjectChange: (projectId: string) => void;
  memberUserId: string;
  onMemberChange: (memberUserId: string) => void;
  sortBy: DashboardSortBy;
  onSortChange: (sortBy: DashboardSortBy) => void;
  onReset: () => void;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string }>;
  members: Array<{ userId: string; userName: string }>;
  clientsLoading?: boolean;
  projectsLoading?: boolean;
};

const PRESETS: RangePreset[] = ["week", "month", "last30", "custom"];

const selectBaseClass = cn(
  "h-8 max-w-[12rem] appearance-none truncate rounded-lg border border-default bg-default py-1 pl-2.5 pr-7 text-xs font-semibold text-highlighted transition-colors",
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
  clientId,
  onClientChange,
  projectId,
  onProjectChange,
  memberUserId,
  onMemberChange,
  sortBy,
  onSortChange,
  onReset,
  clients,
  projects,
  members,
  clientsLoading,
  projectsLoading,
}: AgencyDashboardCommandBarProps) {
  const hasActiveFilters =
    rangePreset !== "last30" ||
    clientId !== "" ||
    projectId !== "" ||
    memberUserId !== "" ||
    sortBy !== "time";

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-default bg-elevated p-2">
      <div
        className="inline-flex h-9 items-center rounded-full border border-default bg-default p-0.5"
        role="group"
        aria-label="Dashboard period"
      >
        {PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            className={cn(
              "h-7 rounded-full px-2.5 text-[11px] font-bold transition-colors motion-reduce:transition-none",
              agencyFocusRingClass,
              rangePreset === preset
                ? "bg-primary text-primary-foreground"
                : "text-muted hover:bg-elevated hover:text-highlighted",
            )}
            aria-pressed={rangePreset === preset}
            onClick={() => onRangePresetChange(preset)}
          >
            {RANGE_LABEL[preset]}
          </button>
        ))}
      </div>

      {rangePreset === "custom" ? (
        <div className="flex flex-wrap items-center gap-2">
          <label className="sr-only" htmlFor="agency-dashboard-from">
            From date
          </label>
          <Input
            id="agency-dashboard-from"
            type="date"
            value={customFromDate}
            className="h-8 w-auto min-w-32 rounded-lg border-default bg-default px-2 text-xs font-semibold text-highlighted"
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
            className="h-8 w-auto min-w-32 rounded-lg border-default bg-default px-2 text-xs font-semibold text-highlighted"
            onChange={(event) => onCustomToChange(event.target.value)}
          />
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          id="agency-dashboard-client"
          label="Client"
          value={clientId}
          onChange={onClientChange}
          options={clients.map((client) => ({ value: client.id, label: client.name }))}
          placeholder="All clients"
          disabled={clientsLoading}
        />
        <FilterSelect
          id="agency-dashboard-project"
          label="Project"
          value={projectId}
          onChange={onProjectChange}
          options={projects.map((project) => ({ value: project.id, label: project.name }))}
          placeholder="All projects"
          disabled={projectsLoading}
        />
        <FilterSelect
          id="agency-dashboard-member"
          label="Member"
          value={memberUserId}
          onChange={onMemberChange}
          options={members.map((member) => ({ value: member.userId, label: member.userName }))}
          placeholder="All members"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 md:ml-auto">
        <FilterSelect
          id="agency-dashboard-sort"
          label="Sort"
          value={sortBy}
          onChange={(value) => onSortChange(value as DashboardSortBy)}
          options={SORT_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
        />

        {hasActiveFilters ? (
          <button
            type="button"
            className={cn(
              "h-8 rounded-lg px-2.5 text-xs font-semibold text-muted transition-colors hover:bg-default hover:text-highlighted",
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
