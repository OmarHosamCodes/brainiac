import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import type { AgencyFilterOptionGroup } from "@/features/shared/filters/agency-multi-select-filter";
import { orpc } from "@/lib/orpc";
import {
  useAgencyClientsQuery,
  useAgencyProjectTasksQuery,
  useAgencyProjectsQuery,
  useAgencyTimeEntriesQuery,
} from "@/features/shared/agency-queries";
import {
  groupTasksByClient,
  groupTasksByProjectTitle,
} from "@/features/task-management/agency-task-utils";
import type { AgencyClientArchiveFilter } from "@/features/shared/agency-client-archive-filter";
import { withAgencySyncQueryOptions } from "@/features/shared/agency-query-options";

export type { AgencyClientArchiveFilter } from "@/features/shared/agency-client-archive-filter";

export type AgencyListFiltersApplied = {
  filterTerm: string;
  archiveFilter: AgencyClientArchiveFilter;
  selectedPeopleIds: string[];
  selectedClientIds: string[];
  selectedProjectIds: string[];
  selectedTaskIds: string[];
  peopleSet: Set<string>;
  clientsSet: Set<string>;
  projectsSet: Set<string>;
  tasksSet: Set<string>;
};

type UseAgencyListFiltersOptions = {
  teamId: string;
};

export function useAgencyListFilters({ teamId }: UseAgencyListFiltersOptions) {
  const [filterTerm, setFilterTerm] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<AgencyClientArchiveFilter>("nonarchived");
  const [selectedPeopleIds, setSelectedPeopleIds] = useState<string[]>([]);
  const [selectedClientIds, setSelectedClientIds] = useState<string[]>([]);
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  const clientsQuery = useAgencyClientsQuery(teamId, { archiveFilter });
  const projectsQuery = useAgencyProjectsQuery(teamId, { archiveFilter });
  const entriesQuery = useAgencyTimeEntriesQuery(teamId, 1, 100);
  const membersQuery = useQuery(
    withAgencySyncQueryOptions(
      {
        ...orpc.team.members.list.queryOptions({ input: { teamId } }),
        enabled: Boolean(teamId),
      },
      "cold",
      { liveGated: true, teamId },
    ),
  );
  const tasksQuery = useAgencyProjectTasksQuery(teamId, {
    search: filterTerm.trim() || undefined,
    pageSize: 100,
  });

  const clients = clientsQuery.data?.items ?? [];
  const projects = projectsQuery.data?.items ?? [];
  const entries = entriesQuery.data?.items ?? [];
  const tasks = tasksQuery.data?.items ?? [];

  const peopleOptions = useMemo(() => {
    const people = new Map<string, string>();
    for (const member of membersQuery.data?.items ?? []) {
      people.set(member.userId, member.userName);
    }
    for (const entry of entries) {
      people.set(entry.userId, entry.userName);
    }
    return Array.from(people, ([value, label]) => ({ value, label })).sort((a, b) =>
      a.label.localeCompare(b.label),
    );
  }, [entries, membersQuery.data?.items]);

  const clientOptions = useMemo(
    () => clients.map((client) => ({ value: client.id, label: client.name })),
    [clients],
  );

  const projectFilterGroups = useMemo((): AgencyFilterOptionGroup[] => {
    const sortedProjects = [...projects].sort(
      (left, right) =>
        left.clientName.localeCompare(right.clientName) || left.name.localeCompare(right.name),
    );
    const groups: AgencyFilterOptionGroup[] = [];
    let currentGroup: AgencyFilterOptionGroup | null = null;

    for (const project of sortedProjects) {
      if (!currentGroup || currentGroup.groupLabel !== project.clientName) {
        currentGroup = { groupLabel: project.clientName, options: [] };
        groups.push(currentGroup);
      }
      currentGroup.options!.push({ value: project.id, label: project.name });
    }

    return groups;
  }, [projects]);

  const taskFilterGroups = useMemo((): AgencyFilterOptionGroup[] => {
    return groupTasksByClient(tasks, projects).map((clientGroup) => {
      const tasksByProject = new Map<string, typeof tasks>();
      for (const task of clientGroup.tasks) {
        const list = tasksByProject.get(task.projectId) ?? [];
        list.push(task);
        tasksByProject.set(task.projectId, list);
      }

      return {
        groupLabel: clientGroup.clientName,
        sections: projects
          .filter(
            (project) =>
              project.clientId === clientGroup.clientId && tasksByProject.has(project.id),
          )
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((project) => ({
            sectionLabel: project.name,
            options: groupTasksByProjectTitle(tasksByProject.get(project.id) ?? []).map(
              (group) => ({
                value: group.groupKey,
                label: group.title,
              }),
            ),
          })),
      };
    });
  }, [projects, tasks]);

  const applied: AgencyListFiltersApplied = useMemo(
    () => ({
      filterTerm,
      archiveFilter,
      selectedPeopleIds,
      selectedClientIds,
      selectedProjectIds,
      selectedTaskIds,
      peopleSet: new Set(selectedPeopleIds),
      clientsSet: new Set(selectedClientIds),
      projectsSet: new Set(selectedProjectIds),
      tasksSet: new Set(selectedTaskIds),
    }),
    [
      filterTerm,
      archiveFilter,
      selectedClientIds,
      selectedPeopleIds,
      selectedProjectIds,
      selectedTaskIds,
    ],
  );

  const hasActiveFilters =
    filterTerm.trim() !== "" ||
    archiveFilter !== "nonarchived" ||
    selectedPeopleIds.length > 0 ||
    selectedClientIds.length > 0 ||
    selectedProjectIds.length > 0 ||
    selectedTaskIds.length > 0;

  function handleReset() {
    setFilterTerm("");
    setArchiveFilter("nonarchived");
    setSelectedPeopleIds([]);
    setSelectedClientIds([]);
    setSelectedProjectIds([]);
    setSelectedTaskIds([]);
  }

  const barProps = {
    filterTerm,
    onFilterTermChange: setFilterTerm,
    archiveFilter,
    onArchiveFilterChange: setArchiveFilter,
    showArchiveFilter: false,
    selectedPeopleIds,
    onSelectedPeopleIdsChange: setSelectedPeopleIds,
    selectedClientIds,
    onSelectedClientIdsChange: setSelectedClientIds,
    selectedProjectIds,
    onSelectedProjectIdsChange: setSelectedProjectIds,
    selectedTaskIds,
    onSelectedTaskIdsChange: setSelectedTaskIds,
    peopleOptions,
    clientOptions,
    projectFilterGroups,
    taskFilterGroups,
    peopleLoading: tasksQuery.isPending,
    clientsLoading: clientsQuery.isPending,
    projectsLoading: projectsQuery.isPending,
    tasksLoading: tasksQuery.isPending,
    hasActiveFilters,
    onReset: handleReset,
  };

  return {
    applied,
    barProps,
    clients,
    projects,
    entries,
    tasks,
    isLoading: clientsQuery.isPending || projectsQuery.isPending,
  };
}
