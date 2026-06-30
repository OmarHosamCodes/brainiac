import type { AgencyProjectTask } from "@/lib/schemas/agency-work";

export function normalizeTaskTitle(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

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

  const seenTitles = new Set<string>();

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
    .filter(({ normalizedTitle, score }) => {
      if (!normalizedTitle || score <= 0 || seenTitles.has(normalizedTitle)) return false;
      seenTitles.add(normalizedTitle);
      return true;
    })
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
