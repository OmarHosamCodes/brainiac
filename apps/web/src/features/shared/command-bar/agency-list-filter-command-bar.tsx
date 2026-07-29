import { Search } from "lucide-react";
import type { ReactNode } from "react";

import {
  AgencyCommandBarActions,
  AgencyCommandBarResetButton,
  agencyCommandBarShellClass,
} from "@/features/shared/command-bar/agency-command-bar-ui";
import {
  AgencyMultiSelectFilter,
  type AgencyFilterOptionGroup,
  type AgencyMultiSelectStatusFilter,
} from "@/features/shared/filters/agency-multi-select-filter";
import { Input } from "@/ui/input";
import { agencyInputPlaceholderClass } from "@/features/shared/agency-ui";
import type { AgencyClientArchiveFilter } from "@/features/shared/agency-client-archive-filter";
import type { AgencyProjectTrashFilter } from "@/features/shared/agency-project-trash-filter";
import { cn } from "@/lib/utils";

const ARCHIVE_STATUS_OPTIONS: AgencyMultiSelectStatusFilter["options"] = [
  { value: "all", label: "All" },
  { value: "nonarchived", label: "Active" },
  { value: "archived", label: "Archived" },
];

const TRASH_STATUS_OPTIONS: AgencyMultiSelectStatusFilter["options"] = [
  { value: "active", label: "Active" },
  { value: "trashed", label: "In trash" },
  { value: "all", label: "All" },
];

type AgencyListFilterCommandBarProps = {
  searchPlaceholder: string;
  filterTerm: string;
  onFilterTermChange: (value: string) => void;
  archiveFilter?: AgencyClientArchiveFilter;
  onArchiveFilterChange?: (filter: AgencyClientArchiveFilter) => void;
  showArchiveFilter?: boolean;
  trashFilter?: AgencyProjectTrashFilter;
  onTrashFilterChange?: (filter: AgencyProjectTrashFilter) => void;
  showTrashFilter?: boolean;
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
  archiveFilter = "nonarchived",
  onArchiveFilterChange,
  showArchiveFilter = false,
  trashFilter = "active",
  onTrashFilterChange,
  showTrashFilter = false,
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
  const archiveStatusFilter: AgencyMultiSelectStatusFilter | undefined =
    showArchiveFilter && onArchiveFilterChange
      ? {
          label: "Show",
          value: archiveFilter,
          options: ARCHIVE_STATUS_OPTIONS,
          onChange: (value) => onArchiveFilterChange(value as AgencyClientArchiveFilter),
        }
      : undefined;

  const trashStatusFilter: AgencyMultiSelectStatusFilter | undefined =
    showTrashFilter && onTrashFilterChange
      ? {
          label: "Show",
          value: trashFilter,
          options: TRASH_STATUS_OPTIONS,
          onChange: (value) => onTrashFilterChange(value as AgencyProjectTrashFilter),
        }
      : undefined;

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
        searchPlaceholder="Search users or groups"
      />
      <AgencyMultiSelectFilter
        label="All Clients"
        values={selectedClientIds}
        options={clientOptions}
        onValuesChange={onSelectedClientIdsChange}
        disabled={clientsLoading}
        searchPlaceholder="Search clients"
        statusFilter={archiveStatusFilter}
      />
      <AgencyMultiSelectFilter
        label="All Projects"
        values={selectedProjectIds}
        groups={projectFilterGroups}
        onValuesChange={onSelectedProjectIdsChange}
        disabled={projectsLoading}
        searchPlaceholder="Search projects or clients"
        statusFilter={trashStatusFilter ?? archiveStatusFilter}
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
