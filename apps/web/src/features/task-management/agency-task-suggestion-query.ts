import type { AgencyProjectTaskStatus } from "@/features/shared/agency-queries";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import type { TaskStatus } from "@/features/task-management/agency-work";

import { filterTasksByTitleSearch } from "./agency-task-title-filter";

export const TASK_SUGGESTION_LIMIT = 8;

export const TASK_SUGGESTION_ACTIVE_STATUSES: TaskStatus[] = ["open", "in_progress"];

type TaskSuggestionQueryFilters = {
  projectId?: string;
  statuses: AgencyProjectTaskStatus[];
  pageSize: number;
};

export type BuildTaskSuggestionQueryFiltersResult =
  | { enabled: false }
  | { enabled: true; filters: TaskSuggestionQueryFilters };

type BuildTaskSuggestionQueryFiltersInput = {
  suggestionsActive: boolean;
  selectedProjectId: string;
};

export function buildTaskSuggestionQueryFilters({
  suggestionsActive,
  selectedProjectId,
}: BuildTaskSuggestionQueryFiltersInput): BuildTaskSuggestionQueryFiltersResult {
  if (!suggestionsActive) {
    return { enabled: false };
  }

  return {
    enabled: true,
    filters: {
      ...(selectedProjectId ? { projectId: selectedProjectId } : {}),
      statuses: TASK_SUGGESTION_ACTIVE_STATUSES,
      pageSize: 50,
    },
  };
}

/** Rank and filter API tasks for quick-add suggestions (exact short titles like "AI"). */
export function selectTaskSuggestions(
  tasks: AgencyProjectTask[],
  titleDraft: string,
  options?: { affinityProjectId?: string },
): AgencyProjectTask[] {
  const ranked = filterTasksByTitleSearch(tasks, titleDraft);
  const affinity = options?.affinityProjectId;
  if (!affinity) return ranked.slice(0, TASK_SUGGESTION_LIMIT);

  const preferred = ranked.filter((t) => t.projectId === affinity);
  const rest = ranked.filter((t) => t.projectId !== affinity);
  return [...preferred, ...rest].slice(0, TASK_SUGGESTION_LIMIT);
}
