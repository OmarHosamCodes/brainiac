import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type RefObject } from "react";

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
import {
  buildTaskChooserKeyboardItems,
  indexOfTaskChooserItem,
  taskChooserCreatePriority,
  taskChooserOptionDomId,
  type TaskChooserKeyboardItem,
} from "@/features/time-tracking/agency-task-chooser-keyboard";

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
  /** Ranked suggestion best-match — highlighted when chooser opens. */
  bestMatchTaskId?: string | null;
  /**
   * Tracker: remove (X clears). Entries: switch (icon opens chooser to change).
   * Default remove.
   */
  clearAffordance?: "remove" | "switch";
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
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
  onSelectTask: (taskId: string) => void;
  onClearTask: () => void;
  canClearTask: boolean;
  clearAffordance: "remove" | "switch";
  onToggleProject: (projectId: string) => void;
  onToggleClient: (clientName: string) => void;
  onToggleProjectFavorite: (projectId: string) => void;
  onToggleTaskFavorite: (taskId: string) => void;
  highlightSearch: boolean;
  bestMatchTaskId: string | null;
  activeOptionKey: string | null;
  activeOptionDomId: string | undefined;
  createPriority: "default" | "demoted" | "elevated";
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
    bestMatchTaskId = null,
    clearAffordance = "remove",
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

  const bestMatchTask = useMemo(
    () => (bestMatchTaskId ? (tasks.find((task) => task.id === bestMatchTaskId) ?? null) : null),
    [bestMatchTaskId, tasks],
  );

  useEffect(() => {
    if (!open || !bestMatchTask) return;
    expandProject(bestMatchTask.projectId);
  }, [bestMatchTask, expandProject, open]);

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
  const [expandEpoch, setExpandEpoch] = useState(0);

  const isProjectExpandedForList = (projectId: string) =>
    Boolean(searchTerm.trim()) ||
    isProjectExpanded(projectId) ||
    projectId === selectedTask?.projectId ||
    projectId === bestMatchTask?.projectId;
  const bestMatchClientName = bestMatchTask
    ? (projectsById.get(bestMatchTask.projectId)?.clientName ?? null)
    : null;
  const isClientExpandedForList = (clientName: string) =>
    Boolean(searchTerm.trim()) ||
    isClientExpanded(clientName) ||
    clientName === (selectedProject?.clientName || null) ||
    clientName === bestMatchClientName;

  const keyboardItems = useMemo(
    () =>
      buildTaskChooserKeyboardItems({
        favorites: sections.favorites,
        clientGroups: sections.clientGroups,
        isProjectExpanded: isProjectExpandedForList,
        isClientExpanded: isClientExpandedForList,
        includeProjects: !searchTerm.trim(),
      }),
    // expandEpoch invalidates after project/client toggles.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- expand helpers close over render state
    [
      sections.favorites,
      sections.clientGroups,
      searchTerm,
      expandEpoch,
      selectedTask?.projectId,
      selectedProject?.clientName,
      bestMatchTask?.projectId,
      bestMatchClientName,
    ],
  );

  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    if (!open) {
      setActiveIndex(-1);
      return;
    }
    setActiveIndex(
      indexOfTaskChooserItem(keyboardItems, {
        taskId: bestMatchTaskId || value || null,
        projectId: selectedTask?.projectId ?? bestMatchTask?.projectId ?? null,
      }),
    );
    // Re-seek when preferred task becomes visible (expand-on-open).
    // eslint-disable-next-line react-hooks/exhaustive-deps -- avoid reset on every arrow move
  }, [open, searchTerm, bestMatchTaskId, value, keyboardItems.length]);

  useEffect(() => {
    if (!open) return;
    setActiveIndex((current) => {
      if (keyboardItems.length === 0) return -1;
      if (current < 0) return 0;
      return Math.min(current, keyboardItems.length - 1);
    });
  }, [keyboardItems.length, open]);

  useEffect(() => {
    if (!open || activeIndex < 0) return;
    const item = keyboardItems[activeIndex];
    if (!item) return;
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLElement>(`#${CSS.escape(taskChooserOptionDomId(item.key))}`)
        ?.scrollIntoView({ block: "nearest" });
    });
    return () => cancelAnimationFrame(frame);
  }, [activeIndex, keyboardItems, open]);

  useAgencyChooserScrollReveal({
    open,
    searchInputRef,
    listRef,
    selectedSelector: '[data-selected-task="true"], [data-best-match-task="true"]',
    revealDeps: [selectedTask?.projectId, value, bestMatchTaskId],
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

  const hasVisibleResults = sections.favorites.length > 0 || sections.clientGroups.length > 0;
  const createPriority = taskChooserCreatePriority({
    searchTerm,
    hasVisibleResults,
  });

  const activeItem: TaskChooserKeyboardItem | null =
    activeIndex >= 0 ? (keyboardItems[activeIndex] ?? null) : null;
  const activeOptionKey = activeItem?.key ?? null;
  const activeOptionDomId = activeOptionKey ? taskChooserOptionDomId(activeOptionKey) : undefined;

  const canClearTask = Boolean(value || triggerTaskTitle) && !disabled && !loading;

  function selectTask(taskId: string) {
    onValueChange(taskId);
    setOpen(false);
  }

  function clearTask() {
    if (clearAffordance === "switch") {
      setOpen(true);
      return;
    }
    onValueChange("");
    setOpen(false);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!open) return;

    if (event.key === "ArrowDown") {
      if (keyboardItems.length === 0) return;
      event.preventDefault();
      setActiveIndex((current) => {
        if (current < 0) return 0;
        return Math.min(current + 1, keyboardItems.length - 1);
      });
      return;
    }

    if (event.key === "ArrowUp") {
      if (keyboardItems.length === 0) return;
      event.preventDefault();
      setActiveIndex((current) => {
        if (current < 0) return keyboardItems.length - 1;
        return Math.max(current - 1, 0);
      });
      return;
    }

    if (event.key === "Enter") {
      const item = activeIndex >= 0 ? keyboardItems[activeIndex] : null;
      if (!item) return;
      event.preventDefault();
      if (item.kind === "task") {
        selectTask(item.taskId);
        return;
      }
      toggleProject(item.projectId);
      setExpandEpoch((epoch) => epoch + 1);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  }

  function handleToggleProject(projectId: string) {
    toggleProject(projectId);
    setExpandEpoch((epoch) => epoch + 1);
  }

  function handleToggleClient(clientName: string) {
    toggleClient(clientName);
    setExpandEpoch((epoch) => epoch + 1);
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
    isProjectExpanded: isProjectExpandedForList,
    isClientExpanded: isClientExpandedForList,
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    onSearchKeyDown: handleSearchKeyDown,
    onSelectTask: selectTask,
    onClearTask: clearTask,
    canClearTask,
    clearAffordance,
    onToggleProject: handleToggleProject,
    onToggleClient: handleToggleClient,
    onToggleProjectFavorite: handleToggleProjectFavorite,
    onToggleTaskFavorite: handleToggleTaskFavorite,
    highlightSearch,
    bestMatchTaskId: bestMatchTaskId || null,
    activeOptionKey,
    activeOptionDomId,
    createPriority,
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
