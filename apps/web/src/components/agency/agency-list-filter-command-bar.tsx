import { Search } from "lucide-react";
import type { ReactNode } from "react";

import {
  AgencyCommandBarActions,
  AgencyCommandBarResetButton,
  agencyCommandBarShellClass,
} from "@/components/agency/agency-command-bar-ui";
import {
  AgencyMultiSelectFilter,
  type AgencyFilterOptionGroup,
} from "@/components/agency/agency-multi-select-filter";
import { Input } from "@/components/ui/input";
import { agencyInputPlaceholderClass } from "@/lib/utils/agency-ui";
import { cn } from "@/lib/utils";

type AgencyListFilterCommandBarProps = {
  searchPlaceholder: string;
  filterTerm: string;
  onFilterTermChange: (value: string) => void;
  selectedPeopleIds: string[];
  onSelectedPeopleIdsChange: (values: string[]) => void;
  selectedClientIds: string[];
  onSelectedClientIdsChange: (values: string[]) => void;
  selectedProjectIds: string[];
  onSelectedProjectIdsChange: (values: string[]) => void;
  selectedTaskIds: string[];
  onSelectedTaskIdsChange: (values: string[]) => void;
  peopleOptions: Array<{ value: string; label: string }>;
  clientOptions: Array<{ value: string; label: string }>;
  projectFilterGroups: AgencyFilterOptionGroup[];
  taskFilterGroups: AgencyFilterOptionGroup[];
  peopleLoading?: boolean;
  clientsLoading?: boolean;
  projectsLoading?: boolean;
  tasksLoading?: boolean;
  hasActiveFilters?: boolean;
  onReset?: () => void;
  trailingActions?: ReactNode;
};

export function AgencyListFilterCommandBar({
  searchPlaceholder,
  filterTerm,
  onFilterTermChange,
  selectedPeopleIds,
  onSelectedPeopleIdsChange,
  selectedClientIds,
  onSelectedClientIdsChange,
  selectedProjectIds,
  onSelectedProjectIdsChange,
  selectedTaskIds,
  onSelectedTaskIdsChange,
  peopleOptions,
  clientOptions,
  projectFilterGroups,
  taskFilterGroups,
  peopleLoading,
  clientsLoading,
  projectsLoading,
  tasksLoading,
  hasActiveFilters = false,
  onReset,
  trailingActions,
}: AgencyListFilterCommandBarProps) {
  return (
    <div className={agencyCommandBarShellClass}>
      <div className="relative min-w-64 flex-1 md:max-w-72">
        <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted" />
        <Input
          value={filterTerm}
          onChange={(event) => onFilterTermChange(event.target.value)}
          placeholder={searchPlaceholder}
          className={cn(
            "h-9 rounded-xl border-default bg-default pl-9 text-sm",
            agencyInputPlaceholderClass,
            filterTerm.trim() ? "text-highlighted" : undefined,
          )}
        />
      </div>

      <AgencyMultiSelectFilter
        label="All People"
        values={selectedPeopleIds}
        options={peopleOptions}
        onValuesChange={onSelectedPeopleIdsChange}
        disabled={peopleLoading}
        searchPlaceholder="Search people"
      />
      <AgencyMultiSelectFilter
        label="All Clients"
        values={selectedClientIds}
        options={clientOptions}
        onValuesChange={onSelectedClientIdsChange}
        disabled={clientsLoading}
        searchPlaceholder="Search clients"
      />
      <AgencyMultiSelectFilter
        label="All Projects"
        values={selectedProjectIds}
        groups={projectFilterGroups}
        onValuesChange={onSelectedProjectIdsChange}
        disabled={projectsLoading}
        searchPlaceholder="Search projects or clients"
      />
      <AgencyMultiSelectFilter
        label="All Tasks"
        values={selectedTaskIds}
        groups={taskFilterGroups}
        onValuesChange={onSelectedTaskIdsChange}
        disabled={tasksLoading}
        searchPlaceholder="Search tasks, projects, or clients"
      />

      <AgencyCommandBarActions>
        {hasActiveFilters && onReset ? <AgencyCommandBarResetButton onClick={onReset} /> : null}
        {trailingActions}
      </AgencyCommandBarActions>
    </div>
  );
}
