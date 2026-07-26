import { useCallback, useEffect, useMemo, useState } from "react";

const FAVORITE_MODELS_KEY = "orch:agent-favorite-models";

type ModelOption = {
  id: string;
  name: string;
  creatorLabel?: string | null;
  isFree?: boolean;
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

export function useWorkspaceAgentModelPreferences<T extends ModelOption>(
  modelOptions: T[],
  options?: { freeOnly?: boolean },
) {
  const [modelSearch, setModelSearch] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteModelIds, setFavoriteModelIds] = useState<string[]>(() => loadFavoriteModelIds());
  const freeOnly = options?.freeOnly ?? false;

  useEffect(() => {
    localStorage.setItem(FAVORITE_MODELS_KEY, JSON.stringify(favoriteModelIds));
  }, [favoriteModelIds]);

  const favoriteModelIdSet = useMemo(() => new Set(favoriteModelIds), [favoriteModelIds]);
  const filteredModelOptions = useMemo(() => {
    const normalizedSearch = modelSearch.trim().toLowerCase();

    return modelOptions.filter((model) => {
      if (freeOnly && !model.isFree) return false;
      if (favoritesOnly && !favoriteModelIdSet.has(model.id)) return false;
      if (!normalizedSearch) return true;
      return [model.name, model.id, model.creatorLabel ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedSearch);
    });
  }, [favoriteModelIdSet, favoritesOnly, freeOnly, modelOptions, modelSearch]);

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

  return {
    modelSearch,
    setModelSearch,
    favoritesOnly,
    setFavoritesOnly,
    filteredModelOptions,
    favoriteModelOptions,
    isFavoriteModel,
    toggleFavoriteModel,
  };
}
