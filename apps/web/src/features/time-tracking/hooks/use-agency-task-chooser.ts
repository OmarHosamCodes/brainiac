import { useMemo, useRef, type KeyboardEvent, type ReactNode, type RefObject } from "react";

import { formatTaskAssigneeLabel } from "@brainiac/api/schemas/agency-ops";
import type {
  AgencyProject,
  AgencyProjectTask,
  TaskStatus,
} from "@/features/task-management/agency-work";
import {
  groupItemsByClient,
  projectSearchableText,
  sortProjectsByClientThenName,
  useAgencyChooserExpandedProjects,
  useAgencyChooserOpenState,
  useAgencyChooserScrollReveal,
} from "@/features/shared/choosers/agency-chooser-shell";
import { statusDotClass, statusLabel } from "@/features/task-management/agency-task-status";

type Project = Pick<AgencyProject, "id" | "clientName" | "name">;
type AgencyTask = Pick<
  AgencyProjectTask,
  "id" | "projectId" | "title" | "status" | "assignedToTeam" | "assignees"
>;

type AgencyTaskChooserSelectOptions = {
  mode?: "select";
  value: string;
  onValueChange: (value: string) => void;
};

type AgencyTaskChooserCreateOptions = {
  mode: "create";
  draftTitle: string;
  onDraftTitleChange: (value: string) => void;
  projectId: string;
  onProjectIdChange: (value: string) => void;
  onExistingTaskSelect?: (taskId: string) => void;
};

export type AgencyTaskChooserTriggerFormat = "task-only" | "project-client" | "task-client";

type UseAgencyTaskChooserBaseOptions = {
  projects: Project[];
  tasks: AgencyTask[];
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
  searchPlaceholder?: string;
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  contentAlign?: "start" | "center" | "end";
  /** Default task-only. Use task-client for session/tracker triggers. */
  triggerFormat?: AgencyTaskChooserTriggerFormat;
  fallbackTaskTitle?: string;
  fallbackProjectId?: string;
  fallbackProjectName?: string;
  fallbackClientName?: string;
  suggestionMenu?: ReactNode;
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  /** When true, mark search matches in project/task labels like the clients surface. */
  highlightSearch?: boolean;
};

export type UseAgencyTaskChooserOptions = UseAgencyTaskChooserBaseOptions &
  (AgencyTaskChooserSelectOptions | AgencyTaskChooserCreateOptions);

export type AgencyTaskChooserProjectGroup = {
  project: Project;
  tasks: AgencyTask[];
};

export type AgencyTaskChooserClientGroup = {
  clientName: string;
  projects: AgencyTaskChooserProjectGroup[];
};

export type AgencyTaskChooserViewModel = {
  mode: "select" | "create";
  value: string;
  disabled: boolean;
  loading: boolean;
  placeholder: string;
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
  projectId: string;
  groupedProjects: AgencyTaskChooserClientGroup[];
  searchInputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  isProjectExpanded: (projectId: string) => boolean;
  isProjectSelectedForCreate: (projectId: string) => boolean;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
  onToggleProject: (projectId: string) => void;
  suggestionMenu?: ReactNode;
  onSearchKeyDown?: (event: KeyboardEvent<HTMLInputElement>) => void;
  highlightSearch: boolean;
  statusLabel: (status: TaskStatus | undefined) => string;
  statusDotClass: (status: TaskStatus | undefined) => string;
  formatAssigneeLabel: (task: AgencyTask) => string;
};

export function useAgencyTaskChooser(
  options: UseAgencyTaskChooserOptions,
): AgencyTaskChooserViewModel {
  const {
    projects,
    tasks,
    disabled = false,
    loading = false,
    placeholder = "Task",
    searchPlaceholder = "Search tasks, projects, or clients",
    className,
    open: controlledOpen,
    onOpenChange,
    contentAlign = "start",
    triggerFormat = "task-only",
    fallbackTaskTitle,
    fallbackProjectId,
    fallbackProjectName,
    fallbackClientName,
    suggestionMenu,
    onSearchKeyDown,
    highlightSearch = false,
  } = options;

  const isCreateMode = options.mode === "create";

  const selectValue = options.mode === "create" ? "" : options.value;
  const onValueChange = options.mode === "create" ? undefined : options.onValueChange;
  const draftTitle = options.mode === "create" ? options.draftTitle : "";
  const onDraftTitleChange = options.mode === "create" ? options.onDraftTitleChange : undefined;
  const createProjectId = options.mode === "create" ? options.projectId : "";
  const onProjectIdChange = options.mode === "create" ? options.onProjectIdChange : undefined;
  const onExistingTaskSelect = options.mode === "create" ? options.onExistingTaskSelect : undefined;

  const { open, searchTerm, setSearchTerm, setOpen } = useAgencyChooserOpenState({
    controlledOpen,
    onOpenChange,
  });

  const chooserTasks = useMemo(() => {
    const seen = new Set<string>();
    return tasks.filter((task) => {
      if (task.status === "archived") return false;
      if (seen.has(task.id)) return false;
      seen.add(task.id);
      return true;
    });
  }, [tasks]);

  const projectsById = useMemo(
    () => new Map(projects.map((project) => [project.id, project])),
    [projects],
  );

  const selectedTask = useMemo(
    () => (isCreateMode ? null : (tasks.find((task) => task.id === selectValue) ?? null)),
    [isCreateMode, tasks, selectValue],
  );

  const selectedProject = useMemo(() => {
    if (isCreateMode) {
      return createProjectId ? (projectsById.get(createProjectId) ?? null) : null;
    }
    return selectedTask ? (projectsById.get(selectedTask.projectId) ?? null) : null;
  }, [createProjectId, isCreateMode, projectsById, selectedTask]);

  const triggerProject = useMemo((): Project | null => {
    if (selectedProject) return selectedProject;
    if (!fallbackProjectId || !fallbackProjectName) return null;
    return {
      id: fallbackProjectId,
      name: fallbackProjectName,
      clientName: fallbackClientName ?? projectsById.get(fallbackProjectId)?.clientName ?? "",
    };
  }, [fallbackClientName, fallbackProjectId, fallbackProjectName, projectsById, selectedProject]);

  const triggerTaskTitle = isCreateMode
    ? draftTitle.trim() || null
    : (selectedTask?.title ?? fallbackTaskTitle ?? null);

  const selectedProjectIdForExpand = isCreateMode
    ? createProjectId
    : (selectedTask?.projectId ?? null);

  const { isProjectExpanded, toggleProject, expandProject } = useAgencyChooserExpandedProjects(
    selectedProjectIdForExpand,
    open,
  );

  // Create mode binds the search input to draftTitle; select mode uses local searchTerm.
  const filterQuery = (isCreateMode ? draftTitle : searchTerm).trim().toLowerCase();

  const filteredTasks = useMemo(() => {
    if (!filterQuery) return chooserTasks;

    return chooserTasks.filter((task) => {
      const project = projectsById.get(task.projectId);
      const searchableText = [
        task.title,
        task.status,
        formatTaskAssigneeLabel(task),
        project?.name ?? "",
        project?.clientName ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchableText.includes(filterQuery);
    });
  }, [chooserTasks, filterQuery, projectsById]);

  const groupedProjects = useMemo(() => {
    const tasksByProject = new Map<string, AgencyTask[]>();

    for (const task of filteredTasks) {
      const existing = tasksByProject.get(task.projectId) ?? [];
      existing.push(task);
      tasksByProject.set(task.projectId, existing);
    }

    const matchedProjects = isCreateMode
      ? projects.filter((project) => {
          if (!filterQuery) return true;
          if (projectSearchableText(project).includes(filterQuery)) return true;
          return (tasksByProject.get(project.id) ?? []).length > 0;
        })
      : projects.filter((project) => tasksByProject.has(project.id));

    // Create mode: if the draft title matches nothing, still show projects so the user can place the new task.
    const visibleProjects =
      isCreateMode && filterQuery && matchedProjects.length === 0 ? projects : matchedProjects;

    const sortedProjects = [...visibleProjects].sort(sortProjectsByClientThenName);

    const clientGroups = groupItemsByClient(sortedProjects);

    return clientGroups.map((group) => ({
      clientName: group.clientName,
      projects: group.projects.map((project) => ({
        project,
        tasks: (tasksByProject.get(project.id) ?? []).sort((left, right) =>
          left.title.localeCompare(right.title),
        ),
      })),
    }));
  }, [filteredTasks, filterQuery, isCreateMode, projects]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useAgencyChooserScrollReveal({
    open,
    searchInputRef,
    listRef,
    selectedSelector: isCreateMode
      ? '[data-selected-project="true"]'
      : '[data-selected-task="true"]',
    revealDeps: [selectedProjectIdForExpand, selectValue],
  });

  function handleSearchChange(value: string) {
    if (isCreateMode) {
      onDraftTitleChange?.(value);
      return;
    }
    setSearchTerm(value);
  }

  function selectTask(taskId: string) {
    if (isCreateMode) {
      onExistingTaskSelect?.(taskId);
      setOpen(false);
      return;
    }
    onValueChange?.(taskId);
    setOpen(false);
  }

  function selectProject(projectId: string) {
    if (isCreateMode) {
      onProjectIdChange?.(projectId);
      expandProject(projectId);
      return;
    }
    toggleProject(projectId);
  }

  function handleToggleProject(projectId: string) {
    if (isCreateMode) {
      onProjectIdChange?.(projectId);
      expandProject(projectId);
      return;
    }
    toggleProject(projectId);
  }

  return {
    mode: isCreateMode ? "create" : "select",
    value: selectValue,
    disabled,
    loading,
    placeholder,
    searchPlaceholder,
    className,
    contentAlign,
    triggerFormat,
    open,
    searchTerm: isCreateMode ? draftTitle : searchTerm,
    selectedProject,
    triggerProject,
    selectedTask,
    triggerTaskTitle,
    projectId: isCreateMode ? createProjectId : (selectedTask?.projectId ?? ""),
    groupedProjects,
    searchInputRef,
    listRef,
    isProjectExpanded,
    isProjectSelectedForCreate: (projectId) => isCreateMode && createProjectId === projectId,
    onOpenChange: setOpen,
    onSearchChange: handleSearchChange,
    onSelectTask: selectTask,
    onSelectProject: selectProject,
    onToggleProject: handleToggleProject,
    suggestionMenu,
    onSearchKeyDown,
    highlightSearch,
    statusLabel,
    statusDotClass,
    formatAssigneeLabel: formatTaskAssigneeLabel,
  };
}
