import { resolveEntryWaste } from "@orch/api/routers/agency-ops/shared/waste-helpers";

type WasteAwareEntry = {
  id: string;
  isWaste?: boolean | null;
  taskIsWaste?: boolean | null;
  taskTitle?: string | null;
  projectName?: string | null;
};

/** Collapse-row waste summary: resolved classification vs dismissible entry flags. */
export function summarizeEntryGroupWaste(entries: readonly WasteAwareEntry[]) {
  const entryFlagIds: string[] = [];
  let resolvedCount = 0;

  for (const entry of entries) {
    if (resolveEntryWaste(entry)) resolvedCount += 1;
    if (entry.isWaste === true) entryFlagIds.push(entry.id);
  }

  const total = entries.length;
  const isAllWaste = total > 0 && resolvedCount === total;
  const isPartialWaste = resolvedCount > 0 && resolvedCount < total;

  return {
    total,
    resolvedCount,
    entryFlagIds,
    entryFlagCount: entryFlagIds.length,
    isAllWaste,
    isPartialWaste,
    /** Entry-flag waste can be cleared; task/name waste cannot via entry update. */
    canDismissEntryWaste: entryFlagIds.length > 0,
  };
}

/**
 * Decide mark vs unmark for a toggle target set.
 * Unmark only patches entries that already have the entry waste flag.
 */
export function resolveWasteTogglePatch(entries: readonly WasteAwareEntry[]): {
  entryIds: string[];
  nextIsWaste: boolean;
} | null {
  if (entries.length === 0) return null;
  const allEntryFlagged = entries.every((entry) => entry.isWaste === true);
  if (allEntryFlagged) {
    return {
      entryIds: entries.map((entry) => entry.id),
      nextIsWaste: false,
    };
  }
  const flaggedIds = entries.filter((entry) => entry.isWaste === true).map((entry) => entry.id);
  if (flaggedIds.length > 0) {
    return { entryIds: flaggedIds, nextIsWaste: false };
  }
  return {
    entryIds: entries.map((entry) => entry.id),
    nextIsWaste: true,
  };
}
