import { useCallback, useEffect, useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const FAVORITE_MODELS_KEY = "brainiac:agent-favorite-models";

type ModelOption = {
  id: string;
  name: string;
  creatorLabel?: string | null;
};

function loadFavoriteModelIds(): string[] {
  try {
    const raw = localStorage.getItem(FAVORITE_MODELS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function useDashboardAgentModelPreferences<T extends ModelOption>(modelOptions: T[]) {
  const [modelSearch, setModelSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>(() => loadFavoriteModelIds());

  useEffect(() => {
    localStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify(favoriteModelIds));
  }, [favoriteModelIds]);

  const favoriteModelIdSet = useMemo(() => new Set(favoriteModelIds), [favoriteModelIds]);
  const filteredModelOptions = useMemo(() => {
    const normalizedSearch = modelSearch.trim().toLowerCase();

    return modelOptions.filter((model) => {
      if (favoritesOnly && !favoriteModelIdSet.has(model.id)) return false;
      if (!normalizedSearch) return true;
      return cn(model.name, model.id, model.creatorLabel ?? "")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [favoriteModelIdSet, favoritesOnly, modelOptions, modelSearch]);

  const favoriteModelOptions = useMemo(
    () => modelOptions.filter((model) => favoriteModelIdSet.has(model.id)),
    [favoriteModelIdSet, modelOptions],
  );

  const isFavoriteModel = useCallback(
    (modelId: string) => favoriteModelIdSet.has(modelId),
    [favoriteModelIdSet],
  );
  const toggleFavoriteModel = useCallback((modelId: string) => {
    setFavoriteModelIds((current) =>
      current.includes(modelId) ? current.filter((id) => id !== modelId) : [...current, modelId],
    );
  }, []);
  const moveFavoriteModel = useCallback((modelId: string, direction: "up" | "down") => {
    setFavoriteModelIds((current) => {
      const index = current.indexOf(modelId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      if (!item) return current;
      next.splice(targetIndex, 0, item);
      return next;
    });
  }, []);

  return {
    modelSearch,
    setModelSearch,
    favoritesOnly,
    setFavoritesOnly,
    filteredModelOptions,
    favoriteModelOptions,
    isFavoriteModel,
    toggleFavoriteModel,
    moveFavoriteModel,
  };
}
