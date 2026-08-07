import { MoreVertical } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import {
  AgencyCommandBarActions,
  AgencyCommandBarResetButton,
  agencyCommandBarShellClass,
} from "@/features/shared/command-bar/agency-command-bar-ui";
import {
  AgencyMultiSelectFilter,
  type AgencyFilterOptionGroup,
} from "@/features/shared/filters/agency-multi-select-filter";
import { MemberProfileLeaveRangePicker } from "@/features/shared/date/member-profile-leave-range-picker";
import { agencyFocusRingClass } from "@/features/shared/agency-ui";
import {
  RangePresetChooser,
  type RangePreset,
} from "@/features/shared/command-bar/range-preset-chooser";
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
import {
  AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL,
  DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES,
} from "@/features/reports/agency-report-merge-tasks";
import type { TenureQuarterMonth } from "@/features/resourcing/tenure-utils";
import { cn } from "@/lib/utils";

const filterOptionButtonClass = cn(
  "flex w-full items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-left text-xs font-semibold transition-colors hover:bg-default/80",
  agencyFocusRingClass,
  "motion-reduce:transition-none",
);

export { RangePresetChooser };
export type { RangePreset };
export { rangePresetLabel, rangePresets } from "@/features/shared/command-bar/range-preset-chooser";

type AgencyTimeRangeCommandBarProps = {
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
  mergeSameTaskNames?: boolean;
  onMergeSameTaskNamesChange?: (mergeSameTaskNames: boolean) => void;
  trailingActions?: ReactNode;
  shellClassName?: string;
};

function ReportsOptionsMenu({
  fieldIds,
  onFieldIdsChange,
  defaultFieldIds,
  showWaste,
  onShowWasteChange,
  mergeSameTaskNames,
  onMergeSameTaskNamesChange,
}: {
  fieldIds: AgencyReportFieldId[];
  onFieldIdsChange: (fieldIds: AgencyReportFieldId[]) => void;
  defaultFieldIds: AgencyReportFieldId[];
  showWaste: AgencyReportShowWaste;
  onShowWasteChange: (showWaste: AgencyReportShowWaste) => void;
  mergeSameTaskNames: boolean;
  onMergeSameTaskNamesChange: (mergeSameTaskNames: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const allFieldsSelected = areSameReportFieldSets(fieldIds, defaultFieldIds);
  const someFieldsSelected = fieldIds.length > 0 && !allFieldsSelected;
  const allWasteSelected = AGENCY_REPORT_SHOW_WASTE_SOURCES.every((source) => showWaste[source]);
  const someWasteSelected =
    !allWasteSelected && AGENCY_REPORT_SHOW_WASTE_SOURCES.some((source) => showWaste[source]);

  function toggleField(field: AgencyReportFieldId, enabled: boolean) {
    const next = enabled
      ? [...new Set([...fieldIds, field])]
      : fieldIds.filter((value) => value !== field);
    onFieldIdsChange(next.filter(isAgencyReportFieldId));
  }

  function toggleAllFields(enabled: boolean) {
    onFieldIdsChange(enabled ? defaultFieldIds : []);
  }

  function toggleShowWaste(source: AgencyReportShowWasteSource, enabled: boolean) {
    onShowWasteChange({ ...showWaste, [source]: enabled });
  }

  function toggleAllWaste(enabled: boolean) {
    onShowWasteChange({
      projects: enabled,
      tasks: enabled,
      entries: enabled,
    });
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen} modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="px-2.5"
          aria-label="Report options"
          title="Report options"
        >
          <MoreVertical className="size-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52 p-1">
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
              <label
                className={cn(
                  filterOptionButtonClass,
                  "justify-start gap-2.5",
                  allFieldsSelected && "bg-primary/10 text-primary",
                )}
              >
                <Checkbox
                  checked={someFieldsSelected ? "indeterminate" : allFieldsSelected}
                  className="size-3.5"
                  aria-label="Select all fields"
                  onCheckedChange={(next) => toggleAllFields(next === true)}
                />
                <span className="min-w-0 flex-1 truncate">Select all</span>
              </label>

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
              <label
                className={cn(
                  filterOptionButtonClass,
                  "justify-start gap-2.5",
                  allWasteSelected && "bg-primary/10 text-primary",
                )}
              >
                <Checkbox
                  checked={someWasteSelected ? "indeterminate" : allWasteSelected}
                  className="size-3.5"
                  aria-label="Select all waste"
                  onCheckedChange={(next) => toggleAllWaste(next === true)}
                />
                <span className="min-w-0 flex-1 truncate">Select all</span>
              </label>

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

        <label
          className={cn(
            filterOptionButtonClass,
            "justify-start gap-2.5",
            mergeSameTaskNames && "bg-primary/10 text-primary",
          )}
          onPointerDown={(event) => event.preventDefault()}
        >
          <Checkbox
            checked={mergeSameTaskNames}
            className="size-3.5"
            aria-label={AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL}
            onCheckedChange={(next) => onMergeSameTaskNamesChange(next === true)}
          />
          <span className="min-w-0 flex-1 truncate">
            {AGENCY_REPORT_MERGE_SAME_TASK_NAMES_LABEL}
          </span>
        </label>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AgencyTimeRangeCommandBar({
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
  mergeSameTaskNames = DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES,
  onMergeSameTaskNamesChange,
  trailingActions,
  shellClassName,
}: AgencyTimeRangeCommandBarProps) {
  const showClientFilter = Boolean(clients && onClientIdsChange);
  const showReportsOptions = Boolean(
    onFieldIdsChange && fieldIds && onShowWasteChange && onMergeSameTaskNamesChange,
  );
  const [applyPulse, setApplyPulse] = useState(false);

  useEffect(() => {
    if (!applyPulse) return;
    const timer = window.setTimeout(() => setApplyPulse(false), 220);
    return () => window.clearTimeout(timer);
  }, [applyPulse]);

  function handleApplyClick() {
    onApply();
    setApplyPulse(true);
  }

  const hasActiveFilters = Boolean(
    rangePreset !== defaultRangePreset ||
    tenureMonthIndexes.length > 0 ||
    clientIds.length > 0 ||
    projectIds.length > 0 ||
    memberUserIds.length > 0 ||
    (showReportsOptions && fieldIds && !areSameReportFieldSets(fieldIds, defaultFieldIds)) ||
    (showReportsOptions && !areSameShowWaste(showWaste, DEFAULT_AGENCY_REPORT_SHOW_WASTE)) ||
    (showReportsOptions && mergeSameTaskNames !== DEFAULT_AGENCY_REPORT_MERGE_SAME_TASK_NAMES),
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
        <MemberProfileLeaveRangePicker
          triggerId="agency-dashboard-custom-range"
          startDate={customFromDate}
          endDate={customToDate}
          emptyLabel="Select dates"
          ariaLabel="Custom date range"
          triggerClassName="h-9 min-h-9 w-auto max-w-[22rem] py-1.5 text-xs font-semibold"
          onRangeChange={(next) => {
            onCustomFromChange(next.startDate);
            onCustomToChange(next.endDate);
          }}
        />
      ) : null}

      <AgencyCommandBarActions>
        {showReportsOptions ? (
          <ReportsOptionsMenu
            fieldIds={fieldIds!}
            onFieldIdsChange={onFieldIdsChange!}
            defaultFieldIds={defaultFieldIds}
            showWaste={showWaste}
            onShowWasteChange={onShowWasteChange!}
            mergeSameTaskNames={mergeSameTaskNames}
            onMergeSameTaskNamesChange={onMergeSameTaskNamesChange!}
          />
        ) : null}
        <Button
          variant="secondary"
          size="sm"
          disabled={!hasPendingChanges}
          onClick={handleApplyClick}
          className={cn(
            "transition-[box-shadow,transform] duration-200 ease-out motion-reduce:transition-none",
            applyPulse && "shadow-[0_0_0_3px_oklch(0.488_0.243_264.376_/_0.22)]",
          )}
        >
          Apply
        </Button>
        {hasActiveFilters ? <AgencyCommandBarResetButton onClick={onReset} /> : null}
        {trailingActions}
      </AgencyCommandBarActions>
    </div>
  );
}
