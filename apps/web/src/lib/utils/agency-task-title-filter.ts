import { normalizeTaskTitle } from "@brainiac/api/schemas/agency-ops";

import type { AgencyProjectTask } from "@/lib/schemas/agency-work";

export { normalizeTaskTitle };

function scoreTaskTitleMatch(normalizedTitle: string, normalizedQuery: string) {
  if (!normalizedQuery) return 0;
  if (normalizedTitle === normalizedQuery) return 100;
  if (normalizedTitle.startsWith(normalizedQuery)) return 90;
  if (normalizedTitle.split(" ").some((word) => word.startsWith(normalizedQuery))) return 75;
  if (normalizedTitle.includes(normalizedQuery)) return 55;
  return 0;
}

export function filterTasksByTitleSearch(
  tasks: AgencyProjectTask[],
  searchTerm: string,
): AgencyProjectTask[] {
  const normalizedQuery = normalizeTaskTitle(searchTerm);

  if (!normalizedQuery) {
    return [...tasks].sort((left, right) => left.title.localeCompare(right.title));
  }

  return tasks
    .map((task) => {
      const normalizedTitle = normalizeTaskTitle(task.title);
      return {
        task,
        normalizedTitle,
        score: scoreTaskTitleMatch(normalizedTitle, normalizedQuery),
        createdAtMs: new Date(task.createdAt).getTime(),
      };
    })
    .filter(({ normalizedTitle, score }) => Boolean(normalizedTitle) && score > 0)
    .sort((left, right) => {
      const rightCreatedAt = Number.isNaN(right.createdAtMs) ? 0 : right.createdAtMs;
      const leftCreatedAt = Number.isNaN(left.createdAtMs) ? 0 : left.createdAtMs;
      return (
        right.score - left.score ||
        rightCreatedAt - leftCreatedAt ||
        left.task.title.localeCompare(right.task.title)
      );
    })
    .map(({ task }) => task);
}

export function taskTitleExactlyMatches(tasks: AgencyProjectTask[], searchTerm: string): boolean {
  const normalizedQuery = normalizeTaskTitle(searchTerm);
  if (!normalizedQuery) return false;
  return tasks.some((task) => normalizeTaskTitle(task.title) === normalizedQuery);
}

function isOpenOrInProgressTask(task: AgencyProjectTask): boolean {
  return task.status === "open" || task.status === "in_progress";
}

/** Existing open/in-progress task with the same normalized title (create will reuse it). */
export function findOpenTaskByExactTitle(
  tasks: AgencyProjectTask[],
  searchTerm: string,
): AgencyProjectTask | null {
  const normalizedQuery = normalizeTaskTitle(searchTerm);
  if (!normalizedQuery) return null;
  return (
    tasks.find(
      (task) => isOpenOrInProgressTask(task) && normalizeTaskTitle(task.title) === normalizedQuery,
    ) ?? null
  );
}
