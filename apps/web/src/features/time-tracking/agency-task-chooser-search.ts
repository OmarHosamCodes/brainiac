export function tokenizeChooserQuery(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/u).filter(Boolean);
}

function fieldHits(value: string, token: string): boolean {
  return value.toLowerCase().includes(token);
}

export function chooserPathMatches(
  path: { clientName: string; projectName: string; taskTitle?: string },
  tokens: string[],
): boolean {
  if (tokens.length === 0) return true;
  const haystacks = [path.clientName, path.projectName, path.taskTitle ?? ""];
  return tokens.every((token) => haystacks.some((field) => fieldHits(field, token)));
}

export function chooserSearchExpand(pathHits: {
  client: boolean;
  project: boolean;
  task: boolean;
}): { expandClient: boolean; expandProject: boolean } {
  const anyHit = pathHits.client || pathHits.project || pathHits.task;
  return {
    expandClient: anyHit,
    expandProject: pathHits.task,
  };
}

export function chooserFieldHits(value: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const lower = value.toLowerCase();
  return tokens.some((token) => lower.includes(token));
}
