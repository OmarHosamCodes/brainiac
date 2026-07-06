import { Check, ChevronDown, Search } from "lucide-react";
import { useMemo, useState, type ComponentProps, type ReactNode } from "react";

import { AgencyMemberChooser } from "@/components/agency/agency-member-chooser";
import { AgencyProjectChooser } from "@/components/agency/agency-project-chooser";
import {
  AgencyCommandBarActions,
  AgencyCommandBarResetButton,
  agencyCommandBarFilterTriggerClass,
  agencyCommandBarShellClass,
} from "@/components/agency/agency-command-bar-ui";
import { AgencyMultiSelectFilter } from "@/components/agency/agency-multi-select-filter";
import { Button } from "@/components/ui/button";
import {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  SavedReportsListBody,
  SavedReportsListSkeleton,
  useSavedReportsList,
} from "@/lib/agency/reports/agency-saved-reports-list";
import type { SavedReportSearchContext } from "@/lib/agency/reports/agency-report-naming";
import { agencyFocusRingClass, agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import {
  AGENCY_REPORT_FIELD_LABELS,
  allAgencyReportFieldIds,
  areSameReportFieldSets,
  isAgencyReportFieldId,
  type AgencyReportFieldId,
} from "@/lib/agency/reports/agency-report-fields";
import { cn } from "@/lib/utils";

export type RangePreset = "tenure" | "week" | "month" | "last30" | "custom";

export const RANGE_LABEL: Record<RangePreset, string> = {
  tenure: "Tenure period",
  week: "This week",
  month: "This month",
  last30: "Last 30 days",
  custom: "Custom",
};

const RANGE_TOOLTIP: Record<RangePreset, string> = {
  tenure: "Use the active tenure policy window.",
  week: "Monday through today.",
  month: "First of the month through today.",
  last30: "Rolling 30-day window ending today.",
  custom: "Pick explicit start and end dates.",
};

const FIELD_TOOLTIP: Record<AgencyReportFieldId, string> = {
  project: "Show the project name column.",
  task: "Show the linked task column.",
  description: "Show the entry description column.",
  duration: "Show the time spent column.",
  assignee: "Show the assigned member column.",
};

function MenuItemWithTooltip({
  tooltip,
  children,
  ...props
}: { tooltip: string; children: ReactNode } & ComponentProps<typeof ContextMenuItem>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ContextMenuItem {...props}>{children}</ContextMenuItem>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function SubTriggerWithTooltip({
  tooltip,
  children,
  ...props
}: { tooltip: string; children: ReactNode } & ComponentProps<typeof ContextMenuSubTrigger>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ContextMenuSubTrigger {...props}>{children}</ContextMenuSubTrigger>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function CheckboxItemWithTooltip({
  tooltip,
  children,
  ...props
}: { tooltip: string; children: ReactNode } & ComponentProps<typeof ContextMenuCheckboxItem>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ContextMenuCheckboxItem {...props}>{children}</ContextMenuCheckboxItem>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

function RadioItemWithTooltip({
  tooltip,
  children,
  ...props
}: { tooltip: string; children: ReactNode } & ComponentProps<typeof ContextMenuRadioItem>) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <ContextMenuRadioItem {...props}>{children}</ContextMenuRadioItem>
      </TooltipTrigger>
      <TooltipContent side="right">{tooltip}</TooltipContent>
    </Tooltip>
  );
}

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
  fieldIds?: AgencyReportFieldId[];
  onFieldIdsChange?: (fieldIds: AgencyReportFieldId[]) => void;
  defaultFieldIds?: AgencyReportFieldId[];
  trailingActions?: ReactNode;
  createReportAction?: {
    onSelect: () => void;
    disabled?: boolean;
  };
  historyMenu?: {
    teamId: string;
    searchContext: SavedReportSearchContext;
    onSelectReport: (reportId: string) => void;
  };
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

type AgencyDashboardCommandBarMenuProps = {
  rangePreset: RangePreset;
  onRangePresetChange: (preset: RangePreset) => void;
  clientId?: string;
  onClientChange?: (clientId: string) => void;
  clients?: Array<{ id: string; name: string }>;
  projectId: string;
  onProjectChange: (projectId: string) => void;
  memberUserId: string;
  onMemberChange: (memberUserId: string) => void;
  onApply: () => void;
  hasPendingChanges: boolean;
  onReset: () => void;
  tenureAvailable: boolean;
  projects: Array<{ id: string; name: string; clientName: string }>;
  fieldIds?: AgencyReportFieldId[];
  onFieldIdsChange?: (fieldIds: AgencyReportFieldId[]) => void;
  defaultFieldIds?: AgencyReportFieldId[];
  showClientFilter: boolean;
  showFieldsFilter: boolean;
  hasActiveFilters: boolean;
  memberOptions: Array<{ userId: string; userName: string; userAvatar: string | null }>;
  createReportAction?: AgencyDashboardCommandBarProps["createReportAction"];
  historyMenu?: AgencyDashboardCommandBarProps["historyMenu"];
};

function AgencyDashboardCommandBarMenu({
  rangePreset,
  onRangePresetChange,
  clientId = "",
  onClientChange,
  clients,
  projectId,
  onProjectChange,
  memberUserId,
  onMemberChange,
  onApply,
  hasPendingChanges,
  onReset,
  tenureAvailable,
  projects,
  fieldIds,
  onFieldIdsChange,
  defaultFieldIds = allAgencyReportFieldIds(),
  showClientFilter,
  showFieldsFilter,
  hasActiveFilters,
  memberOptions,
  createReportAction,
  historyMenu,
}: AgencyDashboardCommandBarMenuProps) {
  const [historyOpen, setHistoryOpen] = useState(false);
  const reportsQuery = useSavedReportsList({
    teamId: historyMenu?.teamId ?? "",
    enabled: historyOpen && Boolean(historyMenu?.teamId),
  });
  const selectedFields = new Set(fieldIds ?? []);
  const presets = rangePresets(tenureAvailable);
  const selectedClientLabel =
    clients?.find((client) => client.id === clientId)?.name ?? "All Clients";
  const selectedProjectLabel =
    projects.find((project) => project.id === projectId)?.name ?? "All Projects";
  const selectedMemberLabel =
    memberOptions.find((member) => member.userId === memberUserId)?.userName ?? "Team";

  function toggleField(field: AgencyReportFieldId) {
    if (!onFieldIdsChange || !fieldIds) return;
    const next = selectedFields.has(field)
      ? fieldIds.filter((entry) => entry !== field)
      : [...fieldIds, field];
    onFieldIdsChange(next.length > 0 ? next : defaultFieldIds);
  }

  return (
    <ContextMenuContent className="w-56">
      <TooltipProvider delayDuration={200}>
        <ContextMenuLabel>Filters</ContextMenuLabel>

        {showClientFilter ? (
          <ContextMenuSub>
            <SubTriggerWithTooltip tooltip="Limit results to a specific client.">
              Client
              <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                {selectedClientLabel}
              </span>
            </SubTriggerWithTooltip>
            <ContextMenuSubContent className="max-h-64 overflow-y-auto">
              <ContextMenuRadioGroup value={clientId} onValueChange={onClientChange}>
                <RadioItemWithTooltip value="" tooltip="Show work across every client.">
                  All Clients
                </RadioItemWithTooltip>
                {clients!.map((client) => (
                  <RadioItemWithTooltip
                    key={client.id}
                    value={client.id}
                    tooltip={`Show only ${client.name}.`}
                  >
                    {client.name}
                  </RadioItemWithTooltip>
                ))}
              </ContextMenuRadioGroup>
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}

        <ContextMenuSub>
          <SubTriggerWithTooltip tooltip="Limit results to a specific project.">
            Project
            <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
              {selectedProjectLabel}
            </span>
          </SubTriggerWithTooltip>
          <ContextMenuSubContent className="max-h-64 overflow-y-auto">
            <ContextMenuRadioGroup value={projectId} onValueChange={onProjectChange}>
              <RadioItemWithTooltip value="" tooltip="Show work across every project.">
                All Projects
              </RadioItemWithTooltip>
              {projects.map((project) => (
                <RadioItemWithTooltip
                  key={project.id}
                  value={project.id}
                  tooltip={`Show only ${project.name}.`}
                >
                  {project.name}
                </RadioItemWithTooltip>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSub>
          <SubTriggerWithTooltip tooltip="Limit results to a team member.">
            Team
            <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
              {selectedMemberLabel}
            </span>
          </SubTriggerWithTooltip>
          <ContextMenuSubContent className="max-h-64 overflow-y-auto">
            <ContextMenuRadioGroup value={memberUserId} onValueChange={onMemberChange}>
              <RadioItemWithTooltip value="" tooltip="Show every team member.">
                Team
              </RadioItemWithTooltip>
              {memberOptions.map((member) => (
                <RadioItemWithTooltip
                  key={member.userId}
                  value={member.userId}
                  tooltip={`Show only ${member.userName}.`}
                >
                  {member.userName}
                </RadioItemWithTooltip>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        {showFieldsFilter ? (
          <ContextMenuSub>
            <SubTriggerWithTooltip tooltip="Choose which columns appear in the report table.">
              Fields
              <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
                {fieldIds!.length === defaultFieldIds.length
                  ? "All fields"
                  : `${fieldIds!.length} selected`}
              </span>
            </SubTriggerWithTooltip>
            <ContextMenuSubContent className="max-h-64 overflow-y-auto">
              {defaultFieldIds.map((field) => (
                <CheckboxItemWithTooltip
                  key={field}
                  checked={selectedFields.has(field)}
                  onCheckedChange={() => toggleField(field)}
                  onSelect={(event) => event.preventDefault()}
                  tooltip={FIELD_TOOLTIP[field]}
                >
                  {AGENCY_REPORT_FIELD_LABELS[field]}
                </CheckboxItemWithTooltip>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}

        <ContextMenuSub>
          <SubTriggerWithTooltip tooltip="Set the reporting period.">
            Time range
            <span className="ml-auto truncate pl-2 text-xs text-muted-foreground">
              {RANGE_LABEL[rangePreset]}
            </span>
          </SubTriggerWithTooltip>
          <ContextMenuSubContent>
            <ContextMenuRadioGroup
              value={rangePreset}
              onValueChange={(value) => onRangePresetChange(value as RangePreset)}
            >
              {presets.map((preset) => (
                <RadioItemWithTooltip key={preset} value={preset} tooltip={RANGE_TOOLTIP[preset]}>
                  {RANGE_LABEL[preset]}
                </RadioItemWithTooltip>
              ))}
            </ContextMenuRadioGroup>
          </ContextMenuSubContent>
        </ContextMenuSub>

        <ContextMenuSeparator />

        <MenuItemWithTooltip
          disabled={!hasPendingChanges}
          onSelect={onApply}
          tooltip="Fetch data with the pending filter changes."
        >
          Apply
        </MenuItemWithTooltip>

        {hasActiveFilters ? (
          <MenuItemWithTooltip
            onSelect={onReset}
            tooltip="Restore default filter settings."
          >
            Reset
          </MenuItemWithTooltip>
        ) : null}

        {createReportAction ? (
          <MenuItemWithTooltip
            disabled={createReportAction.disabled}
            onSelect={createReportAction.onSelect}
            tooltip="Open the report builder with the current filters."
          >
            Create report
          </MenuItemWithTooltip>
        ) : null}

        {historyMenu ? (
          <ContextMenuSub onOpenChange={setHistoryOpen}>
            <SubTriggerWithTooltip tooltip="Open a saved report.">
              Reports
            </SubTriggerWithTooltip>
            <ContextMenuSubContent className="w-80 overflow-hidden p-0">
              {reportsQuery.isPending ? (
                <SavedReportsListSkeleton />
              ) : reportsQuery.isError ? (
                <ContextMenuItem disabled>Couldn't load reports.</ContextMenuItem>
              ) : (
                <SavedReportsListBody
                  items={reportsQuery.data?.items ?? []}
                  searchContext={historyMenu.searchContext}
                  onSelect={historyMenu.onSelectReport}
                  compact
                />
              )}
            </ContextMenuSubContent>
          </ContextMenuSub>
        ) : null}
      </TooltipProvider>
    </ContextMenuContent>
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
  fieldIds,
  onFieldIdsChange,
  defaultFieldIds = allAgencyReportFieldIds(),
  trailingActions,
  createReportAction,
  historyMenu,
}: AgencyDashboardCommandBarProps) {
  const showClientFilter = Boolean(onClientChange && clients);
  const showFieldsFilter = Boolean(onFieldIdsChange && fieldIds);

  const hasActiveFilters = Boolean(
    rangePreset !== defaultRangePreset ||
      clientId !== "" ||
      projectId !== "" ||
      memberUserId !== "" ||
      (showFieldsFilter &&
        fieldIds &&
        !areSameReportFieldSets(fieldIds, defaultFieldIds)),
  );

  const memberOptions = members.map((member) => ({
    userId: member.userId,
    userName: member.userName,
    userAvatar: member.avatar ?? null,
  }));

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
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
      </ContextMenuTrigger>
      <AgencyDashboardCommandBarMenu
        rangePreset={rangePreset}
        onRangePresetChange={onRangePresetChange}
        clientId={clientId}
        onClientChange={onClientChange}
        clients={clients}
        projectId={projectId}
        onProjectChange={onProjectChange}
        memberUserId={memberUserId}
        onMemberChange={onMemberChange}
        onApply={onApply}
        hasPendingChanges={hasPendingChanges}
        onReset={onReset}
        tenureAvailable={tenureAvailable}
        projects={projects}
        fieldIds={fieldIds}
        onFieldIdsChange={onFieldIdsChange}
        defaultFieldIds={defaultFieldIds}
        showClientFilter={showClientFilter}
        showFieldsFilter={showFieldsFilter}
        hasActiveFilters={hasActiveFilters}
        memberOptions={memberOptions}
        createReportAction={createReportAction}
        historyMenu={historyMenu}
      />
    </ContextMenu>
  );
}
