import { agencyOpsClient, agencyOpsProject, agencyOpsProjectTask } from "@orch/db/schema";
import { and, ilike, or, type SQL } from "drizzle-orm";

/** Same whitespace tokenize as the web chooser; capped for SQL safety. */
export function tokenizeTaskListSearch(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/u).filter(Boolean).slice(0, 8);
}

/**
 * Every token must match task title OR project name OR client name
 * (AND across tokens, OR within each token). Requires project/client joins.
 */
export function buildTaskListSearchPredicate(tokens: string[]): SQL | undefined {
  if (tokens.length === 0) return undefined;

  return and(
    ...tokens.map((token) => {
      const pattern = `%${token}%`;
      return or(
        ilike(agencyOpsProjectTask.title, pattern),
        ilike(agencyOpsProject.name, pattern),
        ilike(agencyOpsClient.name, pattern),
      )!;
    }),
  )!;
}
