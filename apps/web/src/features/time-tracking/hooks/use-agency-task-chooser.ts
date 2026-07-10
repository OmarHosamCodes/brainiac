import { useEffect, useMemo, useRef, useState, type RefObject } from "react";

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
  /** Expand this project when the chooser opens (does not select it for create). */
  preferredProjectId?: string;
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
  createInputRef: RefObject<HTMLInputElement | null>;
  listRef: RefObject<HTMLDivElement | null>;
  isProjectExpanded: (projectId: string) => boolean;
  isProjectSelectedForCreate: (projectId: string) => boolean;
  creatingInProjectId: string | null;
  createInputValue: string;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onSelectProject: (projectId: string) => void;
  onToggleProject: (projectId: string) => void;
  onStartCreateInProject: (projectId: string) => void;
  onCancelCreateInProject: () => void;
  onCreateInputChange: (value: string) => void;
  onConfirmCreateInProject: () => void;
  highlightSearch: boolean;
  statusLabel: (status: TaskStatus | undefined) => string;
  statusDotClass: (status: TaskStatus | undefined) => string;
  formatAssigneeLabel: (task: AgencyTask) => string;
};

function sortTasksByTitle(left: AgencyTask, right: AgencyTask) {
  return left.title.localeCompare(right.title);
}

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
  const preferredProjectId = options.mode === "create" ? (options.preferredProjectId ?? "") : "";

  const { open, searchTerm, setSearchTerm, setOpen } = useAgencyChooserOpenState({
    controlledOpen,
    onOpenChange,
  });

  const [creatingInProjectId, setCreatingInProjectId] = useState<string | null>(null);
  const [createInputValue, setCreateInputValue] = useState("");

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

  const tasksByProjectId = useMemo(() => {
    const map = new Map<string, AgencyTask[]>();
    for (const task of chooserTasks) {
      const existing = map.get(task.projectId) ?? [];
      existing.push(task);
      map.set(task.projectId, existing);
    }
    for (const [projectId, projectTasks] of map) {
      map.set(projectId, [...projectTasks].sort(sortTasksByTitle));
    }
    return map;
  }, [chooserTasks]);

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
    ? (creatingInProjectId ?? (createProjectId || preferredProjectId || null))
    : (selectedTask?.projectId ?? null);

  const { isProjectExpanded, toggleProject, expandProject } = useAgencyChooserExpandedProjects(
    selectedProjectIdForExpand,
    open,
  );

  const filterQuery = searchTerm.trim().toLowerCase();

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
    const filteredTasksByProject = new Map<string, AgencyTask[]>();

    for (const task of filteredTasks) {
      const existing = filteredTasksByProject.get(task.projectId) ?? [];
      existing.push(task);
      filteredTasksByProject.set(task.projectId, existing);
    }

    if (!isCreateMode) {
      const matchedProjects = projects.filter((project) => filteredTasksByProject.has(project.id));
      const sortedProjects = [...matchedProjects].sort(sortProjectsByClientThenName);
      return groupItemsByClient(sortedProjects).map((group) => ({
        clientName: group.clientName,
        projects: group.projects.map((project) => ({
          project,
          tasks: (filteredTasksByProject.get(project.id) ?? []).sort(sortTasksByTitle),
        })),
      }));
    }

    // Create mode: project/client match → all tasks; task-only match → filtered tasks.
    const matchedProjects = projects.filter((project) => {
      if (!filterQuery) return true;
      if (projectSearchableText(project).includes(filterQuery)) return true;
      return (filteredTasksByProject.get(project.id) ?? []).length > 0;
    });

    const visibleProjects =
      filterQuery && matchedProjects.length === 0 ? projects : matchedProjects;

    const sortedProjects = [...visibleProjects].sort(sortProjectsByClientThenName);

    return groupItemsByClient(sortedProjects).map((group) => ({
      clientName: group.clientName,
      projects: group.projects.map((project) => {
        const projectMatched = !filterQuery || projectSearchableText(project).includes(filterQuery);
        const tasksForProject = projectMatched
          ? (tasksByProjectId.get(project.id) ?? [])
          : (filteredTasksByProject.get(project.id) ?? []).sort(sortTasksByTitle);
        return { project, tasks: tasksForProject };
      }),
    }));
  }, [filteredTasks, filterQuery, isCreateMode, projects, tasksByProjectId]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);
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

  useEffect(() => {
    if (!open) {
      setCreatingInProjectId(null);
      setCreateInputValue("");
    }
  }, [open]);

  useEffect(() => {
    if (!creatingInProjectId) return;
    const frame = requestAnimationFrame(() => {
      createInputRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [creatingInProjectId]);

  function handleSearchChange(value: string) {
    setSearchTerm(value);
  }

  function selectTask(taskId: string) {
    if (isCreateMode) {
      onExistingTaskSelect?.(taskId);
      setCreatingInProjectId(null);
      setOpen(false);
      return;
    }
    onValueChange?.(taskId);
    setOpen(false);
  }

  function selectProject(projectId: string) {
    if (isCreateMode) {
      expandProject(projectId);
      return;
    }
    toggleProject(projectId);
  }

  function handleToggleProject(projectId: string) {
    if (isCreateMode) {
      if (creatingInProjectId && creatingInProjectId !== projectId) {
        setCreatingInProjectId(null);
        setCreateInputValue("");
      }
      toggleProject(projectId);
      return;
    }
    toggleProject(projectId);
  }

  function onStartCreateInProject(projectId: string) {
    if (!isCreateMode) return;
    expandProject(projectId);
    setCreatingInProjectId(projectId);
    setCreateInputValue(draftTitle);
    onDraftTitleChange?.(draftTitle);
  }

  function onCancelCreateInProject() {
    setCreatingInProjectId(null);
    setCreateInputValue("");
    onDraftTitleChange?.("");
  }

  function onCreateInputChange(value: string) {
    setCreateInputValue(value);
    onDraftTitleChange?.(value);
  }

  function onConfirmCreateInProject() {
    if (!isCreateMode || !creatingInProjectId) return;
    const trimmed = createInputValue.trim();
    if (!trimmed) return;
    onProjectIdChange?.(creatingInProjectId);
    onDraftTitleChange?.(trimmed);
    setCreatingInProjectId(null);
    setCreateInputValue("");
    setOpen(false);
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
    searchTerm,
    selectedProject,
    triggerProject,
    selectedTask,
    triggerTaskTitle,
    projectId: isCreateMode ? createProjectId : (selectedTask?.projectId ?? ""),
    groupedProjects,
    searchInputRef,
    createInputRef,
    listRef,
    isProjectExpanded,
    isProjectSelectedForCreate: (projectId) => isCreateMode && createProjectId === projectId,
    creatingInProjectId,
    createInputValue,
    onOpenChange: setOpen,
    onSearchChange: handleSearchChange,
    onSelectTask: selectTask,
    onSelectProject: selectProject,
    onToggleProject: handleToggleProject,
    onStartCreateInProject,
    onCancelCreateInProject,
    onCreateInputChange,
    onConfirmCreateInProject,
    highlightSearch,
    statusLabel,
    statusDotClass,
    formatAssigneeLabel: formatTaskAssigneeLabel,
  };
}
