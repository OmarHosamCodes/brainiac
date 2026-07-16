import {
  groupItemsByClient,
  projectSearchableText,
  sortProjectsByClientThenName,
} from "@/features/shared/choosers/agency-chooser-shell";

export type ChooserProject = {
  id: string;
  name: string;
  clientName: string;
  clientId?: string;
  colorHueId?: number | null;
};

export type ChooserTask = {
  id: string;
  projectId: string;
  title: string;
  status: string;
};

export type ChooserProjectGroup = {
  project: ChooserProject;
  tasks: ChooserTask[];
  isFavorite: boolean;
};

export type ChooserClientGroup = {
  clientName: string;
  projects: ChooserProjectGroup[];
};

export type ChooserSections = {
  favorites: ChooserProjectGroup[];
  clientGroups: ChooserClientGroup[];
};

function sortTasksByTitle(left: ChooserTask, right: ChooserTask) {
  return left.title.localeCompare(right.title);
}

function taskSearchableText(
  task: ChooserTask,
  project: ChooserProject | undefined,
): string {
  return [task.title, task.status, project?.name ?? "", project?.clientName ?? ""]
    .join(" ")
    .toLowerCase();
}

export function buildAgencyTaskChooserSections(input: {
  projects: ChooserProject[];
  tasks: ChooserTask[];
  favoriteProjectIds: string[];
  favoriteTaskIds: string[];
  searchTerm: string;
}): ChooserSections {
  const filterQuery = input.searchTerm.trim().toLowerCase();
  const projectsById = new Map(input.projects.map((project) => [project.id, project]));
  const favoriteProjectIdSet = new Set(input.favoriteProjectIds);

  const tasksByProjectId = new Map<string, ChooserTask[]>();
  for (const task of input.tasks) {
    const existing = tasksByProjectId.get(task.projectId) ?? [];
    existing.push(task);
    tasksByProjectId.set(task.projectId, existing);
  }
  for (const [projectId, projectTasks] of tasksByProjectId) {
    tasksByProjectId.set(projectId, [...projectTasks].sort(sortTasksByTitle));
  }

  function filterTasksForProject(project: ChooserProject, projectTasks: ChooserTask[]) {
    if (!filterQuery) return projectTasks;
    const projectMatched = projectSearchableText(project).includes(filterQuery);
    if (projectMatched) return projectTasks;
    return projectTasks.filter((task) =>
      taskSearchableText(task, project).includes(filterQuery),
    );
  }

  function projectMatchesSearch(project: ChooserProject, projectTasks: ChooserTask[]) {
    if (!filterQuery) return true;
    if (projectSearchableText(project).includes(filterQuery)) return true;
    return projectTasks.some((task) => taskSearchableText(task, project).includes(filterQuery));
  }

  const favoriteProjects: ChooserProjectGroup[] = [];
  const seenFavoriteProjectIds = new Set<string>();

  for (const projectId of input.favoriteProjectIds) {
    const project = projectsById.get(projectId);
    if (!project || seenFavoriteProjectIds.has(project.id)) continue;
    const allTasks = tasksByProjectId.get(project.id) ?? [];
    if (!projectMatchesSearch(project, allTasks)) continue;
    seenFavoriteProjectIds.add(project.id);
    favoriteProjects.push({
      project,
      tasks: filterTasksForProject(project, allTasks),
      isFavorite: true,
    });
  }

  // Favorited tasks pull their project into favorites when the project itself isn't favorited.
  for (const taskId of input.favoriteTaskIds) {
    const task = input.tasks.find((entry) => entry.id === taskId);
    if (!task) continue;
    const project = projectsById.get(task.projectId);
    if (!project || seenFavoriteProjectIds.has(project.id)) continue;
    const allTasks = tasksByProjectId.get(project.id) ?? [];
    if (!projectMatchesSearch(project, allTasks)) continue;
    seenFavoriteProjectIds.add(project.id);
    favoriteProjects.push({
      project,
      tasks: filterTasksForProject(project, allTasks),
      isFavorite: favoriteProjectIdSet.has(project.id),
    });
  }

  const remainingProjects = input.projects
    .filter((project) => !seenFavoriteProjectIds.has(project.id))
    .filter((project) => {
      const allTasks = tasksByProjectId.get(project.id) ?? [];
      return projectMatchesSearch(project, allTasks);
    })
    .sort(sortProjectsByClientThenName);

  const clientGroups = groupItemsByClient(remainingProjects).map((group) => ({
    clientName: group.clientName || "No client",
    projects: group.projects.map((project) => {
      const allTasks = tasksByProjectId.get(project.id) ?? [];
      return {
        project,
        tasks: filterTasksForProject(project, allTasks),
        isFavorite: favoriteProjectIdSet.has(project.id),
      };
    }),
  }));

  return {
    favorites: favoriteProjects,
    clientGroups,
  };
}

export function isTaskFavorited(taskId: string, favoriteTaskIds: ReadonlySet<string> | string[]) {
  if (Array.isArray(favoriteTaskIds)) return favoriteTaskIds.includes(taskId);
  return favoriteTaskIds.has(taskId);
}
