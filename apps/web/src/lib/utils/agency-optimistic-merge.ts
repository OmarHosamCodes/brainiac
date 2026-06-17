export type AgencyListOverlay<T extends { id: string }> = {
  upserts: Record<string, T>;
  deletedIds: Record<string, true>;
  idMap: Record<string, string>;
};

export const EMPTY_LIST_OVERLAY: AgencyListOverlay<never> = {
  upserts: {},
  deletedIds: {},
  idMap: {},
};

export function createEmptyListOverlay<T extends { id: string }>(): AgencyListOverlay<T> {
  return { upserts: {}, deletedIds: {}, idMap: {} };
}

export function mergeListWithOverlay<T extends { id: string }>(
  serverItems: T[],
  overlay: AgencyListOverlay<T>,
  matches?: (item: T) => boolean,
): T[] {
  const deleted = new Set(Object.keys(overlay.deletedIds));
  const confirmedRealIds = new Set(Object.values(overlay.idMap));
  let items = serverItems.filter((item) => !deleted.has(item.id));

  for (const entity of Object.values(overlay.upserts)) {
    const realId = overlay.idMap[entity.id];
    if (realId && items.some((item) => item.id === realId)) {
      continue;
    }
    if (confirmedRealIds.has(entity.id)) {
      continue;
    }

    const index = items.findIndex((item) => item.id === entity.id);
    const included = matches ? matches(entity) : true;

    if (!included) {
      if (index !== -1) {
        items = items.filter((item) => item.id !== entity.id);
      }
      continue;
    }

    if (index === -1) {
      items = [entity, ...items];
      continue;
    }

    items = items.map((item) => (item.id === entity.id ? entity : item));
  }

  for (const optimisticId of Object.keys(overlay.idMap)) {
    const realId = overlay.idMap[optimisticId];
    if (!realId) continue;
    if (items.some((item) => item.id === realId)) {
      items = items.filter((item) => item.id !== optimisticId);
    }
  }

  return items;
}

export function pruneListOverlay<T extends { id: string }>(
  overlay: AgencyListOverlay<T>,
  serverItems: T[],
): AgencyListOverlay<T> {
  const serverIds = new Set(serverItems.map((item) => item.id));
  const nextUpserts = { ...overlay.upserts };
  const nextDeletedIds = { ...overlay.deletedIds };
  const nextIdMap = { ...overlay.idMap };

  for (const [id, entity] of Object.entries(nextUpserts)) {
    const realId = nextIdMap[id] ?? id;
    if (serverIds.has(realId)) {
      delete nextUpserts[id];
    } else if (serverIds.has(entity.id)) {
      delete nextUpserts[id];
    }
  }

  for (const id of Object.keys(nextDeletedIds)) {
    if (!serverIds.has(id)) {
      delete nextDeletedIds[id];
    }
  }

  for (const [optimisticId, realId] of Object.entries(nextIdMap)) {
    if (serverIds.has(realId)) {
      delete nextIdMap[optimisticId];
      delete nextUpserts[optimisticId];
    }
  }

  if (
    Object.keys(nextUpserts).length === Object.keys(overlay.upserts).length &&
    Object.keys(nextDeletedIds).length === Object.keys(overlay.deletedIds).length &&
    Object.keys(nextIdMap).length === Object.keys(overlay.idMap).length
  ) {
    return overlay;
  }

  return {
    upserts: nextUpserts,
    deletedIds: nextDeletedIds,
    idMap: nextIdMap,
  };
}

export function adjustPaginatedTotal(
  serverTotal: number,
  overlay: AgencyListOverlay<{ id: string }>,
  serverItems: Array<{ id: string }>,
): number {
  const serverIds = new Set(serverItems.map((item) => item.id));
  let delta = 0;

  for (const id of Object.keys(overlay.deletedIds)) {
    if (serverIds.has(id)) {
      delta -= 1;
    }
  }

  for (const [id, entity] of Object.entries(overlay.upserts)) {
    const realId = overlay.idMap[id] ?? entity.id;
    if (!serverIds.has(realId) && !serverIds.has(id)) {
      delta += 1;
    }
  }

  return Math.max(0, serverTotal + delta);
}
