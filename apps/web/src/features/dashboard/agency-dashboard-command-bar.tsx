import { Check, ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  AgencyCommandBarActions,
  AgencyCommandBarResetButton,
  agencyCommandBarFilterTriggerClass,
  agencyCommandBarShellClass,
} from "@/features/shared/command-bar/agency-command-bar-ui";
import {
  AgencyMultiSelectFilter,
  type AgencyFilterOptionGroup,
} from "@/features/shared/filters/agency-multi-select-filter";
import { Button } from "@/ui/button";
import { Input } from "@/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/ui/popover";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  isAgencyReportFieldId,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import { cn } from "@/lib/utils";

export type RangePreset = "tenure" | "today" | "week" | "month" | "last30" | "custom";

export const RANGE_LABEL: Record<RangePreset, string> = {
  tenure: "Tenure",
  today: "Today",
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  custom: "Custom",
};

export function rangePresetLabel(preset: RangePreset, tenurePeriodLabel?: string | null): string {
  if (preset === "tenure") {
    return tenurePeriodLabel?.trim() || RANGE_LABEL.tenure;
  }
  return RANGE_LABEL[preset];
}

export function rangePresets(tenureAvailable: boolean): RangePreset[] {
  // Tenure supersedes "This month" — never offer both.
  return tenureAvailable
    ? ["tenure", "today", "week", "last30", "custom"]
    : ["today", "week", "month", "last30", "custom"];
}

const filterTriggerClass = agencyCommandBarFilterTriggerClass;

const filterOptionButtonClass = cn(
  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

type AgencyDashboardCommandBarProps = {
  rangePreset: RangePreset;
  onRangePresetChange: (preset: RangePreset) => void;
  customFromDate: string;
  onCustomFromChange: (value: string) => void;
  customToDate: string;
  onCustomToChange: (value: string) => void;
  clients?: Array<{ id: string; name: string }>;
  clientsLoading?: boolean;
  clientIds?: string[];
  onClientIdsChange?: (clientIds: string[]) => void;
  projectIds: string[];
  onProjectIdsChange: (projectIds: string[]) => void;
  memberUserIds: string[];
  onMemberUserIdsChange: (memberUserIds: string[]) => void;
  projectFilterGroups: AgencyFilterOptionGroup[];
  onApply: () => void;
  hasPendingChanges: boolean;
  onReset: () => void;
  defaultRangePreset: RangePreset;
  tenureAvailable: boolean;
  tenurePeriodLabel?: string | null;
  members: Array<{ userId: string; userName: string; avatar?: string | null }>;
  projectsLoading?: boolean;
  fieldIds?: AgencyReportFieldId[];
  onFieldIdsChange?: (fieldIds: AgencyReportFieldId[]) => void;
  defaultFieldIds?: AgencyReportFieldId[];
  trailingActions?: ReactNode;
  shellClassName?: string;
};

function RangePresetChooser({
  value,
  onChange,
  tenureAvailable,
  tenurePeriodLabel,
}: {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
  tenureAvailable: boolean;
  tenurePeriodLabel?: string | null;
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
          <span className="min-w-0 flex-1 truncate">
            {rangePresetLabel(value, tenurePeriodLabel)}
          </span>
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
              className={cn(filterOptionButtonClass, selected && "bg-primary/10 text-primary")}
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
            >
              <span className="truncate">{rangePresetLabel(preset, tenurePeriodLabel)}</span>
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
  clients,
  clientsLoading,
  clientIds = [],
  onClientIdsChange,
  projectIds,
  onProjectIdsChange,
  memberUserIds,
  onMemberUserIdsChange,
  projectFilterGroups,
  onApply,
  hasPendingChanges,
  onReset,
  defaultRangePreset,
  tenureAvailable,
  tenurePeriodLabel = null,
  members,
  projectsLoading,
  fieldIds,
  onFieldIdsChange,
  defaultFieldIds = allAgencyReportFieldIds(),
  trailingActions,
  shellClassName,
}: AgencyDashboardCommandBarProps) {
  const showClientFilter = Boolean(clients && onClientIdsChange);
  const showFieldsFilter = Boolean(onFieldIdsChange && fieldIds);

  const hasActiveFilters = Boolean(
    rangePreset !== defaultRangePreset ||
    clientIds.length > 0 ||
    projectIds.length > 0 ||
    memberUserIds.length > 0 ||
    (showFieldsFilter && fieldIds && !areSameReportFieldSets(fieldIds, defaultFieldIds)),
  );

  const clientOptions = clients?.map((client) => ({ value: client.id, label: client.name })) ?? [];
  const memberSelectOptions = members.map((member) => ({
    value: member.userId,
    label: member.userName,
  }));

  return (
    <div className={cn(agencyCommandBarShellClass, shellClassName)}>
      {showClientFilter ? (
        <AgencyMultiSelectFilter
          label="All Clients"
          values={clientIds}
          options={clientOptions}
          onValuesChange={onClientIdsChange!}
          disabled={clientsLoading}
          searchPlaceholder="Search clients"
        />
      ) : null}
      <AgencyMultiSelectFilter
        label="All Projects"
        values={projectIds}
        groups={projectFilterGroups}
        onValuesChange={onProjectIdsChange}
        disabled={projectsLoading}
        searchPlaceholder="Search projects or clients"
      />
      <AgencyMultiSelectFilter
        label="Team"
        values={memberUserIds}
        options={memberSelectOptions}
        onValuesChange={onMemberUserIdsChange}
        searchPlaceholder="Search users or groups"
      />
      {showFieldsFilter ? (
        <AgencyMultiSelectFilter
          label="Fields"
          values={fieldIds!}
          options={defaultFieldIds.map((field) => ({
            value: field,
            label: AGENCY_REPORT_FIELD_LABELS[field],
          }))}
          onValuesChange={(values) => {
            const next = values.filter(isAgencyReportFieldId);
            onFieldIdsChange!(next.length > 0 ? next : defaultFieldIds);
          }}
          searchPlaceholder="Search fields"
        />
      ) : null}
      <RangePresetChooser
        value={rangePreset}
        onChange={onRangePresetChange}
        tenureAvailable={tenureAvailable}
        tenurePeriodLabel={tenurePeriodLabel}
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
