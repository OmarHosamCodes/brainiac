export const DESCRIPTION_SUGGESTION_LIMIT = 10;

export type DescriptionSuggestionEntry = {
  description: string;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string;
  projectName: string;
  clientName: string;
};

export type DescriptionDatalistOption = {
  description: string;
  taskId: string | null;
  taskTitle: string | null;
  projectId: string;
  projectName: string;
  clientName: string;
};

export function normalizeSuggestionText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Draft fields to apply when the user explicitly picks a suggestion (not on typing). */
export function draftFromDescriptionSuggestion(option: DescriptionDatalistOption): {
  description: string;
  taskId: string;
  projectId: string;
} {
  return {
    description: option.description,
    taskId: option.taskId ?? "",
    projectId: option.projectId,
  };
}

/** Recent unique descriptions for datalist + styled suggestion panel. */
export function buildDescriptionDatalistOptions(
  entries: DescriptionSuggestionEntry[],
  options?: { limit?: number },
): DescriptionDatalistOption[] {
  const limit = options?.limit ?? DESCRIPTION_SUGGESTION_LIMIT;
  const seen = new Set<string>();
  const optionsList: DescriptionDatalistOption[] = [];

  for (const entry of entries) {
    const description = entry.description.trim() || entry.taskTitle?.trim() || "";
    if (!description) continue;

    const key = normalizeSuggestionText(description);
    if (seen.has(key)) continue;

    seen.add(key);
    optionsList.push({
      description,
      taskId: entry.taskId,
      taskTitle: entry.taskTitle,
      projectId: entry.projectId,
      projectName: entry.projectName,
      clientName: entry.clientName,
    });
    if (optionsList.length >= limit) break;
  }

  return optionsList;
}
