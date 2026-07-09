import type { AgencyProjectTaskStatus } from "@/features/shared/agency-queries";
import type { AgencyProjectTask } from "@/features/task-management/agency-work";
import type { TaskStatus } from "@/features/task-management/agency-work";

import { filterTasksByTitleSearch } from "./agency-task-title-filter";

export const TASK_SUGGESTION_ACTIVE_STATUSES: TaskStatus[] = ["open", "in_progress"];

export type TaskSuggestionQueryFilters = {
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
): AgencyProjectTask[] {
  return filterTasksByTitleSearch(tasks, titleDraft);
}
