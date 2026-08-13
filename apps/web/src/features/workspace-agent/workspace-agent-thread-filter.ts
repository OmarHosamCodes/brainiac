export type WorkspaceAgentThreadFilterItem = {
  id: string;
  label: string;
  preview: string;
  stamp: string;
};

export function filterWorkspaceAgentThreads<T extends WorkspaceAgentThreadFilterItem>(
  threads: readonly T[],
  query: string,
): T[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [...threads];
  return threads.filter((thread) =>
    `${thread.label} ${thread.preview}`.toLowerCase().includes(needle),
  );
}
