import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { AgencyProjectChooser } from "@/components/agency/agency-project-chooser";
import {
  AgencyCommandBarActions,
  AgencyCommandBarResetButton,
  agencyCommandBarFilterTriggerClass,
  agencyCommandBarShellClass,
} from "@/components/agency/agency-command-bar-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
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
  clientId?: string;
  onClientChange?: (clientId: string) => void;
  clients?: Array<{ id: string; name: string }>;
  clientsLoading?: boolean;
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
  trailingActions?: ReactNode;
};

function rangePresets(tenureAvailable: boolean): RangePreset[] {
  return tenureAvailable
    ? ["tenure", "week", "month", "last30", "custom"]
    : ["week", "month", "last30", "custom"];
}

const filterTriggerClass = agencyCommandBarFilterTriggerClass;

const filterOptionButtonClass = cn(
  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

function FilterOptionChooser({
  label,
  value,
  onChange,
  options,
  emptyLabel,
  searchPlaceholder,
  disabled,
  loading,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  emptyLabel: string;
  searchPlaceholder: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedLabel =
    options.find((option) => option.value === value)?.label ?? emptyLabel;

  const filteredOptions = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return options;
    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [options, searchTerm]);

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (!nextOpen) setSearchTerm("");
  }

  function selectOption(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    setSearchTerm("");
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled || loading}
          className={cn(filterTriggerClass, value ? "text-highlighted" : "text-muted")}
          aria-label={label}
        >
          <span className="min-w-0 flex-1 truncate">
            {loading ? "Loading…" : selectedLabel}
          </span>
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden p-0">
        <div className="border-b border-white/10 p-2">
          <div className="relative">
            <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted" />
            <Input
              autoFocus
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={searchPlaceholder}
              className={cn(
                "h-9 rounded-lg border-default bg-default pl-8 text-sm",
                agencyInputPlaceholderClass,
              )}
            />
          </div>
        </div>
        <div className="max-h-60 overflow-y-auto p-1">
          <button
            type="button"
            className={cn(filterOptionButtonClass, !value && "bg-primary/10 text-primary")}
            onClick={() => selectOption("")}
          >
            <span className="truncate">{emptyLabel}</span>
            {!value ? (
              <Check className="size-3.5 shrink-0" aria-hidden />
            ) : (
              <span className="size-3.5 shrink-0" aria-hidden />
            )}
          </button>
          {filteredOptions.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted">No matches.</p>
          ) : (
            filteredOptions.map((option) => {
              const selected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  className={cn(filterOptionButtonClass, selected && "bg-primary/10 text-primary")}
                  onClick={() => selectOption(option.value)}
                >
                  <span className="truncate">{option.label}</span>
                  {selected ? (
                    <Check className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden />
                  )}
                </button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function RangePresetChooser({
  value,
  onChange,
  tenureAvailable,
}: {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
  tenureAvailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const presets = rangePresets(tenureAvailable);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(filterTriggerClass, "text-highlighted")}
          aria-label="Time range"
        >
          <span className="min-w-0 flex-1 truncate">{RANGE_LABEL[value]}</span>
          <ChevronDown className="size-3 shrink-0 opacity-60" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-1">
        {presets.map((preset) => {
          const selected = preset === value;
          return (
            <button
              key={preset}
              type="button"
              className={cn(
                filterOptionButtonClass,
                selected && "bg-primary/10 text-primary",
              )}
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
            >
              <span className="truncate">{RANGE_LABEL[preset]}</span>
              {selected ? (
                <Check className="size-3.5 shrink-0" aria-hidden />
              ) : (
                <span className="size-3.5 shrink-0" aria-hidden />
              )}
            </button>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}

export function AgencyDashboardCommandBar({
  rangePreset,
  onRangePresetChange,
  customFromDate,
  onCustomFromChange,
  customToDate,
  onCustomToChange,
  clientId = "",
  onClientChange,
  clients,
  clientsLoading,
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
  trailingActions,
}: AgencyDashboardCommandBarProps) {
  const showClientFilter = Boolean(onClientChange && clients);

  const hasActiveFilters =
    rangePreset !== defaultRangePreset ||
    clientId !== "" ||
    projectId !== "" ||
    memberUserId !== "";

  const memberOptions = members.map((member) => ({
    userId: member.userId,
    userName: member.userName,
    userAvatar: member.avatar ?? null,
  }));

  return (
    <div className={agencyCommandBarShellClass}>
      {showClientFilter ? (
        <FilterOptionChooser
          label="Client"
          value={clientId}
          onChange={onClientChange!}
          emptyLabel="All Clients"
          searchPlaceholder="Search clients"
          disabled={clientsLoading}
          loading={clientsLoading}
          options={clients!.map((client) => ({
            value: client.id,
            label: client.name,
          }))}
        />
      ) : null}
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
      <RangePresetChooser
        value={rangePreset}
        onChange={onRangePresetChange}
        tenureAvailable={tenureAvailable}
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

      <AgencyCommandBarActions>
        <Button variant="secondary" size="sm" disabled={!hasPendingChanges} onClick={onApply}>
          Apply
        </Button>
        {hasActiveFilters ? <AgencyCommandBarResetButton onClick={onReset} /> : null}
        {trailingActions}
      </AgencyCommandBarActions>
    </div>
  );
}
