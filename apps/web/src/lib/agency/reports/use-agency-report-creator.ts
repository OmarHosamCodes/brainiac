import type { AgencyTimeEntry } from "@brainiac/api/schemas/agency-ops";
import { useCallback, useMemo, useState } from "react";

import type { AgencyReportEntry } from "@/lib/utils/agency-report-grouping";

export type ReportCommandBarAnchor = {
  x: number;
  y: number;
};

export function useAgencyReportCreator(entries: AgencyReportEntry[]) {
  const [excludedEntryIds, setExcludedEntryIds] = useState<Set<string>>(() => new Set());
  const [excludeUndoStack, setExcludeUndoStack] = useState<string[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null);
  const [commandBarAnchor, setCommandBarAnchor] = useState<ReportCommandBarAnchor | null>(null);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryOverrides, setEntryOverrides] = useState<Map<string, Partial<AgencyTimeEntry>>>(
    () => new Map(),
  );

  const visibleEntries = useMemo(() => {
    return entries
      .filter((entry) => !excludedEntryIds.has(entry.id))
      .map((entry) => {
        const override = entryOverrides.get(entry.id);
        return override ? ({ ...entry, ...override } as AgencyReportEntry) : entry;
      });
  }, [entries, excludedEntryIds, entryOverrides]);

  const selectedEntry = useMemo(
    () => visibleEntries.find((entry) => entry.id === selectedEntryId) ?? null,
    [visibleEntries, selectedEntryId],
  );

  const toggleSelectEntry = useCallback((entryId: string, anchor: ReportCommandBarAnchor) => {
    setSelectedEntryId((current) => {
      if (current === entryId) {
        setCommandBarAnchor(null);
        return null;
      }
      setCommandBarAnchor(anchor);
      return entryId;
    });
    setEditingEntryId(null);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedEntryId(null);
    setCommandBarAnchor(null);
    setEditingEntryId(null);
  }, []);

  const excludeSelectedEntry = useCallback(() => {
    if (!selectedEntryId) return;
    const entryId = selectedEntryId;
    setExcludedEntryIds((current) => new Set([...current, entryId]));
    setExcludeUndoStack((current) => [...current, entryId]);
    setSelectedEntryId(null);
    setCommandBarAnchor(null);
    setEditingEntryId(null);
  }, [selectedEntryId]);

  const undoLastExclude = useCallback(() => {
    setExcludeUndoStack((stack) => {
      const entryId = stack[stack.length - 1];
      if (!entryId) return stack;
      setExcludedEntryIds((current) => {
        const next = new Set(current);
        next.delete(entryId);
        return next;
      });
      return stack.slice(0, -1);
    });
  }, []);

  const startEditingSelected = useCallback(() => {
    if (!selectedEntryId) return;
    setEditingEntryId(selectedEntryId);
  }, [selectedEntryId]);

  const cancelEditing = useCallback(() => {
    setEditingEntryId(null);
  }, []);

  const applyEntryOverride = useCallback((entryId: string, patch: Partial<AgencyTimeEntry>) => {
    setEntryOverrides((current) => {
      const next = new Map(current);
      next.set(entryId, { ...current.get(entryId), ...patch });
      return next;
    });
    setEditingEntryId(null);
  }, []);

  const setTaskWaste = useCallback((entryId: string, _taskId: string, isWaste: boolean) => {
    setEntryOverrides((current) => {
      const next = new Map(current);
      const base = current.get(entryId);
      next.set(entryId, { ...base, taskIsWaste: isWaste });
      return next;
    });
  }, []);

  return {
    excludedEntryIds,
    excludeUndoStack,
    canUndo: excludeUndoStack.length > 0,
    selectedEntryId,
    commandBarAnchor,
    editingEntryId,
    entryOverrides,
    visibleEntries,
    selectedEntry,
    toggleSelectEntry,
    clearSelection,
    excludeSelectedEntry,
    undoLastExclude,
    startEditingSelected,
    cancelEditing,
    applyEntryOverride,
    setTaskWaste,
  };
}

export type AgencyReportCreatorState = ReturnType<typeof useAgencyReportCreator>;
