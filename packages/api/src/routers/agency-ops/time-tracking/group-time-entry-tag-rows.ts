export function groupTimeEntryTagRows<T>(
  rows: ReadonlyArray<{ timeEntryId: string; tag: T }>,
): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const { timeEntryId, tag } of rows) {
    const list = grouped.get(timeEntryId);
    if (list) {
      list.push(tag);
    } else {
      grouped.set(timeEntryId, [tag]);
    }
  }
  return grouped;
}
