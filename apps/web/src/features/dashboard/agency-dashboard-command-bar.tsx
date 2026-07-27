import { Check, ChevronDown, MoreHorizontal } from "lucide-react";
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
import { Checkbox } from "@/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/ui/dropdown-menu";
import { Input } from "@/ui/input";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  isAgencyReportFieldId,
  type AgencyReportFieldId,
} from "@/features/reports/agency-report-fields";
import {
  AGENCY_REPORT_SHOW_WASTE_LABELS,
  AGENCY_REPORT_SHOW_WASTE_SOURCES,
  areSameShowWaste,
  DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  type AgencyReportShowWaste,
  type AgencyReportShowWasteSource,
} from "@/features/reports/agency-report-show-waste";
import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";
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
  tenureQuarterLabel?: string | null;
  tenureQuarterMonths?: TenureQuarterMonth[];
  tenureMonthIndexes?: number[];
  onTenureMonthIndexesChange?: (monthIndexes: number[]) => void;
  members: Array<{ userId: string; userName: string; avatar?: string | null }>;
  projectsLoading?: boolean;
  fieldIds?: AgencyReportFieldId[];
  onFieldIdsChange?: (fieldIds: AgencyReportFieldId[]) => void;
  defaultFieldIds?: AgencyReportFieldId[];
  showWaste?: AgencyReportShowWaste;
  onShowWasteChange?: (showWaste: AgencyReportShowWaste) => void;
  trailingActions?: ReactNode;
  shellClassName?: string;
};

function normalizeTenureMonthIndexes(next: number[]): number[] {
  const unique = [...new Set(next)]
    .filter((index): index is 0 | 1 | 2 => index === 0 || index === 1 || index === 2)
    .sort((left, right) => left - right);
  return unique.length === 3 ? [] : unique;
}

function RangePresetChooser({
  value,
  onChange,
  tenureAvailable,
  tenurePeriodLabel,
  tenureQuarterLabel,
  tenureQuarterMonths,
  tenureMonthIndexes,
  onTenureMonthIndexesChange,
}: {
  value: RangePreset;
  onChange: (preset: RangePreset) => void;
  tenureAvailable: boolean;
  tenurePeriodLabel?: string | null;
  tenureQuarterLabel?: string | null;
  tenureQuarterMonths: TenureQuarterMonth[];
  tenureMonthIndexes: number[];
  onTenureMonthIndexesChange: (monthIndexes: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const presets = rangePresets(tenureAvailable);
  const allQuarterSelected = tenureMonthIndexes.length === 0;

  function selectTenureMonths(next: number[]) {
    onTenureMonthIndexesChange(normalizeTenureMonthIndexes(next));
    onChange("tenure");
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
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
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-48 p-1">
        {presets.map((preset) => {
          const selected = preset === value;

          if (preset === "tenure") {
            return (
              <DropdownMenuSub key={preset}>
                <DropdownMenuSubTrigger
                  className={cn(
                    filterOptionButtonClass,
                    "data-open:bg-default/80",
                    selected && "bg-primary/10 text-primary data-open:bg-primary/10",
                  )}
                  onClick={() => {
                    selectTenureMonths([]);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">
                    {rangePresetLabel(preset, tenureQuarterLabel ?? tenurePeriodLabel)}
                  </span>
                  {selected ? (
                    <Check className="size-3.5 shrink-0" aria-hidden />
                  ) : (
                    <span className="size-3.5 shrink-0" aria-hidden />
                  )}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="w-44 p-1" sideOffset={6}>
                  <div
                    className="flex flex-col gap-0.5"
                    onPointerDown={(event) => event.preventDefault()}
                  >
                    <RadioGroup
                      value={allQuarterSelected ? "all" : ""}
                      onValueChange={(next) => {
                        if (next === "all") selectTenureMonths([]);
                      }}
                      className="gap-0.5"
                    >
                      <label
                        className={cn(
                          filterOptionButtonClass,
                          "justify-start gap-2.5",
                          allQuarterSelected && "bg-primary/10 text-primary",
                        )}
                      >
                        <RadioGroupItem value="all" className="size-3.5" aria-label="All Quarter" />
                        <span className="min-w-0 flex-1 truncate">All Quarter</span>
                      </label>
                    </RadioGroup>

                    {tenureQuarterMonths.map((month) => {
                      const checked = tenureMonthIndexes.includes(month.index);
                      return (
                        <label
                          key={month.index}
                          className={cn(
                            filterOptionButtonClass,
                            "justify-start gap-2.5",
                            checked && "bg-primary/10 text-primary",
                          )}
                        >
                          <Checkbox
                            checked={checked}
                            className="size-3.5"
                            aria-label={month.label}
                            onCheckedChange={(next) => {
                              const enabled = next === true;
                              selectTenureMonths(
                                enabled
                                  ? [...tenureMonthIndexes, month.index]
                                  : tenureMonthIndexes.filter((index) => index !== month.index),
                              );
                            }}
                          />
                          <span className="min-w-0 flex-1 truncate">{month.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            );
          }

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
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ReportsOptionsMenu({
  fieldIds,
  onFieldIdsChange,
  defaultFieldIds,
  showWaste,
  onShowWasteChange,
}: {
  fieldIds: AgencyReportFieldId[];
  onFieldIdsChange: (fieldIds: AgencyReportFieldId[]) => void;
  defaultFieldIds: AgencyReportFieldId[];
  showWaste: AgencyReportShowWaste;
  onShowWasteChange: (showWaste: AgencyReportShowWaste) => void;
}) {
  const allFieldsSelected = areSameReportFieldSets(fieldIds, defaultFieldIds);
  const allWasteSelected = AGENCY_REPORT_SHOW_WASTE_SOURCES.every((source) => showWaste[source]);

  function toggleField(field: AgencyReportFieldId, enabled: boolean) {
    const next = enabled
      ? [...new Set([...fieldIds, field])]
      : fieldIds.filter((value) => value !== field);
    const normalized = next.filter(isAgencyReportFieldId);
    onFieldIdsChange(normalized.length > 0 ? normalized : defaultFieldIds);
  }

  function selectAllFields() {
    onFieldIdsChange(defaultFieldIds);
  }

  function toggleShowWaste(source: AgencyReportShowWasteSource, enabled: boolean) {
    onShowWasteChange({ ...showWaste, [source]: enabled });
  }

  function selectAllWaste() {
    onShowWasteChange({
      projects: true,
      tasks: true,
      entries: true,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="px-2.5"
          aria-label="Report options"
          title="Report options"
        >
          <MoreHorizontal className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 p-1">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(filterOptionButtonClass, "data-open:bg-default/80")}
          >
            <span className="min-w-0 flex-1 truncate">Fields</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44 p-1" sideOffset={6}>
            <div
              className="flex flex-col gap-0.5"
              onPointerDown={(event) => event.preventDefault()}
            >
              <RadioGroup
                value={allFieldsSelected ? "all" : ""}
                onValueChange={(next) => {
                  if (next === "all") selectAllFields();
                }}
                className="gap-0.5"
              >
                <label
                  className={cn(
                    filterOptionButtonClass,
                    "justify-start gap-2.5",
                    allFieldsSelected && "bg-primary/10 text-primary",
                  )}
                >
                  <RadioGroupItem value="all" className="size-3.5" aria-label="Select all fields" />
                  <span className="min-w-0 flex-1 truncate">Select all</span>
                </label>
              </RadioGroup>

              {defaultFieldIds.map((field) => {
                const checked = fieldIds.includes(field);
                return (
                  <label
                    key={field}
                    className={cn(
                      filterOptionButtonClass,
                      "justify-start gap-2.5",
                      checked && "bg-primary/10 text-primary",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      className="size-3.5"
                      aria-label={AGENCY_REPORT_FIELD_LABELS[field]}
                      onCheckedChange={(next) => toggleField(field, next === true)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {AGENCY_REPORT_FIELD_LABELS[field]}
                    </span>
                  </label>
                );
              })}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger
            className={cn(filterOptionButtonClass, "data-open:bg-default/80")}
          >
            <span className="min-w-0 flex-1 truncate">Show waste</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="w-44 p-1" sideOffset={6}>
            <div
              className="flex flex-col gap-0.5"
              onPointerDown={(event) => event.preventDefault()}
            >
              <RadioGroup
                value={allWasteSelected ? "all" : ""}
                onValueChange={(next) => {
                  if (next === "all") selectAllWaste();
                }}
                className="gap-0.5"
              >
                <label
                  className={cn(
                    filterOptionButtonClass,
                    "justify-start gap-2.5",
                    allWasteSelected && "bg-primary/10 text-primary",
                  )}
                >
                  <RadioGroupItem value="all" className="size-3.5" aria-label="Select all waste" />
                  <span className="min-w-0 flex-1 truncate">Select all</span>
                </label>
              </RadioGroup>

              {AGENCY_REPORT_SHOW_WASTE_SOURCES.map((source) => {
                const checked = showWaste[source];
                return (
                  <label
                    key={source}
                    className={cn(
                      filterOptionButtonClass,
                      "justify-start gap-2.5",
                      checked && "bg-primary/10 text-primary",
                    )}
                  >
                    <Checkbox
                      checked={checked}
                      className="size-3.5"
                      aria-label={AGENCY_REPORT_SHOW_WASTE_LABELS[source]}
                      onCheckedChange={(next) => toggleShowWaste(source, next === true)}
                    />
                    <span className="min-w-0 flex-1 truncate">
                      {AGENCY_REPORT_SHOW_WASTE_LABELS[source]}
                    </span>
                  </label>
                );
              })}
            </div>
          </DropdownMenuSubContent>
        </DropdownMenuSub>
      </DropdownMenuContent>
    </DropdownMenu>
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
  tenureQuarterLabel = null,
  tenureQuarterMonths = [],
  tenureMonthIndexes = [],
  onTenureMonthIndexesChange,
  members,
  projectsLoading,
  fieldIds,
  onFieldIdsChange,
  defaultFieldIds = allAgencyReportFieldIds(),
  showWaste = DEFAULT_AGENCY_REPORT_SHOW_WASTE,
  onShowWasteChange,
  trailingActions,
  shellClassName,
}: AgencyDashboardCommandBarProps) {
  const showClientFilter = Boolean(clients && onClientIdsChange);
  const showReportsOptions = Boolean(onFieldIdsChange && fieldIds && onShowWasteChange);

  const hasActiveFilters = Boolean(
    rangePreset !== defaultRangePreset ||
    tenureMonthIndexes.length > 0 ||
    clientIds.length > 0 ||
    projectIds.length > 0 ||
    memberUserIds.length > 0 ||
    (showReportsOptions && fieldIds && !areSameReportFieldSets(fieldIds, defaultFieldIds)) ||
    (showReportsOptions && !areSameShowWaste(showWaste, DEFAULT_AGENCY_REPORT_SHOW_WASTE)),
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
      <RangePresetChooser
        value={rangePreset}
        onChange={onRangePresetChange}
        tenureAvailable={tenureAvailable}
        tenurePeriodLabel={tenurePeriodLabel}
        tenureQuarterLabel={tenureQuarterLabel}
        tenureQuarterMonths={tenureQuarterMonths}
        tenureMonthIndexes={tenureMonthIndexes}
        onTenureMonthIndexesChange={onTenureMonthIndexesChange ?? (() => undefined)}
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
        {showReportsOptions ? (
          <ReportsOptionsMenu
            fieldIds={fieldIds!}
            onFieldIdsChange={onFieldIdsChange!}
            defaultFieldIds={defaultFieldIds}
            showWaste={showWaste}
            onShowWasteChange={onShowWasteChange!}
          />
        ) : null}
        <Button variant="secondary" size="sm" disabled={!hasPendingChanges} onClick={onApply}>
          Apply
        </Button>
        {hasActiveFilters ? <AgencyCommandBarResetButton onClick={onReset} /> : null}
        {trailingActions}
      </AgencyCommandBarActions>
    </div>
  );
}
