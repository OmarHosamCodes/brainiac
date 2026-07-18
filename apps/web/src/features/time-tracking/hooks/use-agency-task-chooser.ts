import { useMemo, useRef, useState, type RefObject } from "react";

import type {
  AgencyProject,
  AgencyProjectTask,
  TaskStatus,
} from "@/features/task-management/agency-work";
import {
  useAgencyChooserExpandedClients,
  useAgencyChooserExpandedProjects,
  useAgencyChooserOpenState,
  useAgencyChooserScrollReveal,
} from "@/features/shared/choosers/agency-chooser-shell";
import {
  useAgencyFavoritesQuery,
  useAgencyProjectTemplatesQuery,
} from "@/features/shared/agency-queries";
import { useAgencyOpsStore } from "@/features/shared/stores/agency-ops";
import { statusLabel } from "@/features/task-management/agency-task-status";
import {
  buildAgencyTaskChooserSections,
  type ChooserClientGroup,
  type ChooserProjectGroup,
} from "@/features/time-tracking/agency-task-chooser-groups";

type Project = Pick<AgencyProject, "id" | "clientId" | "clientName" | "name"> & {
  colorHueId?: number | null;
};
type AgencyTask = Pick<
  AgencyProjectTask,
  "id" | "projectId" | "title" | "status" | "assignedToTeam" | "assignees"
>;

export type AgencyTaskChooserClientOption = {
  id: string;
  name: string;
};

export type AgencyTaskChooserTriggerFormat = "task-only" | "project-client" | "task-client";

export type UseAgencyTaskChooserOptions = {
  teamId: string;
  value: string;
  onValueChange: (value: string) => void;
  projects: Project[];
  tasks: AgencyTask[];
  clients?: AgencyTaskChooserClientOption[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  triggerFormat?: AgencyTaskChooserTriggerFormat;
  fallbackTaskTitle?: string;
  fallbackProjectId?: string;
  fallbackProjectName?: string;
  fallbackClientName?: string;
  filterProjectId?: string;
  highlightSearch?: boolean;
  required?: boolean;
};

export type AgencyTaskChooserViewModel = {
  value: string;
  teamId: string;
  disabled: boolean;
  loading: boolean;
  placeholder: string;
  required: boolean;
  searchPlaceholder: string;
  className?: string;
  contentAlign: "start" | "center" | "end";
  triggerFormat: AgencyTaskChooserTriggerFormat;
  open: boolean;
  searchTerm: string;
  selectedProject: Project | null;
  triggerProject: Project | null;
  selectedTask: AgencyTask | null;
  triggerTaskTitle: string | null;
  favorites: ChooserProjectGroup[];
  clientGroups: ChooserClientGroup[];
  favoriteProjectIds: Set<string>;
  favoriteTaskIds: Set<string>;
  searchInputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  isProjectExpanded: (projectId: string) => boolean;
  isClientExpanded: (clientName: string) => boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onToggleProject: (projectId: string) => void;
  onToggleClient: (clientName: string) => void;
  onToggleProjectFavorite: (projectId: string) => void;
  onToggleTaskFavorite: (taskId: string) => void;
  highlightSearch: boolean;
  statusLabel: (status: TaskStatus | undefined) => string;
  createTaskOpen: boolean;
  createTaskProjectId: string;
  createProjectOpen: boolean;
  clients: AgencyTaskChooserClientOption[];
  templates: Array<{ id: string; name: string; milestoneCount: number }>;
  onOpenCreateTask: (projectId: string) => void;
  onCreateTaskOpenChange: (open: boolean) => void;
  onOpenCreateProject: () => void;
  onCreateProjectOpenChange: (open: boolean) => void;
  onTaskCreated: (taskId: string) => void;
  onProjectCreated: (projectId: string) => void;
};

export function useAgencyTaskChooser(
  options: UseAgencyTaskChooserOptions,
): AgencyTaskChooserViewModel {
  const {
    teamId,
    value,
    onValueChange,
    projects,
    tasks,
    clients: clientsProp = [],
    disabled = false,
    loading = false,
    placeholder = "Task",
    searchPlaceholder = "Search projects or clients",
    className,
    open: controlledOpen,
    onOpenChange,
    contentAlign = "start",
    triggerFormat = "task-only",
    fallbackTaskTitle,
    fallbackProjectId,
    fallbackProjectName,
    fallbackClientName,
    highlightSearch = false,
    required = false,
    filterProjectId,
  } = options;

  const { open, searchTerm, setSearchTerm, setOpen } = useAgencyChooserOpenState({
    controlledOpen,
    onOpenChange,
  });

  const [createTaskOpen, setCreateTaskOpen] = useState(false);
  const [createTaskProjectId, setCreateTaskProjectId] = useState("");
  const [createProjectOpen, setCreateProjectOpen] = useState(false);

  const favoritesQuery = useAgencyFavoritesQuery(teamId);
  const templatesQuery = useAgencyProjectTemplatesQuery(teamId);
  const toggleFavorite = useAgencyOpsStore((state) => state.toggleFavorite);

  const favoriteProjectIds = useMemo(
    () => new Set(favoritesQuery.data?.projectIds ?? []),
    [favoritesQuery.data?.projectIds],
  );
  const favoriteTaskIds = useMemo(
    () => new Set(favoritesQuery.data?.taskIds ?? []),
    [favoritesQuery.data?.taskIds],
  );

  const chooserTasks = useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter((task) => {
      if (task.status === "archived") return false;
      if (filterProjectId && task.projectId !== filterProjectId) return false;
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
  }, [tasks, filterProjectId]);

  const chooserProjects = useMemo(() => {
    if (!filterProjectId) return projects;
    return projects.filter((project) => project.id === filterProjectId);
  }, [projects, filterProjectId]);

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === value) ?? null,
    [tasks, value],
  );

  const selectedProject = useMemo(
    () => (selectedTask ? (projectsById.get(selectedTask.projectId) ?? null) : null),
    [projectsById, selectedTask],
  );

  const triggerProject = useMemo((): Project | null => {
    if (selectedProject) return selectedProject;
    if (!fallbackProjectId || !fallbackProjectName) return null;
    const cached = projectsById.get(fallbackProjectId);
    return {
      id: fallbackProjectId,
      name: fallbackProjectName,
      clientId: cached?.clientId ?? "",
      clientName: fallbackClientName ?? cached?.clientName ?? "",
      colorHueId: cached?.colorHueId ?? null,
    };
  }, [fallbackClientName, fallbackProjectId, fallbackProjectName, projectsById, selectedProject]);

  const triggerTaskTitle = selectedTask?.title ?? fallbackTaskTitle ?? null;

  const { isProjectExpanded, toggleProject, expandProject } = useAgencyChooserExpandedProjects(
    selectedTask?.projectId ?? null,
    open,
  );
  const { isClientExpanded, toggleClient } = useAgencyChooserExpandedClients(
    triggerProject?.clientName || null,
    open,
  );

  const sections = useMemo(
    () =>
      buildAgencyTaskChooserSections({
        projects: chooserProjects,
        tasks: chooserTasks,
        favoriteProjectIds: [...favoriteProjectIds],
        favoriteTaskIds: [...favoriteTaskIds],
        searchTerm,
      }),
    [chooserProjects, chooserTasks, favoriteProjectIds, favoriteTaskIds, searchTerm],
  );

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useAgencyChooserScrollReveal({
    open,
    searchInputRef,
    listRef,
    selectedSelector: '[data-selected-task="true"]',
    revealDeps: [selectedTask?.projectId, value],
  });

  const clients = useMemo(() => {
    if (clientsProp.length > 0) return clientsProp;
    const byId = new Map<string, AgencyTaskChooserClientOption>();
    for (const project of projects) {
      if (!project.clientId || byId.has(project.clientId)) continue;
      byId.set(project.clientId, { id: project.clientId, name: project.clientName || "Client" });
    }
    return [...byId.values()].sort((left, right) => left.name.localeCompare(right.name));
  }, [clientsProp, projects]);

  const templates = useMemo(
    () =>
      (templatesQuery.data?.items ?? []).map((template) => ({
        id: template.id,
        name: template.name,
        milestoneCount: template.milestoneCount,
      })),
    [templatesQuery.data?.items],
  );

  function selectTask(taskId: string) {
    onValueChange(taskId);
    setOpen(false);
  }

  function handleToggleProjectFavorite(projectId: string) {
    void toggleFavorite({ teamId, kind: "project", projectId });
  }

  function handleToggleTaskFavorite(taskId: string) {
    void toggleFavorite({ teamId, kind: "task", taskId });
  }

  function onOpenCreateTask(projectId: string) {
    setOpen(false);
    setCreateTaskProjectId(projectId);
    setCreateTaskOpen(true);
  }

  function onOpenCreateProject() {
    setOpen(false);
    setCreateProjectOpen(true);
  }

  function onTaskCreated(taskId: string) {
    setCreateTaskOpen(false);
    setCreateTaskProjectId("");
    onValueChange(taskId);
    setOpen(false);
  }

  function onProjectCreated(projectId: string) {
    setCreateProjectOpen(false);
    expandProject(projectId);
    onOpenCreateTask(projectId);
  }

  return {
    value,
    teamId,
    disabled,
    loading,
    placeholder,
    required,
    searchPlaceholder,
    className,
    contentAlign,
    triggerFormat,
    open,
    searchTerm,
    selectedProject,
    triggerProject,
    selectedTask,
    triggerTaskTitle,
    favorites: sections.favorites,
    clientGroups: sections.clientGroups,
    favoriteProjectIds,
    favoriteTaskIds,
    searchInputRef,
    listRef,
    isProjectExpanded: (projectId) => Boolean(searchTerm.trim()) || isProjectExpanded(projectId),
    isClientExpanded: (clientName) => Boolean(searchTerm.trim()) || isClientExpanded(clientName),
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    onSelectTask: selectTask,
    onToggleProject: toggleProject,
    onToggleClient: toggleClient,
    onToggleProjectFavorite: handleToggleProjectFavorite,
    onToggleTaskFavorite: handleToggleTaskFavorite,
    highlightSearch,
    statusLabel,
    createTaskOpen,
    createTaskProjectId,
    createProjectOpen,
    clients,
    templates,
    onOpenCreateTask,
    onCreateTaskOpenChange: setCreateTaskOpen,
    onOpenCreateProject,
    onCreateProjectOpenChange: setCreateProjectOpen,
    onTaskCreated,
    onProjectCreated,
  };
}
