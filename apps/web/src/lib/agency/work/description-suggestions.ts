export const DESCRIPTION_SUGGESTION_LIMIT = 10;

export type AgencyDescriptionSuggestion = {
  description: string;
  taskId: string;
  taskTitle: string;
  projectId: string;
  projectName: string;
  clientName: string;
};

export type DescriptionSuggestionEntry = {
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

/** Rank + dedupe recent time-entry descriptions for typeahead menus. */
export function buildDescriptionSuggestions(
  entries: DescriptionSuggestionEntry[],
  query: string,
  options?: { projectId?: string; limit?: number },
): AgencyDescriptionSuggestion[] {
  const normalizedQuery = normalizeSuggestionText(query);
  const projectId = options?.projectId?.trim() || "";
  const limit = options?.limit ?? DESCRIPTION_SUGGESTION_LIMIT;
  const seen = new Set<string>();

  return entries
    .filter((entry) => !projectId || entry.projectId === projectId)
    .map((entry) => {
      const description = entry.description.trim() || entry.taskTitle?.trim() || "";
      const taskId = entry.taskId ?? "";
      const taskTitle = entry.taskTitle ?? "";
      const searchable = normalizeSuggestionText(`${description} ${taskTitle}`);
      const startsWithQuery = normalizedQuery ? searchable.startsWith(normalizedQuery) : false;
      const includesQuery = normalizedQuery ? searchable.includes(normalizedQuery) : false;
      return {
        description,
        taskId,
        taskTitle,
        projectId: entry.projectId,
        projectName: entry.projectName,
        clientName: entry.clientName,
        score: startsWithQuery ? 3 : includesQuery ? 2 : normalizedQuery ? 0 : 1,
      };
    })
    .filter((entry) => {
      if (!entry.description || entry.score <= 0) return false;
      // Collapse by visible identity (description + project); keep first = most recent.
      const key = `${normalizeSuggestionText(entry.description)}||${entry.projectId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((left, right) => right.score - left.score)
    .slice(0, limit)
    .map(({ score: _score, ...suggestion }) => suggestion);
}
