import { useEffect, useMemo, useState } from "react";

import { formatTaskAssigneeLabel } from "@brainiac/api/schemas/agency-ops";
import type { AgencyProject, AgencyProjectTask, TaskStatus } from "@/features/task-management/agency-work";
import {
  getTaskGroupKey,
  groupTasksByProjectTitle,
  type AgencyProjectTaskGroup,
} from "@/features/task-management/agency-task-utils";
import { statusDotClass, statusLabel } from "@/features/task-management/agency-task-status";

type Project = Pick<AgencyProject, "id" | "clientName" | "name">;
type AgencyTask = Pick<
  AgencyProjectTask,
  "id" | "projectId" | "title" | "status" | "assignedToTeam" | "assignees"
> & {
  dueDate?: string | null;
  createdAt?: string;
};

export type AgencyTaskChooserTriggerFormat = "task-project" | "project-client" | "task-only";

type UseAgencyTaskChooserOptions = {
  value: string;
  onValueChange: (value: string) => void;
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
  triggerFormat?: AgencyTaskChooserTriggerFormat;
  fallbackTaskTitle?: string;
  fallbackProjectId?: string;
  fallbackProjectName?: string;
};

export type AgencyTaskChooserProjectGroup = {
  project: Project;
  taskGroups: AgencyProjectTaskGroup<AgencyTask>[];
};

export type AgencyTaskChooserClientGroup = {
  clientName: string;
  projects: AgencyTaskChooserProjectGroup[];
};

export type AgencyTaskChooserViewModel = {
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
  selectedTask: AgencyTask | null;
  triggerProject: Project | null;
  triggerTaskTitle: string | null;
  selectedLabel: string;
  groupedProjects: AgencyTaskChooserClientGroup[];
  searchIsActive: boolean;
  isProjectExpanded: (projectId: string) => boolean;
  isTaskGroupExpanded: (groupKey: string) => boolean;
  revealToken: number;
  onOpenChange: (open: boolean) => void;
  onSearchChange: (value: string) => void;
  onSelectTask: (taskId: string) => void;
  onToggleProject: (projectId: string) => void;
  onToggleTaskGroup: (groupKey: string) => void;
  statusLabel: (status: TaskStatus | undefined) => string;
  statusDotClass: (status: TaskStatus | undefined) => string;
  formatDueDate: (iso: string | null | undefined) => string;
  formatAssigneeLabel: (task: AgencyTask) => string;
};

function formatDueDate(iso: string | null | undefined) {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useAgencyTaskChooser({
  value,
  onValueChange,
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
  triggerFormat = "task-project",
  fallbackTaskTitle,
  fallbackProjectId,
  fallbackProjectName,
}: UseAgencyTaskChooserOptions): AgencyTaskChooserViewModel {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const open = controlledOpen ?? uncontrolledOpen;

  function setOpen(nextOpen: boolean) {
    onOpenChange?.(nextOpen);
    if (controlledOpen === undefined) {
      setUncontrolledOpen(nextOpen);
    }
    if (!nextOpen) {
      setSearchTerm("");
    }
  }

  const chooserTasks = useMemo(() => tasks.filter((task) => task.status !== "archived"), [tasks]);

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
    return {
      id: fallbackProjectId,
      name: fallbackProjectName,
      clientName: projectsById.get(fallbackProjectId)?.clientName ?? "",
    };
  }, [fallbackProjectId, fallbackProjectName, projectsById, selectedProject]);

  const triggerTaskTitle = selectedTask?.title ?? fallbackTaskTitle ?? null;

  const selectedLabel = useMemo(() => {
    if (!selectedTask) return "";
    if (!selectedProject) return selectedTask.title;
    return `${selectedTask.title} . ${selectedProject.name}`;
  }, [selectedProject, selectedTask]);

  const filteredTasks = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) return chooserTasks;

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

      return searchableText.includes(query);
    });
  }, [chooserTasks, projectsById, searchTerm]);

  const groupedProjects = useMemo(() => {
    const tasksByProject = new Map<string, AgencyTask[]>();

    for (const task of filteredTasks) {
      const existing = tasksByProject.get(task.projectId) ?? [];
      existing.push(task);
      tasksByProject.set(task.projectId, existing);
    }

    const sortedProjects = projects
      .filter((project) => tasksByProject.has(project.id))
      .sort((left, right) => {
        const clientSort = left.clientName.localeCompare(right.clientName);
        return clientSort || left.name.localeCompare(right.name);
      });

    const clientGroups: AgencyTaskChooserClientGroup[] = [];
    let currentGroup: AgencyTaskChooserClientGroup | null = null;

    for (const project of sortedProjects) {
      if (!currentGroup || currentGroup.clientName !== project.clientName) {
        currentGroup = { clientName: project.clientName, projects: [] };
        clientGroups.push(currentGroup);
      }

      currentGroup.projects.push({
        project,
        taskGroups: groupTasksByProjectTitle(tasksByProject.get(project.id) ?? []),
      });
    }

    return clientGroups;
  }, [filteredTasks, projects]);

  const [expandedProjectIds, setExpandedProjectIds] = useState<Set<string>>(() => new Set());
  const [expandedTaskGroupKeys, setExpandedTaskGroupKeys] = useState<Set<string>>(() => new Set());
  const [revealToken, setRevealToken] = useState(0);
  const searchIsActive = searchTerm.trim().length > 0;

  useEffect(() => {
    if (!open) return;

    if (!selectedTask) {
      setRevealToken((current) => current + 1);
      return;
    }

    const projectId = selectedTask.projectId;
    const groupKey = getTaskGroupKey(selectedTask);

    setExpandedProjectIds((current) => {
      if (current.has(projectId)) return current;
      const next = new Set(current);
      next.add(projectId);
      return next;
    });
    setExpandedTaskGroupKeys((current) => {
      if (current.has(groupKey)) return current;
      const next = new Set(current);
      next.add(groupKey);
      return next;
    });
    setRevealToken((current) => current + 1);
  }, [open, selectedTask]);

  function selectTask(taskId: string) {
    onValueChange(taskId);
    setOpen(false);
  }

  function toggleProject(projectId: string) {
    setExpandedProjectIds((current) => {
      const next = new Set(current);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  }

  function toggleTaskGroup(groupKey: string) {
    setExpandedTaskGroupKeys((current) => {
      const next = new Set(current);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }

  return {
    value,
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
    selectedTask,
    triggerProject,
    triggerTaskTitle,
    selectedLabel,
    groupedProjects,
    searchIsActive,
    isProjectExpanded: (projectId) => searchIsActive || expandedProjectIds.has(projectId),
    isTaskGroupExpanded: (groupKey) => searchIsActive || expandedTaskGroupKeys.has(groupKey),
    revealToken,
    onOpenChange: setOpen,
    onSearchChange: setSearchTerm,
    onSelectTask: selectTask,
    onToggleProject: toggleProject,
    onToggleTaskGroup: toggleTaskGroup,
    statusLabel,
    statusDotClass,
    formatDueDate,
    formatAssigneeLabel: formatTaskAssigneeLabel,
  };
}
